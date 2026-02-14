import { ConfigStorage } from "../../interfaces/config.storage";
import type { ConfigEntry } from "../../types/entities";

export class MockConfigStorage extends ConfigStorage {
    private entries = new Map<string, ConfigEntry>();
    private locationAncestorResolver:
        | ((locationNodeId: string) => Promise<string[]>)
        | null = null;

    async set(
        locationNodeId: string | null,
        key: string,
        value: string,
    ): Promise<ConfigEntry> {
        const compositeKey = this.makeCompositeKey(locationNodeId, key);

        // Update if exists
        for (const [mapKey, existing] of this.entries.entries()) {
            if (
                existing.locationNodeId === locationNodeId &&
                existing.key === key
            ) {
                const updated: ConfigEntry = {
                    ...existing,
                    value,
                    updatedAt: new Date(),
                };
                this.entries.set(mapKey, updated);
                return updated;
            }
        }

        // Create new
        const now = new Date();
        const entry: ConfigEntry = {
            id: crypto.randomUUID(),
            locationNodeId,
            key,
            value,
            inheritFromParent: true,
            createdAt: now,
            updatedAt: now,
        };
        this.entries.set(compositeKey, entry);
        return entry;
    }

    async get(
        locationNodeId: string | null,
        key: string,
    ): Promise<ConfigEntry | null> {
        for (const entry of this.entries.values()) {
            if (entry.locationNodeId === locationNodeId && entry.key === key) {
                return entry;
            }
        }
        return null;
    }

    async resolve(
        locationNodeId: string,
        key: string,
    ): Promise<ConfigEntry | null> {
        // First check the exact node
        const direct = await this.get(locationNodeId, key);
        if (direct) return direct;

        // Walk up ancestor chain if a resolver is provided
        if (this.locationAncestorResolver) {
            const ancestorIds =
                await this.locationAncestorResolver(locationNodeId);
            for (const ancestorId of ancestorIds) {
                const entry = await this.get(ancestorId, key);
                if (entry && entry.inheritFromParent) {
                    return entry;
                }
            }
        }

        // Fall back to global (null locationNodeId)
        return this.get(null, key);
    }

    async getAll(locationNodeId?: string | null): Promise<ConfigEntry[]> {
        const results: ConfigEntry[] = [];
        for (const entry of this.entries.values()) {
            if (locationNodeId === undefined) {
                results.push(entry);
            } else if (entry.locationNodeId === locationNodeId) {
                results.push(entry);
            }
        }
        return results.sort((a, b) => a.key.localeCompare(b.key));
    }

    async delete(
        locationNodeId: string | null,
        key: string,
    ): Promise<void> {
        for (const [mapKey, entry] of this.entries.entries()) {
            if (entry.locationNodeId === locationNodeId && entry.key === key) {
                this.entries.delete(mapKey);
                return;
            }
        }
    }

    /** Test helper: clear all stored data. */
    clear(): void {
        this.entries.clear();
    }

    /** Test helper: seed a config entry directly. */
    seed(entry: ConfigEntry): void {
        const compositeKey = this.makeCompositeKey(entry.locationNodeId, entry.key);
        this.entries.set(compositeKey, entry);
    }

    /**
     * Test helper: set a function that resolves ancestor location node IDs.
     * This is used by the `resolve` method to walk up the location hierarchy.
     */
    setAncestorResolver(
        resolver: (locationNodeId: string) => Promise<string[]>,
    ): void {
        this.locationAncestorResolver = resolver;
    }

    // ── Private helpers ─────────────────────────────────────────────

    private makeCompositeKey(
        locationNodeId: string | null,
        key: string,
    ): string {
        return `${locationNodeId ?? "__global__"}::${key}`;
    }
}
