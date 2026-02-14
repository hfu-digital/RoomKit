import type { RoomKitPrismaClient } from "../../types/prisma-delegates";
import type { BlackoutWindow, LocationNode } from "../../types/entities";
import { BlackoutStorage } from "../../interfaces/blackout.storage";

export class PrismaBlackoutAdapter extends BlackoutStorage {
    constructor(private readonly prisma: RoomKitPrismaClient) {
        super();
    }

    async create(
        data: Omit<BlackoutWindow, "id" | "createdAt">,
    ): Promise<BlackoutWindow> {
        return this.prisma.blackoutWindow.create({ data });
    }

    async findActiveForScope(
        locationNodeId: string,
        timeRange: { startsAt: Date; endsAt: Date },
    ): Promise<BlackoutWindow[]> {
        // Get the location node to find its path
        const node = await this.prisma.locationNode.findUnique({
            where: { id: locationNodeId },
        });

        if (!node) {
            return [];
        }

        // Build ancestor paths from the node's path
        const segments = node.path.split("/");
        const ancestorPaths: string[] = [];
        for (let i = 1; i <= segments.length; i++) {
            ancestorPaths.push(segments.slice(0, i).join("/"));
        }

        // Get location node IDs for all ancestors (including the node itself)
        const locationNodeIds: string[] = [locationNodeId];
        for (const ancestorPath of ancestorPaths) {
            const ancestor = await this.prisma.locationNode.findUnique({
                where: { path: ancestorPath },
            });
            if (ancestor && ancestor.id !== locationNodeId) {
                locationNodeIds.push(ancestor.id);
            }
        }

        // Query blackouts that apply to any of these location nodes within the time range
        // A blackout is active if it overlaps with the given time range:
        // blackout.startsAt < timeRange.endsAt AND blackout.endsAt > timeRange.startsAt
        return this.prisma.blackoutWindow.findMany({
            where: {
                locationNodeId: { in: locationNodeIds },
                AND: [
                    { startsAt: { lte: timeRange.endsAt } },
                    { endsAt: { gte: timeRange.startsAt } },
                ],
            },
        });
    }

    async findById(id: string): Promise<BlackoutWindow | null> {
        return this.prisma.blackoutWindow.findUnique({ where: { id } });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.blackoutWindow.delete({ where: { id } });
    }
}
