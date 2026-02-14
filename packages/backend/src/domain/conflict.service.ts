import { Injectable } from '@nestjs/common';
import { BookingStorage } from '../interfaces/booking.storage';
import { RoomStorage } from '../interfaces/room.storage';
import { ConflictStorage } from '../interfaces/conflict.storage';
import type {
    ConflictCheckResult,
    AlternativeSuggestion,
    ConflictResolution,
    Booking,
    ConflictRecord,
} from '../types/entities';

@Injectable()
export class ConflictService {
    constructor(
        private readonly bookingStorage: BookingStorage,
        private readonly roomStorage: RoomStorage,
        private readonly conflictStorage: ConflictStorage,
    ) {}

    /**
     * Check for booking conflicts in the given room and time range.
     * Examines both direct overlaps and partition-level overlaps
     * (parent/child room relationships).
     */
    async checkConflicts(
        roomId: string,
        startsAt: Date,
        endsAt: Date,
        excludeBookingId?: string,
    ): Promise<ConflictCheckResult> {
        const directConflicts = await this.bookingStorage.findOverlapping(
            roomId,
            startsAt,
            endsAt,
            excludeBookingId,
        );

        const partitionTree = await this.roomStorage.getPartitionTree(roomId);
        const partitionConflicts: { roomId: string; booking: Booking }[] = [];

        for (const partition of partitionTree) {
            // Determine the related room: if this room is the parent,
            // check the child; if this room is the child, check the parent.
            const relatedRoomId =
                partition.parentRoomId === roomId
                    ? partition.childRoomId
                    : partition.parentRoomId;

            const overlaps = await this.bookingStorage.findOverlapping(
                relatedRoomId,
                startsAt,
                endsAt,
                excludeBookingId,
            );

            for (const booking of overlaps) {
                partitionConflicts.push({
                    roomId: relatedRoomId,
                    booking,
                });
            }
        }

        return {
            hasConflict: directConflicts.length > 0 || partitionConflicts.length > 0,
            directConflicts,
            partitionConflicts,
        };
    }

    /**
     * Suggest alternative booking options when a conflict is detected.
     * Returns a scored list combining same-room-different-time slots and
     * different-room-same-time candidates, sorted by relevance.
     */
    async suggestAlternatives(
        roomId: string,
        startsAt: Date,
        endsAt: Date,
        filter?: { minCapacity?: number; equipment?: string[] },
    ): Promise<AlternativeSuggestion[]> {
        const suggestions: AlternativeSuggestion[] = [];
        const durationMs = endsAt.getTime() - startsAt.getTime();

        // ── Same room, different time ────────────────────────────
        // Scan forward in 30-minute increments for up to 7 days
        const room = await this.roomStorage.findById(roomId);
        const INCREMENT_MS = 30 * 60 * 1000;
        const MAX_SCAN_MS = 7 * 24 * 60 * 60 * 1000;
        const scanEnd = new Date(startsAt.getTime() + MAX_SCAN_MS);
        let slotsFound = 0;
        let candidateStart = new Date(startsAt.getTime() + INCREMENT_MS);

        while (slotsFound < 3 && candidateStart.getTime() < scanEnd.getTime()) {
            const candidateEnd = new Date(candidateStart.getTime() + durationMs);

            const overlaps = await this.bookingStorage.findOverlapping(
                roomId,
                candidateStart,
                candidateEnd,
            );

            if (overlaps.length === 0) {
                suggestions.push({
                    type: 'same_room_different_time',
                    room: room,
                    startsAt: candidateStart,
                    endsAt: candidateEnd,
                    score: 1.0,
                });
                slotsFound++;
            }

            candidateStart = new Date(candidateStart.getTime() + INCREMENT_MS);
        }

        // ── Different room, same time ────────────────────────────
        const candidateRooms = await this.roomStorage.findByCompoundFilter({
            minCapacity: filter?.minCapacity,
            capacityType: 'seated',
            equipment: filter?.equipment,
            isActive: true,
        });

        const originalRoom = room;

        for (const candidate of candidateRooms) {
            if (candidate.id === roomId) {
                continue;
            }

            const overlaps = await this.bookingStorage.findOverlapping(
                candidate.id,
                startsAt,
                endsAt,
            );

            if (overlaps.length === 0) {
                // Score by capacity similarity: closer capacity = higher score (0.5 - 0.9)
                const capacityScore = this.computeCapacityScore(
                    originalRoom?.seatedCapacity ?? 0,
                    candidate.seatedCapacity,
                );

                suggestions.push({
                    type: 'different_room_same_time',
                    room: candidate,
                    startsAt,
                    endsAt,
                    score: capacityScore,
                });
            }
        }

        // Sort: same_room_different_time first (score 1.0), then by score descending
        suggestions.sort((a, b) => b.score - a.score);

        return suggestions;
    }

    /**
     * Resolve a conflict between an existing booking and a new booking request
     * based on priority. Higher priority wins; ties go to the existing booking.
     */
    resolveByPriority(
        existingBooking: Booking,
        newBooking: { priority: number; requesterId: string },
    ): ConflictResolution {
        if (newBooking.priority > existingBooking.priority) {
            return {
                winner: 'new',
                action: 'displace_existing',
                alternatives: [],
            };
        }

        return {
            winner: 'existing',
            action: 'reject_new',
            alternatives: [],
        };
    }

    /**
     * Persist a conflict resolution record.
     */
    async recordResolution(
        data: Omit<ConflictRecord, 'id' | 'createdAt'>,
    ): Promise<ConflictRecord> {
        return this.conflictStorage.record(data);
    }

    // ─── Private Helpers ─────────────────────────────────────────

    /**
     * Compute a capacity similarity score between 0.5 and 0.9.
     * A perfect match yields 0.9; larger divergence trends toward 0.5.
     */
    private computeCapacityScore(
        requiredCapacity: number,
        candidateCapacity: number,
    ): number {
        if (requiredCapacity === 0) {
            return 0.7;
        }

        const ratio = Math.min(requiredCapacity, candidateCapacity) /
            Math.max(requiredCapacity, candidateCapacity);

        // Map ratio (0..1) to score range (0.5..0.9)
        return 0.5 + ratio * 0.4;
    }
}
