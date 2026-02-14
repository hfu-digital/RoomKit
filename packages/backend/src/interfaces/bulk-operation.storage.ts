import type { BulkOperation } from "../types/entities";
import type { BulkOperationStatus } from "../types/enums";

export abstract class BulkOperationStorage {
    abstract create(
        data: Omit<BulkOperation, "id" | "createdAt">,
    ): Promise<BulkOperation>;

    abstract updateProgress(
        id: string,
        update: {
            processedItems: number;
            conflictsDetected: number;
            status?: BulkOperationStatus;
        },
    ): Promise<BulkOperation>;

    abstract getResult(id: string): Promise<BulkOperation | null>;
}
