import { BookingStorage } from "../../interfaces/booking.storage";
import type {
    Booking,
    BookingStateTransition,
    Pagination,
    PaginatedResult,
} from "../../types/entities";
import type { BookingStatus } from "../../types/enums";
import { BookingStateMachine } from "../../domain/state-machine";
import {
    BookingConflictError,
    StaleVersionError,
} from "../../errors/roomkit.error";

export class MockBookingStorage extends BookingStorage {
    private bookings = new Map<string, Booking>();
    private transitions = new Map<string, BookingStateTransition>();
    private idempotencyIndex = new Map<string, string>();
    private partitions = new Map<string, { parentRoomId: string; childRoomId: string }>();
    private stateMachine = new BookingStateMachine();

    async createWithConflictCheck(
        booking: Omit<Booking, "id" | "version" | "createdAt" | "updatedAt">,
        conflictScope: {
            checkPartitions: boolean;
            checkBuffers: boolean;
        },
    ): Promise<Booking> {
        // Check for direct time overlaps in the same room
        const directConflicts = await this.findOverlapping(
            booking.roomId,
            booking.startsAt,
            booking.endsAt,
        );

        if (directConflicts.length > 0) {
            throw new BookingConflictError({
                roomId: booking.roomId,
                startsAt: booking.startsAt.toISOString(),
                endsAt: booking.endsAt.toISOString(),
                conflictingBookingId: directConflicts[0].id,
            });
        }

        // Check partition conflicts if requested
        if (conflictScope.checkPartitions) {
            const relatedRoomIds = this.getRelatedPartitionRoomIds(booking.roomId);
            for (const relatedRoomId of relatedRoomIds) {
                const partitionConflicts = await this.findOverlapping(
                    relatedRoomId,
                    booking.startsAt,
                    booking.endsAt,
                );
                if (partitionConflicts.length > 0) {
                    throw new BookingConflictError({
                        roomId: relatedRoomId,
                        startsAt: booking.startsAt.toISOString(),
                        endsAt: booking.endsAt.toISOString(),
                        conflictingBookingId: partitionConflicts[0].id,
                    });
                }
            }
        }

        const now = new Date();
        const created: Booking = {
            ...booking,
            id: crypto.randomUUID(),
            version: 1,
            createdAt: now,
            updatedAt: now,
        };

        this.bookings.set(created.id, created);

        if (created.idempotencyKey) {
            this.idempotencyIndex.set(created.idempotencyKey, created.id);
        }

        return created;
    }

    async findOverlapping(
        roomId: string,
        startsAt: Date,
        endsAt: Date,
        excludeBookingId?: string,
    ): Promise<Booking[]> {
        const results: Booking[] = [];
        for (const booking of this.bookings.values()) {
            if (booking.roomId !== roomId) continue;
            if (excludeBookingId && booking.id === excludeBookingId) continue;

            // Skip terminal statuses (completed, cancelled)
            if (this.stateMachine.isTerminal(booking.status)) continue;

            // Overlap: NOT (endsAt <= startsAt OR startsAt >= endsAt)
            const overlaps =
                !(endsAt <= booking.startsAt || startsAt >= booking.endsAt);
            if (overlaps) {
                results.push(booking);
            }
        }
        return results;
    }

    async updateWithVersion(
        id: string,
        data: Partial<Booking>,
        expectedVersion: number,
    ): Promise<Booking> {
        const existing = this.bookings.get(id);
        if (!existing) {
            throw new Error(`Booking not found: ${id}`);
        }

        if (existing.version !== expectedVersion) {
            throw new StaleVersionError({
                bookingId: id,
                expectedVersion,
                actualVersion: existing.version,
            });
        }

        const updated: Booking = {
            ...existing,
            ...data,
            id: existing.id,
            version: existing.version + 1,
            createdAt: existing.createdAt,
            updatedAt: new Date(),
        };
        this.bookings.set(id, updated);
        return updated;
    }

