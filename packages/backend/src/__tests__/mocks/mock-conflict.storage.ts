import { ConflictStorage } from "../../interfaces/conflict.storage";
import type { ConflictRecord } from "../../types/entities";

export class MockConflictStorage extends ConflictStorage {
    private records = new Map<string, ConflictRecord>();

    async record(
        data: Omit<ConflictRecord, "id" | "createdAt">,
    ): Promise<ConflictRecord> {
        const entry: ConflictRecord = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date(),
        };
        this.records.set(entry.id, entry);
        return entry;
    }

    async findByBooking(bookingId: string): Promise<ConflictRecord[]> {
        const results: ConflictRecord[] = [];
        for (const record of this.records.values()) {
            if (
                record.bookingAId === bookingId ||
                record.bookingBId === bookingId
            ) {
                results.push(record);
            }
        }
        return results.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
    }

    /** Test helper: clear all stored data. */
    clear(): void {
        this.records.clear();
    }

    /** Test helper: seed a conflict record directly. */
    seed(record: ConflictRecord): void {
        this.records.set(record.id, record);
    }
}
