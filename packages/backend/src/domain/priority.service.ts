import { Injectable } from "@nestjs/common";
import { PriorityStorage } from "../interfaces/priority.storage";
import type { PriorityTier } from "../types/entities";

const DEFAULT_TIERS: { name: string; weight: number }[] = [
    { name: "LECTURE", weight: 100 },
    { name: "SEMINAR", weight: 75 },
    { name: "STUDY_GROUP", weight: 50 },
    { name: "OPEN", weight: 25 },
];

const FALLBACK_WEIGHT = 25;

@Injectable()
export class PriorityService {
    constructor(private readonly priorityStorage: PriorityStorage) {}

    /**
     * Returns all priority tiers.
     */
    async getAll(): Promise<PriorityTier[]> {
        return this.priorityStorage.getAll();
    }

    /**
     * Resolves a purpose type to its priority weight.
     *
     * Looks up the tier by name (case-insensitive). If no matching tier
     * is found, falls back to the OPEN weight (25).
     */
    async resolve(purposeType: string): Promise<number> {
        const tier = await this.priorityStorage.findByName(
            purposeType.toUpperCase(),
        );
        if (tier) {
            return tier.weight;
        }
        return FALLBACK_WEIGHT;
    }

    /**
     * Creates or updates a priority tier.
     */
    async upsert(tier: { name: string; weight: number }): Promise<PriorityTier> {
        return this.priorityStorage.upsert({
            name: tier.name,
            weight: tier.weight,
        });
    }

    /**
     * Seeds the default priority tiers if they do not already exist.
     *
     * Defaults: LECTURE=100, SEMINAR=75, STUDY_GROUP=50, OPEN=25.
     */
    async seedDefaults(): Promise<void> {
        const existing = await this.priorityStorage.getAll();
        const existingNames = new Set(
            existing.map((t) => t.name.toUpperCase()),
        );

        for (const tier of DEFAULT_TIERS) {
            if (!existingNames.has(tier.name.toUpperCase())) {
                await this.priorityStorage.upsert(tier);
            }
        }
    }
}
