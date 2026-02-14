import { PriorityStorage } from "../../interfaces/priority.storage";
import type { PriorityTier } from "../../types/entities";

export class MockPriorityStorage extends PriorityStorage {
    private tiers = new Map<string, PriorityTier>();

    async getAll(): Promise<PriorityTier[]> {
        const results = [...this.tiers.values()];
        return results.sort((a, b) => a.weight - b.weight);
    }

    async findByName(name: string): Promise<PriorityTier | null> {
        for (const tier of this.tiers.values()) {
            if (tier.name === name) {
                return tier;
            }
        }
        return null;
    }

    async upsert(
        data: Omit<PriorityTier, "id" | "createdAt">,
    ): Promise<PriorityTier> {
        // Check if a tier with this name already exists
        for (const [key, existing] of this.tiers.entries()) {
            if (existing.name === data.name) {
                const updated: PriorityTier = {
                    ...existing,
                    weight: data.weight,
                };
                this.tiers.set(key, updated);
                return updated;
            }
        }

        // Create new
        const tier: PriorityTier = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date(),
        };
        this.tiers.set(tier.id, tier);
        return tier;
    }

    /** Test helper: clear all stored data. */
    clear(): void {
        this.tiers.clear();
    }

    /** Test helper: seed a priority tier directly. */
    seed(tier: PriorityTier): void {
        this.tiers.set(tier.id, tier);
    }
}
