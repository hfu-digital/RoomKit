import { Injectable } from "@nestjs/common";
import { LocationStorage } from "../interfaces/location.storage";
import type { LocationNode } from "../types/entities";
import type { CreateLocationNodeDto } from "../dto/location.dto";
import { validateCreateLocationNode } from "../dto/location.dto";
import {
    LocationNotFoundError,
    LocationPathConflictError,
    RoomKitError,
} from "../errors/roomkit.error";

export type LocationTreeNode = LocationNode & { children: LocationTreeNode[] };

@Injectable()
export class LocationService {
    constructor(private readonly locationStorage: LocationStorage) {}

    /**
     * Creates a new location node in the hierarchy.
     *
     * Validates the DTO, ensures the parent exists (if specified),
     * auto-generates a unique path from the parent path and a slugified
     * displayName, checks for path uniqueness, then delegates to storage.
     */
    async createNode(dto: CreateLocationNodeDto): Promise<LocationNode> {
        const errors = validateCreateLocationNode(dto);
        if (errors.length > 0) {
            throw new RoomKitError(
                "VALIDATION_ERROR",
                `Validation failed: ${errors.join(", ")}`,
                { errors },
            );
        }

        let parentPath = "";
        if (dto.parentId) {
            const parent = await this.locationStorage.getById(dto.parentId);
            if (!parent) {
                throw new LocationNotFoundError({ locationId: dto.parentId });
            }
            parentPath = parent.path;
        }

        const slug = this.slugify(dto.displayName);
        const path = parentPath ? `${parentPath}/${slug}` : slug;

        const existing = await this.locationStorage.getByPath(path);
        if (existing) {
            throw new LocationPathConflictError({ path });
        }

        return this.locationStorage.createNode({
            parentId: dto.parentId,
            type: dto.type,
            displayName: dto.displayName,
            path,
            aliases: dto.aliases ?? [],
            isActive: dto.isActive ?? true,
            metadata: dto.metadata ?? null,
        });
    }

    /**
     * Retrieves a location node by its ID.
     */
    async getById(id: string): Promise<LocationNode | null> {
        return this.locationStorage.getById(id);
    }

    /**
     * Builds a tree structure from location nodes.
     *
     * If rootId is provided, the tree is rooted at that node's children.
     * Otherwise, all top-level nodes (parentId === null) form the forest roots.
     */
    async getTree(rootId?: string): Promise<LocationTreeNode[]> {
        let nodes: LocationNode[];
        if (rootId) {
            const root = await this.locationStorage.getById(rootId);
            if (!root) {
                throw new LocationNotFoundError({ locationId: rootId });
            }
            // Fetch all nodes under this root's path scope
            nodes = await this.locationStorage.queryByScope({
                parentPath: root.path,
            });
            // Include the root node itself at the beginning
            nodes = [root, ...nodes];
        } else {
            nodes = await this.locationStorage.queryByScope({});
        }

        return this.buildTree(nodes, rootId ?? null);
    }

    /**
     * Resolves a location alias to its canonical node.
     */
    async resolveAlias(alias: string): Promise<LocationNode | null> {
        return this.locationStorage.resolveAlias(alias);
    }

    /**
     * Moves a node (and all its descendants) under a new parent.
     *
     * Recomputes paths for the moved node and every descendant so that
     * the hierarchy stays consistent.
     */
    async moveNode(id: string, newParentId: string): Promise<LocationNode> {
        const node = await this.locationStorage.getById(id);
        if (!node) {
            throw new LocationNotFoundError({ locationId: id });
        }

        const newParent = await this.locationStorage.getById(newParentId);
        if (!newParent) {
            throw new LocationNotFoundError({ locationId: newParentId });
        }

        const slug = this.slugify(node.displayName);
        const newPath = `${newParent.path}/${slug}`;

        const existing = await this.locationStorage.getByPath(newPath);
        if (existing && existing.id !== id) {
            throw new LocationPathConflictError({ path: newPath });
        }

        const oldPath = node.path;

        // Update the node itself
        const updatedNode = await this.locationStorage.update(id, {
            parentId: newParentId,
            path: newPath,
        });

        // Find all descendants and update their paths
        const descendants = await this.locationStorage.queryByScope({
            parentPath: oldPath,
        });

        for (const descendant of descendants) {
            const updatedDescendantPath = descendant.path.replace(
                oldPath,
                newPath,
            );
            await this.locationStorage.update(descendant.id, {
                path: updatedDescendantPath,
            });
        }

        return updatedNode;
    }

    /**
     * Returns the ancestor chain from the given node up to the root.
     */
    async getAncestors(nodeId: string): Promise<LocationNode[]> {
        return this.locationStorage.getAncestors(nodeId);
    }

    // ─── Private Helpers ─────────────────────────────────────────

    /**
     * Converts a display name to a URL-friendly slug.
     * Lowercase, spaces replaced with hyphens, non-alphanumeric characters removed.
     */
    private slugify(displayName: string): string {
        return displayName
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
    }

    /**
     * Recursively builds a tree from a flat list of nodes.
     */
    private buildTree(
        nodes: LocationNode[],
        parentId: string | null,
    ): LocationTreeNode[] {
        const children = nodes.filter((n) => n.parentId === parentId);

        return children.map((child) => ({
            ...child,
            children: this.buildTree(nodes, child.id),
        }));
    }
}
