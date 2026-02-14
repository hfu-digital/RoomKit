import type { RoomKitPrismaClient } from "../../types/prisma-delegates";
import type { ConfigEntry, LocationNode } from "../../types/entities";
import { ConfigStorage } from "../../interfaces/config.storage";
import { LocationStorage } from "../../interfaces/location.storage";

export class PrismaConfigAdapter extends ConfigStorage {
    constructor(
        private readonly prisma: RoomKitPrismaClient,
        private readonly locationStorage: LocationStorage,
    ) {
        super();
    }

    async set(
        locationNodeId: string | null,
        key: string,
        value: string,
    ): Promise<ConfigEntry> {
        // Try to find an existing entry for this locationNodeId+key
        const existing = await this.prisma.configEntry.findUnique({
            where: {
                locationNodeId_key: {
                    locationNodeId: locationNodeId,
                    key,
                },
            },
        });

        if (existing) {
            // Update existing entry
            return this.prisma.configEntry.update({
                where: { id: existing.id },
                data: { value },
            });
        }

        // Create new entry
        return this.prisma.configEntry.create({
            data: {
                locationNodeId,
                key,
                value,
                inheritFromParent: true,
            },
        });
    }

    async get(
        locationNodeId: string | null,
        key: string,
    ): Promise<ConfigEntry | null> {
        return this.prisma.configEntry.findUnique({
            where: {
                locationNodeId_key: {
                    locationNodeId: locationNodeId,
                    key,
                },
            },
        });
    }

    async resolve(
        locationNodeId: string,
        key: string,
    ): Promise<ConfigEntry | null> {
        // Walk up the location hierarchy, returning the first matching config entry.
        // Stop walking if inheritFromParent is false on any found entry.

        // First check the current node
        const currentEntry = await this.prisma.configEntry.findUnique({
            where: {
                locationNodeId_key: {
                    locationNodeId,
                    key,
                },
            },
        });

        if (currentEntry) {
            return currentEntry;
        }

        // Get the current location node to find its ancestors
        const node = await this.locationStorage.getById(locationNodeId);
        if (!node) {
            // Fall back to global config (locationNodeId = null)
            return this.get(null, key);
        }

        // Build ancestor paths from the node's path (most specific to least specific)
        const segments = node.path.split("/");
        const ancestorPaths: string[] = [];
        for (let i = segments.length - 1; i >= 1; i--) {
            ancestorPaths.push(segments.slice(0, i).join("/"));
        }

        // Walk up the hierarchy
        for (const ancestorPath of ancestorPaths) {
            const ancestor = await this.locationStorage.getByPath(ancestorPath);
            if (!ancestor) {
                continue;
            }

            const entry = await this.prisma.configEntry.findUnique({
                where: {
                    locationNodeId_key: {
                        locationNodeId: ancestor.id,
                        key,
                    },
                },
            });

            if (entry) {
                // If this entry does not inherit from parent, return it and stop
                return entry;
            }
        }

        // Finally, check for a global config entry (locationNodeId = null)
        return this.get(null, key);
    }

    async getAll(
        locationNodeId?: string | null,
    ): Promise<ConfigEntry[]> {
        if (locationNodeId === undefined) {
            return this.prisma.configEntry.findMany();
        }

        return this.prisma.configEntry.findMany({
            where: { locationNodeId },
        });
    }

    async delete(
        locationNodeId: string | null,
        key: string,
    ): Promise<void> {
        const entry = await this.prisma.configEntry.findUnique({
            where: {
                locationNodeId_key: {
                    locationNodeId: locationNodeId,
                    key,
                },
            },
        });

        if (entry) {
            await this.prisma.configEntry.delete({
                where: { id: entry.id },
            });
        }
    }
}
