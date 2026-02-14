import type { RoomKitPrismaClient } from "../../types/prisma-delegates";
import type { BulkOperation } from "../../types/entities";
import type { BulkOperationStatus } from "../../types/enums";
import { BulkOperationStorage } from "../../interfaces/bulk-operation.storage";

export class PrismaBulkOperationAdapter extends BulkOperationStorage {
    constructor(private readonly prisma: RoomKitPrismaClient) {
        super();
    }

    async create(
        data: Omit<BulkOperation, "id" | "createdAt">,
    ): Promise<BulkOperation> {
        return this.prisma.bulkOperation.create({ data });
    }

    async updateProgress(
        id: string,
        update: {
            processedItems: number;
            conflictsDetected: number;
            status?: BulkOperationStatus;
        },
    ): Promise<BulkOperation> {
        const data: Record<string, unknown> = {
            processedItems: update.processedItems,
            conflictsDetected: update.conflictsDetected,
        };

        if (update.status !== undefined) {
            data.status = update.status;

            // If the operation is completed or failed, set completedAt
            if (
                update.status === "completed" ||
                update.status === "failed"
            ) {
                data.completedAt = new Date();
            }
        }

        return this.prisma.bulkOperation.update({
            where: { id },
            data,
        });
    }

    async getResult(id: string): Promise<BulkOperation | null> {
        return this.prisma.bulkOperation.findUnique({ where: { id } });
    }
}
