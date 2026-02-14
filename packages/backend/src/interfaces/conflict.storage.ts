import type { ConflictRecord } from "../types/entities";

export abstract class ConflictStorage {
    abstract record(
        data: Omit<ConflictRecord, "id" | "createdAt">,
    ): Promise<ConflictRecord>;

    abstract findByBooking(bookingId: string): Promise<ConflictRecord[]>;
}
