import type { RoomKitPrismaClient } from "../../types/prisma-delegates";
import type { RecurrenceRule, Booking } from "../../types/entities";
import type { RecurrenceModType } from "../../types/enums";
import { RecurrenceStorage } from "../../interfaces/recurrence.storage";

export class PrismaRecurrenceAdapter extends RecurrenceStorage {
    constructor(private readonly prisma: RoomKitPrismaClient) {
        super();
    }

    async createRule(
        data: Omit<RecurrenceRule, "id" | "createdAt" | "updatedAt">,
    ): Promise<RecurrenceRule> {
        return this.prisma.recurrenceRule.create({ data });
    }

    async getRuleById(id: string): Promise<RecurrenceRule | null> {
        return this.prisma.recurrenceRule.findUnique({ where: { id } });
    }

    async updateRule(
        id: string,
        data: Partial<Omit<RecurrenceRule, "id" | "createdAt" | "updatedAt">>,
    ): Promise<RecurrenceRule> {
        return this.prisma.recurrenceRule.update({
            where: { id },
            data,
        });
    }

    async deleteRule(id: string): Promise<void> {
        await this.prisma.recurrenceRule.delete({ where: { id } });
    }

    async getInstancesByRule(ruleId: string): Promise<Booking[]> {
        return this.prisma.booking.findMany({
            where: { recurrenceRuleId: ruleId },
        });
    }

    async deleteInstancesByRule(
        ruleId: string,
        filter?: {
            after?: Date;
            modTypeFilter?: RecurrenceModType[];
        },
    ): Promise<number> {
        // Find matching bookings for the recurrence rule
        const where: Record<string, unknown> = {
            recurrenceRuleId: ruleId,
        };

        const bookings = await this.prisma.booking.findMany({ where });

        // Apply optional filters
        let toDelete: Booking[] = bookings;

        if (filter?.after) {
            toDelete = toDelete.filter(
                (b: Booking) => b.startsAt > filter.after!,
            );
        }

        if (filter?.modTypeFilter && filter.modTypeFilter.length > 0) {
            const allowedTypes = new Set<string>(filter.modTypeFilter);
            toDelete = toDelete.filter(
                (b: Booking) =>
                    b.recurrenceModType !== null &&
                    allowedTypes.has(b.recurrenceModType),
            );
        }

        // Delete each matching booking
        for (const booking of toDelete) {
            await this.prisma.booking.delete({ where: { id: booking.id } });
        }

        return toDelete.length;
    }
}
