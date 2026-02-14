import type { RoomKitPrismaClient } from "../../types/prisma-delegates";
import type {
    BookingStateTransition,
    Pagination,
    PaginatedResult,
} from "../../types/entities";
import { AuditStorage } from "../../interfaces/audit.storage";

export class PrismaAuditAdapter extends AuditStorage {
    constructor(private readonly prisma: RoomKitPrismaClient) {
        super();
    }

    async append(
        entry: Omit<BookingStateTransition, "id">,
    ): Promise<BookingStateTransition> {
        return this.prisma.bookingStateTransition.create({
            data: entry,
        });
    }

    async queryByBooking(
        bookingId: string,
    ): Promise<BookingStateTransition[]> {
        return this.prisma.bookingStateTransition.findMany({
            where: { bookingId },
            orderBy: { timestamp: "asc" },
        });
    }

    async queryByTimeRange(
        range: { startsAt: Date; endsAt: Date },
        pagination: Pagination,
    ): Promise<PaginatedResult<BookingStateTransition>> {
        const limit = pagination.limit;
        const where = {
            timestamp: {
                gte: range.startsAt,
                lte: range.endsAt,
            },
        };

        let cursor: Record<string, unknown> | undefined;
        if (pagination.cursor) {
            cursor = { id: pagination.cursor };
        }

        const items = await this.prisma.bookingStateTransition.findMany({
            where,
            orderBy: { timestamp: "asc" },
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
}
