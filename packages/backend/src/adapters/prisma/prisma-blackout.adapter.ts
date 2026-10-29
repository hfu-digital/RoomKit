import type { RoomKitPrismaClient } from "../../types/prisma-delegates";
import type { BlackoutWindow } from "../../types/entities";
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
        return (await this.findActiveForScopes([locationNodeId], timeRange))[locationNodeId] ?? [];
    }

    async findActiveForScopes(ids: string[], timeRange: { startsAt: Date; endsAt: Date }): Promise<Record<string, BlackoutWindow[]>> {
        if (!ids.length) return {};
        const where: Record<string, unknown> = { id: { in: ids } };
        const nodes = await this.prisma.locationNode.findMany({ where });
        const paths = new Set<string>();
        for (const node of nodes) {
            const segments = node.path.split('/');
            for (let i = 1; i <= segments.length; i++) paths.add(segments.slice(0, i).join('/'));
        }
        const ancestorWhere: Record<string, unknown> = { path: { in: [...paths] } };
        const ancestors = await this.prisma.locationNode.findMany({ where: ancestorWhere });
        const blackouts = await this.prisma.blackoutWindow.findMany({ where: {
            locationNodeId: { in: [...new Set([...nodes, ...ancestors].map(n => n.id))] },
            AND: [{ startsAt: { lt: timeRange.endsAt } }, { endsAt: { gt: timeRange.startsAt } }],
        } });
        const result: Record<string, BlackoutWindow[]> = {};
        for (const id of ids) {
            const node = nodes.find(n => n.id === id);
            const applicable = new Set(node ? ancestors.filter(a => node.path === a.path || node.path.startsWith(a.path + '/')).map(a => a.id) : []);
            if (node) applicable.add(node.id);
            result[id] = blackouts.filter(b => applicable.has(b.locationNodeId));
        }
        return result;
    }

    async findById(id: string): Promise<BlackoutWindow | null> {
        return this.prisma.blackoutWindow.findUnique({ where: { id } });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.blackoutWindow.delete({ where: { id } });
    }
}
