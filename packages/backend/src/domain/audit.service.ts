import { Injectable } from '@nestjs/common';
import { AuditStorage } from '../interfaces/audit.storage';
import type {
    BookingStateTransition,
    Pagination,
    PaginatedResult,
} from '../types/entities';

@Injectable()
export class AuditService {
    constructor(
        private readonly auditStorage: AuditStorage,
    ) {}

    /**
     * Retrieve the full state-transition history for a booking,
     * sorted chronologically (oldest first).
     */
    async getBookingHistory(
        bookingId: string,
    ): Promise<BookingStateTransition[]> {
        const transitions = await this.auditStorage.queryByBooking(bookingId);

        return transitions.sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );
    }

    /**
     * Query audit log entries within a time range with pagination support.
     */
    async queryAuditLog(
        timeRange: { startsAt: Date; endsAt: Date },
        pagination: Pagination,
    ): Promise<PaginatedResult<BookingStateTransition>> {
        return this.auditStorage.queryByTimeRange(timeRange, pagination);
    }
}
