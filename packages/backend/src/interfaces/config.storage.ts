import type { ConfigEntry } from "../types/entities";

export abstract class ConfigStorage {
    abstract set(
        locationNodeId: string | null,
        key: string,
        value: string,
    ): Promise<ConfigEntry>;

    abstract get(
        locationNodeId: string | null,
        key: string,
    ): Promise<ConfigEntry | null>;

    abstract resolve(
        locationNodeId: string,
        key: string,
    ): Promise<ConfigEntry | null>;

    abstract getAll(
        locationNodeId?: string | null,
    ): Promise<ConfigEntry[]>;

    abstract delete(
        locationNodeId: string | null,
        key: string,
    ): Promise<void>;
}
