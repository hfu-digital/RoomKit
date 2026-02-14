import type { PriorityTier } from "../types/entities";

export abstract class PriorityStorage {
    abstract getAll(): Promise<PriorityTier[]>;

    abstract findByName(name: string): Promise<PriorityTier | null>;

    abstract upsert(
        data: Omit<PriorityTier, "id" | "createdAt">,
    ): Promise<PriorityTier>;
}
