import type { BlackoutWindow } from "../types/entities";

export abstract class BlackoutStorage {
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
