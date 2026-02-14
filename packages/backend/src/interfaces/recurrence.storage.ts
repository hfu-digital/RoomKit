import type { RecurrenceRule, Booking } from "../types/entities";
import type { RecurrenceModType } from "../types/enums";

export abstract class RecurrenceStorage {
    abstract createRule(
        data: Omit<RecurrenceRule, "id" | "createdAt" | "updatedAt">,
    ): Promise<RecurrenceRule>;

    abstract getRuleById(id: string): Promise<RecurrenceRule | null>;

    abstract updateRule(
        id: string,
        data: Partial<Omit<RecurrenceRule, "id" | "createdAt" | "updatedAt">>,
    ): Promise<RecurrenceRule>;

    abstract deleteRule(id: string): Promise<void>;

    abstract getInstancesByRule(ruleId: string): Promise<Booking[]>;

    abstract deleteInstancesByRule(
        ruleId: string,
        filter?: {
            after?: Date;
            modTypeFilter?: RecurrenceModType[];
        },
    ): Promise<number>;
}
