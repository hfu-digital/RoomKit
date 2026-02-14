import { Injectable } from '@nestjs/common';
import { BookingStorage } from '../interfaces/booking.storage';
import { RoomStorage } from '../interfaces/room.storage';
import { ConflictService } from './conflict.service';
import { PriorityService } from './priority.service';
import { EventBus } from '../events/event-bus';
import { BookingStateMachine } from './state-machine';
import type { CreateBookingDto, UpdateBookingDto } from '../dto/booking.dto';
import { validateCreateBooking } from '../dto/booking.dto';
import type { Booking, Pagination, PaginatedResult } from '../types/entities';
import { BookingStatus } from '../types/enums';
import {
    BookingNotFoundError,
    InvalidTimeRangeError,
    BookingConflictError,
    InvalidStateTransitionError,
    RoomNotFoundError,
} from '../errors/roomkit.error';

@Injectable()
export class BookingService {
    constructor(
        private readonly bookingStorage: BookingStorage,
        private readonly conflictService: ConflictService,
        private readonly roomStorage: RoomStorage,
        private readonly priorityService: PriorityService,
        private readonly eventBus: EventBus,
        private readonly stateMachine: BookingStateMachine,
    ) {}

    /**
     * Create a new booking with full validation, idempotency support,
     * automatic priority resolution, and conflict checking.
     */
    async create(dto: CreateBookingDto): Promise<Booking> {
        const validationErrors = validateCreateBooking(dto);
        if (validationErrors.length > 0) {
            throw new InvalidTimeRangeError({
                startsAt: dto.startsAt?.toISOString() ?? 'undefined',
                endsAt: dto.endsAt?.toISOString() ?? 'undefined',
                reason: validationErrors.join('; '),
            });
        }

        // Idempotency: return existing booking if the key already maps to one
        if (dto.idempotencyKey) {
            const existing = await this.bookingStorage.findByIdempotencyKey(
                dto.idempotencyKey,
            );
            if (existing) {
                return existing;
            }
        }

        // Resolve priority: explicit value wins, otherwise derive from purpose
        const priority =
            dto.priority !== undefined
                ? dto.priority
                : await this.priorityService.resolve(dto.purposeType);

        // Validate that the target room exists
        const room = await this.roomStorage.findById(dto.roomId);
        if (!room) {
            throw new RoomNotFoundError({ roomId: dto.roomId });
        }

        // Delegate creation (with atomic conflict check) to storage
        const booking = await this.bookingStorage.createWithConflictCheck(
            {
                roomId: dto.roomId,
                requesterId: dto.requesterId,
                onBehalfOfId: dto.onBehalfOfId ?? null,
                title: dto.title,
                description: dto.description ?? null,
                startsAt: dto.startsAt,
                endsAt: dto.endsAt,
                status: BookingStatus.REQUESTED,
                priority,
                purposeType: dto.purposeType,
                idempotencyKey: dto.idempotencyKey ?? null,
                recurrenceRuleId: dto.recurrenceRuleId ?? null,
                recurrenceModType: dto.recurrenceModType ?? null,
                metadata: dto.metadata ?? null,
            },
            {
                checkPartitions: true,
                checkBuffers: true,
            },
        );

        this.eventBus.emit({
            type: 'BookingRequested',
            payload: booking,
            metadata: {
                triggeredBy: dto.requesterId,
                timestamp: new Date(),
            },
        });

        return booking;
    }

    /**
     * Confirm a booking (REQUESTED -> CONFIRMED).
     */
    async confirm(id: string, triggeredBy: string): Promise<Booking> {
        const { booking } = await this.bookingStorage.transition(
            id,
            BookingStatus.CONFIRMED,
            { triggeredBy },
        );

        this.eventBus.emit({
            type: 'BookingConfirmed',
            payload: booking,
            metadata: { triggeredBy, timestamp: new Date() },
        });

        return booking;
    }

    /**
     * Check in to a booking (CONFIRMED -> IN_PROGRESS).
     */
    async checkIn(id: string, triggeredBy: string): Promise<Booking> {
        const { booking } = await this.bookingStorage.transition(
            id,
            BookingStatus.IN_PROGRESS,
            { triggeredBy },
        );

        this.eventBus.emit({
            type: 'BookingStarted',
            payload: booking,
            metadata: { triggeredBy, timestamp: new Date() },
        });

        return booking;
    }

