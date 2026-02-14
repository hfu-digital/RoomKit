import { AuditStorage } from "../../interfaces/audit.storage";
import type {
    BookingStateTransition,
    Pagination,
    PaginatedResult,
} from "../../types/entities";

export class MockAuditStorage extends AuditStorage {
    private entries = new Map<string, BookingStateTransition>();

    async append(
        entry: Omit<BookingStateTransition, "id">,
    ): Promise<BookingStateTransition> {
        const record: BookingStateTransition = {
            ...entry,
            id: crypto.randomUUID(),
        };
        this.entries.set(record.id, record);
        return record;
    }

    async queryByBooking(
        bookingId: string,
    ): Promise<BookingStateTransition[]> {
        const results: BookingStateTransition[] = [];
        for (const entry of this.entries.values()) {
            if (entry.bookingId === bookingId) {
                results.push(entry);
            }
        }
        return results.sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );
    }

    async queryByTimeRange(
        range: { startsAt: Date; endsAt: Date },
        pagination: Pagination,
    ): Promise<PaginatedResult<BookingStateTransition>> {
        const filtered: BookingStateTransition[] = [];
        for (const entry of this.entries.values()) {
            if (
                entry.timestamp >= range.startsAt &&
                entry.timestamp <= range.endsAt
            ) {
                filtered.push(entry);
            }
        }

        // Sort by timestamp ascending
        const sorted = filtered.sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );

        // Cursor-based pagination
        const limit = pagination.limit;
        let startIndex = 0;

        if (pagination.cursor) {
            const cursorIndex = sorted.findIndex(
                (e) => e.id === pagination.cursor,
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

    /** Test helper: clear all stored data. */
    clear(): void {
        this.entries.clear();
    }

    /** Test helper: seed an audit entry directly. */
    seed(entry: BookingStateTransition): void {
        this.entries.set(entry.id, entry);
    }
}
