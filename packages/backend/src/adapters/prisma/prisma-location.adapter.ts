import type { RoomKitPrismaClient } from "../../types/prisma-delegates";
import type { LocationNode } from "../../types/entities";
import type { LocationNodeType } from "../../types/enums";
import { LocationStorage } from "../../interfaces/location.storage";

export class PrismaLocationAdapter extends LocationStorage {
    constructor(private readonly prisma: RoomKitPrismaClient) {
        super();
    }

    async createNode(
        data: Omit<LocationNode, "id" | "createdAt" | "updatedAt">,
    ): Promise<LocationNode> {
        return this.prisma.locationNode.create({ data });
    }

    async getById(id: string): Promise<LocationNode | null> {
        return this.prisma.locationNode.findUnique({ where: { id } });
    }

    async getByPath(path: string): Promise<LocationNode | null> {
        return this.prisma.locationNode.findUnique({ where: { path } });
    }

    async getChildren(parentId: string): Promise<LocationNode[]> {
        return this.prisma.locationNode.findMany({
            where: { parentId },
        });
    }

    async getAncestors(nodeId: string): Promise<LocationNode[]> {
        const node = await this.prisma.locationNode.findUnique({
            where: { id: nodeId },
        });

        if (!node) {
            return [];
        }

        // Split the path into segments and build ancestor paths.
        // Example path: "hfu/campus-furtwangen/a-building/floor-1"
        // Ancestors: "hfu", "hfu/campus-furtwangen", "hfu/campus-furtwangen/a-building"
        const segments = node.path.split("/");
        if (segments.length <= 1) {
            return [];
        }

        const ancestorPaths: string[] = [];
        for (let i = 1; i < segments.length; i++) {
            ancestorPaths.push(segments.slice(0, i).join("/"));
        }

        if (ancestorPaths.length === 0) {
            return [];
        }

        // Query all ancestors by their paths
        const ancestors: LocationNode[] = [];
        for (const ancestorPath of ancestorPaths) {
            const ancestor = await this.prisma.locationNode.findUnique({
                where: { path: ancestorPath },
            });
            if (ancestor) {
                ancestors.push(ancestor);
            }
        }

        return ancestors;
    }

    async queryByScope(scope: {
        type?: LocationNodeType;
        parentPath?: string;
        isActive?: boolean;
    }): Promise<LocationNode[]> {
        const where: Record<string, unknown> = {};

        if (scope.type !== undefined) {
            where.type = scope.type;
        }

        if (scope.isActive !== undefined) {
            where.isActive = scope.isActive;
        }

        // Fetch all matching nodes and then filter by parentPath prefix if needed
        const nodes = await this.prisma.locationNode.findMany({ where });

        if (scope.parentPath !== undefined) {
            const prefix = scope.parentPath.endsWith("/")
                ? scope.parentPath
                : scope.parentPath + "/";
            return nodes.filter(
                (n: LocationNode) =>
                    n.path.startsWith(prefix) || n.path === scope.parentPath,
            );
        }

        return nodes;
    }

    async resolveAlias(alias: string): Promise<LocationNode | null> {
        // Query nodes whose aliases array contains the given alias
        const results = await this.prisma.locationNode.findMany({
            where: { aliases: { has: alias } },
        });
        return results.length > 0 ? results[0] : null;
    }

    async update(
        id: string,
        data: Partial<Omit<LocationNode, "id" | "createdAt" | "updatedAt">>,
    ): Promise<LocationNode> {
        return this.prisma.locationNode.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.locationNode.delete({ where: { id } });
    }
}
