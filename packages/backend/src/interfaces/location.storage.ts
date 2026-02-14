import type { LocationNode } from "../types/entities";
import type { LocationNodeType } from "../types/enums";

export abstract class LocationStorage {
    abstract createNode(
        data: Omit<LocationNode, "id" | "createdAt" | "updatedAt">,
    ): Promise<LocationNode>;

    abstract getById(id: string): Promise<LocationNode | null>;

    abstract getByPath(path: string): Promise<LocationNode | null>;

    abstract getChildren(parentId: string): Promise<LocationNode[]>;

    abstract getAncestors(nodeId: string): Promise<LocationNode[]>;

    abstract queryByScope(scope: {
        type?: LocationNodeType;
        parentPath?: string;
        isActive?: boolean;
    }): Promise<LocationNode[]>;

    abstract resolveAlias(alias: string): Promise<LocationNode | null>;

    abstract update(
        id: string,
        data: Partial<Omit<LocationNode, "id" | "createdAt" | "updatedAt">>,
    ): Promise<LocationNode>;

    abstract delete(id: string): Promise<void>;
}
