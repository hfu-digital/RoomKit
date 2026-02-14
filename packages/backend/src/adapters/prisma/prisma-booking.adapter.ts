import type { RoomKitPrismaClient } from "../../types/prisma-delegates";
import type {
    Booking,
    BookingStateTransition,
    Pagination,
    PaginatedResult,
} from "../../types/entities";
import type { BookingStatus } from "../../types/enums";
import { BookingStorage } from "../../interfaces/booking.storage";
import { BookingStateMachine } from "../../domain/state-machine";
import {
    BookingConflictError,
    PartitionConflictError,
    StaleVersionError,
    BookingNotFoundError,
} from "../../errors/roomkit.error";

export class PrismaBookingAdapter extends BookingStorage {
    constructor(
        private readonly prisma: RoomKitPrismaClient,
        private readonly stateMachine: BookingStateMachine,
    ) {
        super();
    }

    async createWithConflictCheck(
        booking: Omit<Booking, "id" | "version" | "createdAt" | "updatedAt">,
        conflictScope: {
            checkPartitions: boolean;
            checkBuffers: boolean;
        },
    ): Promise<Booking> {
        return this.prisma.$transaction(
            async (tx) => {
                let effectiveStartsAt = booking.startsAt;
                let effectiveEndsAt = booking.endsAt;

                // If checkBuffers, extend the time range by the room's buffer minutes
                if (conflictScope.checkBuffers) {
                    const room = await tx.room.findUnique({
                        where: { id: booking.roomId },
                    });
                    if (room) {
                        effectiveStartsAt = new Date(
                            booking.startsAt.getTime() -
                                room.setupBufferMinutes * 60_000,
                        );
                        effectiveEndsAt = new Date(
                            booking.endsAt.getTime() +
                                room.teardownBufferMinutes * 60_000,
                        );
                    }
                }

                // Check for overlapping bookings on the same room
                // Overlap condition: NOT (existingEnd <= newStart OR existingStart >= newEnd)
                // Exclude cancelled and completed bookings
                const directOverlaps = await tx.booking.findMany({
                    where: {
                        roomId: booking.roomId,
                        NOT: {
                            OR: [
                                { status: "cancelled" },
                                { status: "completed" },
                            ],
                        },
                        AND: [
                            {
                                startsAt: { lt: effectiveEndsAt },
                            },
                            {
                                endsAt: { gt: effectiveStartsAt },
                            },
                        ],
                    },
                });

                if (directOverlaps.length > 0) {
                    throw new BookingConflictError({
                        roomId: booking.roomId,
                        startsAt: booking.startsAt.toISOString(),
                        endsAt: booking.endsAt.toISOString(),
                        conflictingBookingId: directOverlaps[0].id,
                    });
                }

                // Check partition conflicts if requested
                if (conflictScope.checkPartitions) {
                    // Find all related rooms via partitions (parent and child)
                    const partitionsAsParent =
                        await tx.roomPartition.findMany({
                            where: { parentRoomId: booking.roomId },
                        });
                    const partitionsAsChild =
                        await tx.roomPartition.findMany({
                            where: { childRoomId: booking.roomId },
                        });

                    const relatedRoomIds = new Set<string>();
                    for (const p of partitionsAsParent) {
                        relatedRoomIds.add(p.childRoomId);
                    }
                    for (const p of partitionsAsChild) {
                        relatedRoomIds.add(p.parentRoomId);
                    }

                    // Check each related room for overlapping bookings
                    for (const relatedRoomId of relatedRoomIds) {
                        const partitionOverlaps = await tx.booking.findMany({
                            where: {
                                roomId: relatedRoomId,
                                NOT: {
                                    OR: [
                                        { status: "cancelled" },
                                        { status: "completed" },
                                    ],
                                },
                                AND: [
                                    {
                                        startsAt: { lt: effectiveEndsAt },
                                    },
                                    {
                                        endsAt: { gt: effectiveStartsAt },
                                    },
                                ],
                            },
                        });

                        if (partitionOverlaps.length > 0) {
                            throw new PartitionConflictError({
                                roomId: booking.roomId,
                                partitionRoomId: relatedRoomId,
                                conflictingBookingId:
                                    partitionOverlaps[0].id,
                            });
                        }
                    }
                }

                // No conflicts found, create the booking with version=1
                return tx.booking.create({
                    data: {
                        ...booking,
                        version: 1,
                    },
                });
            },
            { isolationLevel: "Serializable" },
        );
    }

