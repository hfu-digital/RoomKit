import type { RoomKitPrismaClient } from "../../types/prisma-delegates";
import type { ExamSession } from "../../types/entities";
import { ExamStorage } from "../../interfaces/exam.storage";

export class PrismaExamAdapter extends ExamStorage {
    constructor(private readonly prisma: RoomKitPrismaClient) {
        super();
    }

    async createSession(
        data: Omit<ExamSession, "id" | "createdAt">,
    ): Promise<ExamSession> {
        return this.prisma.examSession.create({ data });
    }

    async findById(id: string): Promise<ExamSession | null> {
        return this.prisma.examSession.findUnique({ where: { id } });
    }

    async findByBooking(bookingId: string): Promise<ExamSession | null> {
        const results = await this.prisma.examSession.findMany({
            where: { bookingId },
        });
        return results.length > 0 ? results[0] : null;
    }

    async findConflictingCohort(
        cohortId: string,
        timeRange: { startsAt: Date; endsAt: Date },
    ): Promise<ExamSession[]> {
        // Find all exam sessions for this cohort
        const sessions = await this.prisma.examSession.findMany({
            where: { cohortId },
        });

        if (sessions.length === 0) {
            return [];
        }

        // For each session, check if its associated booking overlaps with the time range
        const conflicting: ExamSession[] = [];
        for (const session of sessions) {
            const booking = await this.prisma.booking.findUnique({
                where: { id: session.bookingId },
            });

            if (!booking) {
                continue;
            }

            // Check time overlap: booking.startsAt < timeRange.endsAt AND booking.endsAt > timeRange.startsAt
            const bookingStart =
                booking.startsAt instanceof Date
                    ? booking.startsAt
                    : new Date(booking.startsAt);
            const bookingEnd =
                booking.endsAt instanceof Date
                    ? booking.endsAt
                    : new Date(booking.endsAt);

            if (
                bookingStart < timeRange.endsAt &&
                bookingEnd > timeRange.startsAt
            ) {
                conflicting.push(session);
            }
        }

        return conflicting;
    }

    async delete(id: string): Promise<void> {
        await this.prisma.examSession.delete({ where: { id } });
    }
}
