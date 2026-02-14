import { Injectable } from '@nestjs/common';
import { ConfigStorage } from '../interfaces/config.storage';
import { LocationStorage } from '../interfaces/location.storage';
import type { ConfigEntry } from '../types/entities';
import { ConfigKeyInvalidError } from '../errors/roomkit.error';

/**
 * Regex for valid config keys: alphanumeric characters, dots, and underscores.
 * Examples: "booking.auto_confirm", "room.buffer_minutes", "system.timezone"
 */
const CONFIG_KEY_PATTERN = /^[a-zA-Z0-9._]+$/;

@Injectable()
export class ConfigService {
    constructor(
        private readonly configStorage: ConfigStorage,
        private readonly locationStorage: LocationStorage,
    ) {}

    /**
     * Set a configuration value at a specific location node (or globally if null).
     * The key must consist of alphanumeric characters, dots, and underscores.
     */
    async set(
        locationNodeId: string | null,
        key: string,
        value: string,
    ): Promise<ConfigEntry> {
        this.validateKey(key);
        return this.configStorage.set(locationNodeId, key, value);
    }

    /**
     * Resolve a single config key for a location node, walking up the
     * hierarchy until a value is found (or returning null).
     */
    async resolve(
        locationNodeId: string,
        key: string,
    ): Promise<ConfigEntry | null> {
        return this.configStorage.resolve(locationNodeId, key);
    }

    /**
     * Batch-resolve multiple config keys for a location node.
     * Returns a Map keyed by config key, with null for unresolved keys.
     */
    async resolveMany(
        locationNodeId: string,
        keys: string[],
    ): Promise<Map<string, ConfigEntry | null>> {
        const results = new Map<string, ConfigEntry | null>();

        const promises = keys.map(async (key) => {
            const entry = await this.configStorage.resolve(locationNodeId, key);
            return { key, entry };
        });

        const resolved = await Promise.all(promises);

        for (const { key, entry } of resolved) {
            results.set(key, entry);
        }

        return results;
    }

    /**
     * Build the effective configuration for a location node by merging
     * configs from all ancestors (root -> node) using inheritance rules.
     *
     * More specific (deeper) values override less specific (shallower) ones,
     * unless `inheritFromParent` is explicitly set to false at a higher level.
     */
    async getEffectiveConfig(
        locationNodeId: string,
    ): Promise<Map<string, ConfigEntry>> {
        const effectiveConfig = new Map<string, ConfigEntry>();

        // Get ancestor chain from root to current node (inclusive)
        const ancestors = await this.locationStorage.getAncestors(locationNodeId);

        // Process from root (least specific) to leaf (most specific).
        // getAncestors returns from direct parent upward, so we reverse
        // and then append the target node.
        const hierarchy = [...ancestors].reverse();

        // Collect config entries for each level, starting from the root
        // First: global config (locationNodeId = null)
        const globalEntries = await this.configStorage.getAll(null);
        for (const entry of globalEntries) {
            effectiveConfig.set(entry.key, entry);
        }

        // Walk each ancestor from root toward the target
        for (const ancestor of hierarchy) {
            const entries = await this.configStorage.getAll(ancestor.id);
            for (const entry of entries) {
                if (entry.inheritFromParent) {
                    // Only override if no more-specific value exists,
                    // but since we walk root-first, we always set
                    effectiveConfig.set(entry.key, entry);
                } else {
                    // Non-inheriting: this value is authoritative at this level
                    effectiveConfig.set(entry.key, entry);
                }
            }
        }

        // Finally, apply config at the target node itself
        const nodeEntries = await this.configStorage.getAll(locationNodeId);
        for (const entry of nodeEntries) {
            effectiveConfig.set(entry.key, entry);
        }

        return effectiveConfig;
    }

    // ─── Private Helpers ─────────────────────────────────────────

    private validateKey(key: string): void {
        if (!key || !CONFIG_KEY_PATTERN.test(key)) {
            throw new ConfigKeyInvalidError({
                key,
                reason:
                    'Key must consist of alphanumeric characters, dots, and underscores only',
            });
        }
    }
}
