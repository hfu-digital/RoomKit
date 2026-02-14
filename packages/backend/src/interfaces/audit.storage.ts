import type {
    BookingStateTransition,
    Pagination,
    PaginatedResult,
} from "../types/entities";

export abstract class AuditStorage {
    abstract append(
        entry: Omit<BookingStateTransition, "id">,
    ): Promise<BookingStateTransition>;

    abstract queryByBooking(
        bookingId: string,
    ): Promise<BookingStateTransition[]>;

    abstract queryByTimeRange(
        range: { startsAt: Date; endsAt: Date },
        pagination: Pagination,
    ): Promise<PaginatedResult<BookingStateTransition>>;
}
