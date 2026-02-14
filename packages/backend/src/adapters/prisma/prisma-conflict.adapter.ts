import type { RoomKitPrismaClient } from "../../types/prisma-delegates";
import type { ConflictRecord } from "../../types/entities";
import { ConflictStorage } from "../../interfaces/conflict.storage";

export class PrismaConflictAdapter extends ConflictStorage {
    constructor(private readonly prisma: RoomKitPrismaClient) {
        super();
    }

    async record(
        data: Omit<ConflictRecord, "id" | "createdAt">,
    ): Promise<ConflictRecord> {
        return this.prisma.conflictRecord.create({ data });
    }

    async findByBooking(bookingId: string): Promise<ConflictRecord[]> {
        return this.prisma.conflictRecord.findMany({
            where: {
                OR: [
                    { bookingAId: bookingId },
                    { bookingBId: bookingId },
                ],
            },
        });
    }
}