    async findOverlapping(
        roomId: string,
        startsAt: Date,
        endsAt: Date,
        excludeBookingId?: string,
    ): Promise<Booking[]> {
        const where: Record<string, unknown> = {
            roomId,
            AND: [
                { startsAt: { lt: endsAt } },
                { endsAt: { gt: startsAt } },
            ],
            NOT: {
                OR: [
                    { status: "cancelled" },
                    { status: "completed" },
                ],
            },
        };

        const results = await this.prisma.booking.findMany({ where });

        // Exclude a specific booking if provided
        if (excludeBookingId) {
            return results.filter(
                (b: Booking) => b.id !== excludeBookingId,
            );
        }

        return results;
    }

    async updateWithVersion(
        id: string,
        data: Partial<Booking>,
        expectedVersion: number,
    ): Promise<Booking> {
        // Atomically update only if the version matches
        const current = await this.prisma.booking.findUnique({
            where: { id },
        });

        if (!current) {
            throw new BookingNotFoundError({ bookingId: id });
        }

        if (current.version !== expectedVersion) {
            throw new StaleVersionError({
                bookingId: id,
                expectedVersion,
                actualVersion: current.version,
            });
        }

        return this.prisma.booking.update({
            where: { id },
            data: {
                ...data,
                version: expectedVersion + 1,
            },
        });
    }

    async findByIdempotencyKey(key: string): Promise<Booking | null> {
        return this.prisma.booking.findUnique({
            where: { idempotencyKey: key },
        });
    }

    async transition(
        id: string,
        toStatus: BookingStatus,
        metadata: {
            triggeredBy: string;
            reason?: string;
        },
    ): Promise<{
        booking: Booking;
        transition: BookingStateTransition;
    }> {
        return this.prisma.$transaction(async (tx) => {
            const booking = await tx.booking.findUnique({
                where: { id },
            });

            if (!booking) {
                throw new BookingNotFoundError({ bookingId: id });
            }

            // Validate the state transition via the state machine
            this.stateMachine.validateTransition(
                booking.status as BookingStatus,
                toStatus,
            );

            // Insert the state transition record
            const transition =
                await tx.bookingStateTransition.create({
                    data: {
                        bookingId: id,
                        fromStatus: booking.status,
                        toStatus,
                        triggeredBy: metadata.triggeredBy,
                        reason: metadata.reason ?? null,
                        timestamp: new Date(),
                    },
                });

            // Update the booking status and increment version
            const updatedBooking = await tx.booking.update({
                where: { id },
                data: {
                    status: toStatus,
                    version: booking.version + 1,
                },
            });

            return { booking: updatedBooking, transition };
        });
    }

    async findByPerson(
        personId: string,
        timeRange: { startsAt: Date; endsAt: Date },
        pagination?: Pagination,
    ): Promise<PaginatedResult<Booking>> {
        const limit = pagination?.limit ?? 50;
        const where: Record<string, unknown> = {
            requesterId: personId,
            AND: [
                { startsAt: { lt: timeRange.endsAt } },
                { endsAt: { gt: timeRange.startsAt } },
            ],
        };

        // If cursor is provided, decode it to skip past that record
        let cursor: Record<string, unknown> | undefined;
        if (pagination?.cursor) {
            cursor = { id: pagination.cursor };
        }

        const items = await this.prisma.booking.findMany({
            where,
            orderBy: { createdAt: "asc" },
            take: limit + 1,
            ...(cursor ? { cursor, skip: 1 } : {}),
        });

        let nextCursor: string | undefined;
        if (items.length > limit) {
            const lastItem = items.pop()!;
            nextCursor = lastItem.id;
        }

        return { items, nextCursor };
    }

    async findByRoom(
        roomId: string,
        timeRange: { startsAt: Date; endsAt: Date },
        pagination?: Pagination,
    ): Promise<PaginatedResult<Booking>> {
        const limit = pagination?.limit ?? 50;
        const where: Record<string, unknown> = {
            roomId,
            AND: [
                { startsAt: { lt: timeRange.endsAt } },
                { endsAt: { gt: timeRange.startsAt } },
            ],
        };

        let cursor: Record<string, unknown> | undefined;
        if (pagination?.cursor) {
            cursor = { id: pagination.cursor };
        }

        const items = await this.prisma.booking.findMany({
            where,
            orderBy: { createdAt: "asc" },
            take: limit + 1,
            ...(cursor ? { cursor, skip: 1 } : {}),
        });

        let nextCursor: string | undefined;
        if (items.length > limit) {
            const lastItem = items.pop()!;
            nextCursor = lastItem.id;
        }

        return { items, nextCursor };
    }

    async findById(id: string): Promise<Booking | null> {
        return this.prisma.booking.findUnique({ where: { id } });
    }
}
