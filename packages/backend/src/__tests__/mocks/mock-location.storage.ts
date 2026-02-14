import { LocationStorage } from "../../interfaces/location.storage";
import type { LocationNode } from "../../types/entities";
import type { LocationNodeType } from "../../types/enums";

export class MockLocationStorage extends LocationStorage {
    private nodes = new Map<string, LocationNode>();

    async createNode(
        data: Omit<LocationNode, "id" | "createdAt" | "updatedAt">,
    ): Promise<LocationNode> {
        const now = new Date();
        const node: LocationNode = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        };
        this.nodes.set(node.id, node);
        return node;
    }

    async getById(id: string): Promise<LocationNode | null> {
        return this.nodes.get(id) ?? null;
    }

    async getByPath(path: string): Promise<LocationNode | null> {
        for (const node of this.nodes.values()) {
            if (node.path === path) {
                return node;
            }
        }
        return null;
    }

    async getChildren(parentId: string): Promise<LocationNode[]> {
        const children: LocationNode[] = [];
        for (const node of this.nodes.values()) {
            if (node.parentId === parentId) {
                children.push(node);
            }
        }
        return children;
    }

    async getAncestors(nodeId: string): Promise<LocationNode[]> {
        const ancestors: LocationNode[] = [];
        let current = this.nodes.get(nodeId) ?? null;
        while (current?.parentId) {
            const parent = this.nodes.get(current.parentId) ?? null;
            if (!parent) break;
            ancestors.push(parent);
            current = parent;
        }
        return ancestors;
    }

    async queryByScope(scope: {
        type?: LocationNodeType;
        parentPath?: string;
        isActive?: boolean;
    }): Promise<LocationNode[]> {
        const results: LocationNode[] = [];
        for (const node of this.nodes.values()) {
            if (scope.type !== undefined && node.type !== scope.type) {
                continue;
            }
            if (
                scope.parentPath !== undefined &&
                !node.path.startsWith(scope.parentPath)
            ) {
                continue;
            }
            if (scope.isActive !== undefined && node.isActive !== scope.isActive) {
                continue;
            }
            results.push(node);
        }
        return results;
    }

    async resolveAlias(alias: string): Promise<LocationNode | null> {
        for (const node of this.nodes.values()) {
            if (node.aliases.includes(alias)) {
                return node;
            }
        }
        return null;
    }

    async update(
        id: string,
        data: Partial<Omit<LocationNode, "id" | "createdAt" | "updatedAt">>,
    ): Promise<LocationNode> {
        const existing = this.nodes.get(id);
        if (!existing) {
            throw new Error(`LocationNode not found: ${id}`);
        }
        const updated: LocationNode = {
            ...existing,
            ...data,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: new Date(),
        };
        this.nodes.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        this.nodes.delete(id);
    }

    /** Test helper: clear all stored data. */
    clear(): void {
        this.nodes.clear();
    }

    /** Test helper: seed a node directly. */
    seed(node: LocationNode): void {
        this.nodes.set(node.id, node);
    }
}
