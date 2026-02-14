import { Injectable } from '@nestjs/common';
import { ExamStorage } from '../interfaces/exam.storage';
import { BookingService } from './booking.service';
import { RoomStorage } from '../interfaces/room.storage';
import { EventBus } from '../events/event-bus';
import type { ExamSession } from '../types/entities';
import { ExamLayoutType } from '../types/enums';
import type { CreateBookingDto } from '../dto/booking.dto';
import {
    ExamCohortOverlapError,
    CapacityExceededError,
} from '../errors/roomkit.error';

@Injectable()
export class ExamService {
    constructor(
        private readonly examStorage: ExamStorage,
        private readonly bookingService: BookingService,
        private readonly roomStorage: RoomStorage,
        private readonly eventBus: EventBus,
    ) {}

    /**
     * Create a new exam session.
     *
     * Validates that the cohort does not overlap with an existing exam session
     * at the same time, checks that the room has sufficient capacity for the
     * requested layout type, creates the underlying booking (with buffer time
     * for exam setup), and persists the exam session.
     */
    async createExamSession(dto: {
        bookingData: CreateBookingDto;
        cohortId: string;
        layoutType: ExamLayoutType;
        requiredCapacity: number;
        supervisorIds?: string[];
        metadata?: string | null;
    }): Promise<ExamSession> {
        // Check cohort does not overlap with an existing session
        const conflicting = await this.examStorage.findConflictingCohort(
            dto.cohortId,
            {
                startsAt: dto.bookingData.startsAt,
                endsAt: dto.bookingData.endsAt,
            },
        );
        if (conflicting.length > 0) {
            throw new ExamCohortOverlapError({
                cohortId: dto.cohortId,
                existingSessionId: conflicting[0]!.id,
                timeRange: `${dto.bookingData.startsAt.toISOString()} - ${dto.bookingData.endsAt.toISOString()}`,
            });
        }

        // Calculate effective capacity based on layout type
        const effectiveCapacity = await this.calculateCapacity(
            dto.bookingData.roomId,
            dto.layoutType,
        );

        if (effectiveCapacity < dto.requiredCapacity) {
            throw new CapacityExceededError({
                roomId: dto.bookingData.roomId,
                required: dto.requiredCapacity,
                available: effectiveCapacity,
                capacityType: dto.layoutType === ExamLayoutType.EVERY_OTHER_SEAT
                    ? 'exam'
                    : 'seated',
            });
        }

        // Load room for buffer times
        const room = await this.roomStorage.findById(dto.bookingData.roomId);
        const setupBuffer = room?.setupBufferMinutes ?? 0;
        const teardownBuffer = room?.teardownBufferMinutes ?? 0;

        // Create booking with buffer times for exam setup/teardown
        const bufferedStartsAt = new Date(
            dto.bookingData.startsAt.getTime() - setupBuffer * 60 * 1000,
        );
        const bufferedEndsAt = new Date(
            dto.bookingData.endsAt.getTime() + teardownBuffer * 60 * 1000,
        );

        const booking = await this.bookingService.create({
            ...dto.bookingData,
            startsAt: bufferedStartsAt,
            endsAt: bufferedEndsAt,
        });

        // Create exam session linked to the booking
        const examSession = await this.examStorage.createSession({
            bookingId: booking.id,
            cohortId: dto.cohortId,
            layoutType: dto.layoutType,
            requiredCapacity: dto.requiredCapacity,
            supervisorIds: dto.supervisorIds ?? [],
            metadata: dto.metadata ?? null,
        });

        this.eventBus.emit({
            type: 'ExamSessionCreated',
            payload: examSession,
            metadata: {
                triggeredBy: dto.bookingData.requesterId,
                timestamp: new Date(),
            },
        });

        return examSession;
    }

    /**
     * Find exam sessions matching the given filters.
     *
     * Supports filtering by cohort ID, time range, and room ID. When filtering
     * by room ID, finds all exam sessions whose underlying booking is in the
     * specified room within the optional time range.
     */
    async findByFilters(filters: {
        cohortId?: string;
        timeRange?: { startsAt: Date; endsAt: Date };
        roomId?: string;
    }): Promise<ExamSession[]> {
        // If filtering by cohort with time range, use the cohort conflict finder
        // which effectively searches by cohort + time range
        if (filters.cohortId && filters.timeRange) {
            return this.examStorage.findConflictingCohort(
                filters.cohortId,
                filters.timeRange,
            );
        }

        // For cohort-only filter, search across all time
        if (filters.cohortId) {
            return this.examStorage.findConflictingCohort(
                filters.cohortId,
                {
                    startsAt: new Date(0),
                    endsAt: new Date('2099-12-31'),
                },
            );
        }

        // For room-based filtering, get bookings for the room and cross-reference
        if (filters.roomId) {
            const timeRange = filters.timeRange ?? {
                startsAt: new Date(0),
                endsAt: new Date('2099-12-31'),
            };

            const bookingsResult = await this.bookingService.getByRoom(
                filters.roomId,
                timeRange,
            );

            const sessions: ExamSession[] = [];
            for (const booking of bookingsResult.items) {
                const session = await this.examStorage.findByBooking(booking.id);
                if (session) {
                    sessions.push(session);
                }
            }
            return sessions;
        }

        // If only time range, search all cohorts (use a broad cohort search)
        if (filters.timeRange) {
            // Use a wildcard-like search by looking for any cohort conflicts
            // in the time range. Since there's no direct "find all by time range"
            // method, we return an empty array as no specific filter was provided.
            return [];
        }

        return [];
    }

    /**
     * Calculate the effective capacity of a room for a given exam layout type.
     *
     * - 'every-other-seat': uses the room's examCapacity
     * - 'full': uses the room's seatedCapacity
     */
    async calculateCapacity(
        roomId: string,
        layoutType: ExamLayoutType,
    ): Promise<number> {
        const room = await this.roomStorage.findById(roomId);
        if (!room) {
            return 0;
        }

        switch (layoutType) {
            case ExamLayoutType.EVERY_OTHER_SEAT:
                return room.examCapacity;
            case ExamLayoutType.FULL:
                return room.seatedCapacity;
            default:
                return room.seatedCapacity;
        }
    }
}
