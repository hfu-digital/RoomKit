import { BlackoutStorage } from "../../interfaces/blackout.storage";
import type { BlackoutWindow } from "../../types/entities";

export class MockBlackoutStorage extends BlackoutStorage {
    private windows = new Map<string, BlackoutWindow>();

    async create(
        data: Omit<BlackoutWindow, "id" | "createdAt">,
    ): Promise<BlackoutWindow> {
        const entry: BlackoutWindow = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date(),
        };
        this.windows.set(entry.id, entry);
        return entry;
    }

    async findActiveForScope(
        locationNodeId: string,
        timeRange: { startsAt: Date; endsAt: Date },
    ): Promise<BlackoutWindow[]> {
        const results: BlackoutWindow[] = [];
        for (const window of this.windows.values()) {
            if (window.locationNodeId !== locationNodeId) continue;

            // Overlap: NOT (endsAt <= startsAt OR startsAt >= endsAt)
            const overlaps =
                !(timeRange.endsAt <= window.startsAt ||
                  timeRange.startsAt >= window.endsAt);
            if (overlaps) {
                results.push(window);
            }
        }
        return results.sort(
            (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
        );
    }

    async findById(id: string): Promise<BlackoutWindow | null> {
        return this.windows.get(id) ?? null;
    }

    async delete(id: string): Promise<void> {
        this.windows.delete(id);
    }

    /** Test helper: clear all stored data. */
    clear(): void {
        this.windows.clear();
    }

    /** Test helper: seed a blackout window directly. */
    seed(window: BlackoutWindow): void {
        this.windows.set(window.id, window);
    }
}
