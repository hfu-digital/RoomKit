import type { RoomKitPrismaClient } from "../../types/prisma-delegates";
import type { PriorityTier } from "../../types/entities";
import { PriorityStorage } from "../../interfaces/priority.storage";

export class PrismaPriorityAdapter extends PriorityStorage {
    constructor(private readonly prisma: RoomKitPrismaClient) {
        super();
    }

    async getAll(): Promise<PriorityTier[]> {
        return this.prisma.priorityTier.findMany();
    }

    async findByName(name: string): Promise<PriorityTier | null> {
        const results = await this.prisma.priorityTier.findMany({
            where: { name },
        });
        return results.length > 0 ? results[0] : null;
    }

    async upsert(
        data: Omit<PriorityTier, "id" | "createdAt">,
    ): Promise<PriorityTier> {
        // Try to find an existing tier by name
        const existing = await this.findByName(data.name);

        if (existing) {
            // Update the existing tier
            return this.prisma.priorityTier.update({
                where: { id: existing.id },
                data: { weight: data.weight },
            });
        }

        // Create a new tier
        return this.prisma.priorityTier.create({ data });
    }
}
