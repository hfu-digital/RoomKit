import type { BlackoutWindow } from "../types/entities";

export abstract class BlackoutStorage {
    /** Keyed by requested scope ID, including inherited ancestor blackouts. */
    findActiveForScopes?(locationNodeIds: string[], timeRange: { startsAt: Date; endsAt: Date }): Promise<Record<string, BlackoutWindow[]>>;

    abstract create(
        data: Omit<BlackoutWindow, "id" | "createdAt">,
    ): Promise<BlackoutWindow>;

    abstract findActiveForScope(
        locationNodeId: string,
        timeRange: { startsAt: Date; endsAt: Date },
    ): Promise<BlackoutWindow[]>;

    abstract findById(id: string): Promise<BlackoutWindow | null>;

    abstract delete(id: string): Promise<void>;
}
