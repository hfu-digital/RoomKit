import { RecurrenceStorage } from "../../interfaces/recurrence.storage";
import type { RecurrenceRule, Booking } from "../../types/entities";
import type { RecurrenceModType } from "../../types/enums";

export class MockRecurrenceStorage extends RecurrenceStorage {
    private rules = new Map<string, RecurrenceRule>();
    private bookings = new Map<string, Booking>();

    async createRule(
        data: Omit<RecurrenceRule, "id" | "createdAt" | "updatedAt">,
    ): Promise<RecurrenceRule> {
        const now = new Date();
        const rule: RecurrenceRule = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        };
        this.rules.set(rule.id, rule);
        return rule;
    }

    async getRuleById(id: string): Promise<RecurrenceRule | null> {
        return this.rules.get(id) ?? null;
    }

    async updateRule(
        id: string,
        data: Partial<Omit<RecurrenceRule, "id" | "createdAt" | "updatedAt">>,
    ): Promise<RecurrenceRule> {
        const existing = this.rules.get(id);
        if (!existing) {
            throw new Error(`RecurrenceRule not found: ${id}`);
        }
        const updated: RecurrenceRule = {
            ...existing,
            ...data,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: new Date(),
        };
        this.rules.set(id, updated);
        return updated;
    }

    async deleteRule(id: string): Promise<void> {
        this.rules.delete(id);
    }

    async getInstancesByRule(ruleId: string): Promise<Booking[]> {
        const instances: Booking[] = [];
        for (const booking of this.bookings.values()) {
            if (booking.recurrenceRuleId === ruleId) {
                instances.push(booking);
            }
        }
        return instances.sort(
            (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
        );
    }

    async deleteInstancesByRule(
        ruleId: string,
        filter?: {
            after?: Date;
            modTypeFilter?: RecurrenceModType[];
        },
    ): Promise<number> {
        let deleted = 0;
        for (const [key, booking] of this.bookings.entries()) {
            if (booking.recurrenceRuleId !== ruleId) continue;

            if (filter?.after && booking.startsAt <= filter.after) {
                continue;
            }

            if (
                filter?.modTypeFilter &&
                filter.modTypeFilter.length > 0 &&
                booking.recurrenceModType !== null &&
                !filter.modTypeFilter.includes(booking.recurrenceModType)
            ) {
                continue;
            }

            this.bookings.delete(key);
            deleted++;
        }
        return deleted;
    }

    /** Test helper: clear all stored data. */
    clear(): void {
        this.rules.clear();
        this.bookings.clear();
    }

    /** Test helper: seed a recurrence rule directly. */
    seedRule(rule: RecurrenceRule): void {
        this.rules.set(rule.id, rule);
    }

    /** Test helper: seed a booking instance for recurrence lookups. */
    seedBooking(booking: Booking): void {
        this.bookings.set(booking.id, booking);
    }
}