    async findByIdempotencyKey(key: string): Promise<Booking | null> {
        const bookingId = this.idempotencyIndex.get(key);
        if (!bookingId) return null;
        return this.bookings.get(bookingId) ?? null;
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
        const existing = this.bookings.get(id);
        if (!existing) {
            throw new Error(`Booking not found: ${id}`);
        }

        // Validate transition via state machine (throws InvalidStateTransitionError)
        this.stateMachine.validateTransition(existing.status, toStatus);

        const transitionRecord: BookingStateTransition = {
            id: crypto.randomUUID(),
            bookingId: id,
            fromStatus: existing.status,
            toStatus,
            triggeredBy: metadata.triggeredBy,
            reason: metadata.reason ?? null,
            timestamp: new Date(),
        };
        this.transitions.set(transitionRecord.id, transitionRecord);

        const updated: Booking = {
            ...existing,
            status: toStatus,
            version: existing.version + 1,
            updatedAt: new Date(),
        };
        this.bookings.set(id, updated);

        return {
            booking: updated,
            transition: transitionRecord,
        };
    }

    async findByPerson(
        personId: string,
        timeRange: { startsAt: Date; endsAt: Date },
        pagination?: Pagination,
    ): Promise<PaginatedResult<Booking>> {
        const filtered: Booking[] = [];
        for (const booking of this.bookings.values()) {
            if (booking.requesterId !== personId) continue;
            const overlaps =
                !(timeRange.endsAt <= booking.startsAt ||
                  timeRange.startsAt >= booking.endsAt);
            if (overlaps) {
                filtered.push(booking);
            }
        }

        return this.paginate(filtered, pagination);
    }

    async findByRoom(
        roomId: string,
        timeRange: { startsAt: Date; endsAt: Date },
        pagination?: Pagination,
    ): Promise<PaginatedResult<Booking>> {
        const filtered: Booking[] = [];
        for (const booking of this.bookings.values()) {
            if (booking.roomId !== roomId) continue;
            const overlaps =
                !(timeRange.endsAt <= booking.startsAt ||
                  timeRange.startsAt >= booking.endsAt);
            if (overlaps) {
                filtered.push(booking);
            }
        }

        return this.paginate(filtered, pagination);
    }

    async findById(id: string): Promise<Booking | null> {
        return this.bookings.get(id) ?? null;
    }

    /** Test helper: register a partition relationship for conflict checking. */
    seedPartition(parentRoomId: string, childRoomId: string): void {
        const id = crypto.randomUUID();
        this.partitions.set(id, { parentRoomId, childRoomId });
    }

    /** Test helper: seed a booking directly. */
    seedBooking(booking: Booking): void {
        this.bookings.set(booking.id, booking);
        if (booking.idempotencyKey) {
            this.idempotencyIndex.set(booking.idempotencyKey, booking.id);
        }
    }

    /** Test helper: clear all stored data. */
    clear(): void {
        this.bookings.clear();
        this.transitions.clear();
        this.idempotencyIndex.clear();
        this.partitions.clear();
    }

    /** Test helper: get all transitions for a booking. */
    getTransitionsForBooking(bookingId: string): BookingStateTransition[] {
        const result: BookingStateTransition[] = [];
        for (const t of this.transitions.values()) {
            if (t.bookingId === bookingId) {
                result.push(t);
            }
        }
        return result.sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );
    }

    // ── Private helpers ─────────────────────────────────────────────

    private getRelatedPartitionRoomIds(roomId: string): string[] {
        const related: string[] = [];
        for (const p of this.partitions.values()) {
            if (p.parentRoomId === roomId) {
                related.push(p.childRoomId);
            } else if (p.childRoomId === roomId) {
                related.push(p.parentRoomId);
            }
        }
        return related;
    }

    private paginate(
        items: Booking[],
        pagination?: Pagination,
    ): PaginatedResult<Booking> {
        // Sort by createdAt ascending for deterministic ordering
        const sorted = [...items].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );

        const limit = pagination?.limit ?? sorted.length;
        let startIndex = 0;

        if (pagination?.cursor) {
            const cursorIndex = sorted.findIndex(
                (b) => b.id === pagination.cursor,
            );
            if (cursorIndex !== -1) {
                startIndex = cursorIndex + 1;
            }
        }

        const slice = sorted.slice(startIndex, startIndex + limit);
        const nextCursor =
            startIndex + limit < sorted.length
                ? slice[slice.length - 1]?.id
                : undefined;

        return {
            items: slice,
            nextCursor,
        };
    }
}
