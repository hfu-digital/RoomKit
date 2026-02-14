import type { ExamSession } from "../types/entities";

export abstract class ExamStorage {
    abstract createSession(
        data: Omit<ExamSession, "id" | "createdAt">,
    ): Promise<ExamSession>;

    abstract findById(id: string): Promise<ExamSession | null>;

    abstract findByBooking(bookingId: string): Promise<ExamSession | null>;

    abstract findConflictingCohort(
        cohortId: string,
        timeRange: { startsAt: Date; endsAt: Date },
    ): Promise<ExamSession[]>;

    abstract delete(id: string): Promise<void>;
}
