import type {
    Booking,
    BookingStateTransition,
    Pagination,
    PaginatedResult,
} from "../types/entities";
import type { BookingStatus } from "../types/enums";

export abstract class BookingStorage {
    abstract createWithConflictCheck(
        booking: Omit<Booking, "id" | "version" | "createdAt" | "updatedAt">,
        conflictScope: {
            checkPartitions: boolean;
            checkBuffers: boolean;
        },
    ): Promise<Booking>;

    abstract findOverlapping(
        roomId: string,
        startsAt: Date,
        endsAt: Date,
        excludeBookingId?: string,
    ): Promise<Booking[]>;

    abstract updateWithVersion(
        id: string,
        data: Partial<Booking>,
        expectedVersion: number,
    ): Promise<Booking>;

    abstract findByIdempotencyKey(key: string): Promise<Booking | null>;

    abstract transition(
        id: string,
        toStatus: BookingStatus,
        metadata: {
            triggeredBy: string;
            reason?: string;
        },
    ): Promise<{
        booking: Booking;
        transition: BookingStateTransition;
    }>;

    abstract findByPerson(
        personId: string,
        timeRange: { startsAt: Date; endsAt: Date },
        pagination?: Pagination,
    ): Promise<PaginatedResult<Booking>>;

    abstract findByRoom(
        roomId: string,
        timeRange: { startsAt: Date; endsAt: Date },
        pagination?: Pagination,
    ): Promise<PaginatedResult<Booking>>;

    abstract findById(id: string): Promise<Booking | null>;
}