    /**
     * Complete a booking (IN_PROGRESS -> COMPLETED).
     */
    async complete(id: string, triggeredBy: string): Promise<Booking> {
        const { booking } = await this.bookingStorage.transition(
            id,
            BookingStatus.COMPLETED,
            { triggeredBy },
        );

        this.eventBus.emit({
            type: 'BookingCompleted',
            payload: booking,
            metadata: { triggeredBy, timestamp: new Date() },
        });

        return booking;
    }

    /**
     * Cancel a booking (any non-terminal state -> CANCELLED).
     */
    async cancel(
        id: string,
        triggeredBy: string,
        reason?: string,
    ): Promise<Booking> {
        const { booking } = await this.bookingStorage.transition(
            id,
            BookingStatus.CANCELLED,
            { triggeredBy, reason },
        );

        this.eventBus.emit({
            type: 'BookingCancelled',
            payload: booking,
            metadata: { triggeredBy, timestamp: new Date() },
        });

        return booking;
    }

    /**
     * Modify an existing booking with optimistic concurrency control.
     * Time or room changes trigger a conflict re-check.
     */
    async modify(
        id: string,
        changes: UpdateBookingDto,
        expectedVersion: number,
    ): Promise<Booking> {
        const existing = await this.bookingStorage.findById(id);
        if (!existing) {
            throw new BookingNotFoundError({ bookingId: id });
        }

        if (this.stateMachine.isTerminal(existing.status)) {
            throw new InvalidStateTransitionError({
                bookingId: id,
                currentStatus: existing.status,
                attemptedStatus: existing.status,
                allowedTransitions: [],
            });
        }

        // Re-check conflicts when time window or room changes
        const effectiveRoomId = changes.roomId ?? existing.roomId;
        const effectiveStartsAt = changes.startsAt ?? existing.startsAt;
        const effectiveEndsAt = changes.endsAt ?? existing.endsAt;

        if (
            changes.roomId !== undefined ||
            changes.startsAt !== undefined ||
            changes.endsAt !== undefined
        ) {
            const conflicts = await this.conflictService.checkConflicts(
                effectiveRoomId,
                effectiveStartsAt,
                effectiveEndsAt,
                id,
            );

            if (conflicts.hasConflict) {
                const conflictingBooking =
                    conflicts.directConflicts[0] ??
                    conflicts.partitionConflicts[0]?.booking;

                throw new BookingConflictError({
                    roomId: effectiveRoomId,
                    startsAt: effectiveStartsAt.toISOString(),
                    endsAt: effectiveEndsAt.toISOString(),
                    conflictingBookingId: conflictingBooking?.id ?? 'unknown',
                });
            }
        }

        const booking = await this.bookingStorage.updateWithVersion(
            id,
            changes,
            expectedVersion,
        );

        this.eventBus.emit({
            type: 'BookingModified',
            payload: booking,
            metadata: { triggeredBy: existing.requesterId, timestamp: new Date() },
        });

        return booking;
    }

    /**
     * Delegate a booking to another person (update onBehalfOfId).
     */
    async delegate(
        id: string,
        onBehalfOfId: string,
        triggeredBy: string,
    ): Promise<Booking> {
        const existing = await this.bookingStorage.findById(id);
        if (!existing) {
            throw new BookingNotFoundError({ bookingId: id });
        }

        const booking = await this.bookingStorage.updateWithVersion(
            id,
            { onBehalfOfId },
            existing.version,
        );

        this.eventBus.emit({
            type: 'BookingModified',
            payload: booking,
            metadata: { triggeredBy, timestamp: new Date() },
        });

        return booking;
    }

    /**
     * Retrieve bookings for a specific person within a time range.
     */
    async getByPerson(
        personId: string,
        timeRange: { startsAt: Date; endsAt: Date },
        pagination?: Pagination,
    ): Promise<PaginatedResult<Booking>> {
        return this.bookingStorage.findByPerson(personId, timeRange, pagination);
    }

    /**
     * Retrieve bookings for a specific room within a time range.
     */
    async getByRoom(
        roomId: string,
        timeRange: { startsAt: Date; endsAt: Date },
        pagination?: Pagination,
    ): Promise<PaginatedResult<Booking>> {
        return this.bookingStorage.findByRoom(roomId, timeRange, pagination);
    }

    /**
     * Retrieve a single booking by its ID.
     */
    async getById(id: string): Promise<Booking | null> {
        return this.bookingStorage.findById(id);
    }
}
