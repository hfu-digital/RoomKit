import { Injectable } from '@nestjs/common';
import { RoomStorage } from '../interfaces/room.storage';
import { BookingStorage } from '../interfaces/booking.storage';
import { BlackoutStorage } from '../interfaces/blackout.storage';
import { ConfigService } from './config.service';
import type {
    AvailabilityFilter,
    AvailabilityResult,
    AvailabilityResultItem,
    TimeSlot,
    Room,
    RoomEquipment,
    RoomAccessibility,
    OperatingHours,
    Pagination,
} from '../types/entities';

@Injectable()
export class AvailabilityService {
    constructor(
        private readonly roomStorage: RoomStorage,
        private readonly bookingStorage: BookingStorage,
        private readonly blackoutStorage: BlackoutStorage,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Search for available rooms matching the given filters.
     *
     * Candidates are filtered by capacity, equipment, accessibility, and
     * location scope. Each candidate is then checked for overlapping bookings
     * and active blackout windows during the requested time range. Surviving
     * rooms are scored by capacity fit and equipment match, then sorted by
     * score descending. Cursor-based pagination is applied using the room ID
     * as the cursor.
     */
    async search(
        filters: AvailabilityFilter,
        pagination: Pagination,
    ): Promise<AvailabilityResult> {
        // Query candidate rooms by compound filter
        const candidateRooms = await this.roomStorage.findByCompoundFilter({
            minCapacity: filters.minCapacity,
            capacityType: filters.capacityType,
            equipment: filters.requiredEquipment,
            accessibility: filters.requiredAccessibility,
            locationScope: filters.locationScope,
            isActive: true,
        });

        const availableItems: AvailabilityResultItem[] = [];

        for (const room of candidateRooms) {
            // Skip explicitly excluded rooms
            if (filters.excludeRoomIds?.includes(room.id)) {
                continue;
            }

            // Check for overlapping bookings
            const overlappingBookings = await this.bookingStorage.findOverlapping(
                room.id,
                filters.timeRange.startsAt,
                filters.timeRange.endsAt,
            );
            if (overlappingBookings.length > 0) {
                continue;
            }

            // Check for active blackout windows
            const blackouts = await this.blackoutStorage.findActiveForScope(
                room.locationNodeId,
                {
                    startsAt: filters.timeRange.startsAt,
                    endsAt: filters.timeRange.endsAt,
                },
            );
            if (blackouts.length > 0) {
                continue;
            }

            // Load full room details with equipment and accessibility
            const roomWithDetails = await this.roomStorage.getWithEquipment(room.id);
            if (!roomWithDetails) {
                continue;
            }

            // Score the room
            const score = this.scoreRoom(
                roomWithDetails,
                roomWithDetails.equipment,
                filters.minCapacity,
                filters.capacityType,
                filters.requiredEquipment,
            );

            availableItems.push({
                room: roomWithDetails,
                score,
            });
        }

        // Sort by score descending
        availableItems.sort((a, b) => b.score - a.score);

        // Apply cursor-based pagination using room ID
        const totalMatching = availableItems.length;
        let startIndex = 0;

        if (pagination.cursor) {
            const cursorIndex = availableItems.findIndex(
                (item) => item.room.id === pagination.cursor,
            );
            if (cursorIndex !== -1) {
                startIndex = cursorIndex + 1;
            }
        }

        const pageItems = availableItems.slice(
            startIndex,
            startIndex + pagination.limit,
        );

        const nextCursor =
            startIndex + pagination.limit < totalMatching
                ? pageItems[pageItems.length - 1]?.room.id
                : undefined;

        return {
            items: pageItems,
            nextCursor,
            totalMatching,
        };
    }

    /**
     * Find the next available time slots for a specific room.
     *
     * Scans forward from `after` in 30-minute increments, checking each
     * candidate slot for overlapping bookings, blackouts, and operating hours
     * compliance. Collects up to `limit` valid slots, stopping after 14 days
     * to prevent infinite loops.
     */
    async findNextAvailable(
        roomId: string,
        after: Date,
        duration: number,
        limit: number,
    ): Promise<TimeSlot[]> {
        const slots: TimeSlot[] = [];
        const INCREMENT_MS = 30 * 60 * 1000;
        const MAX_SCAN_MS = 14 * 24 * 60 * 60 * 1000;
        const scanEnd = new Date(after.getTime() + MAX_SCAN_MS);
        const durationMs = duration * 60 * 1000;

        // Load room details to find operating hours
        const room = await this.roomStorage.findById(roomId);
        if (!room) {
            return [];
        }

        const operatingHours = await this.roomStorage.getOperatingHours(
            room.locationNodeId,
        );

        let candidateStart = new Date(after.getTime());

        while (
            slots.length < limit &&
            candidateStart.getTime() < scanEnd.getTime()
        ) {
            const candidateEnd = new Date(candidateStart.getTime() + durationMs);

            const isValid = await this.isSlotAvailable(
                roomId,
                room.locationNodeId,
                candidateStart,
                candidateEnd,
                operatingHours,
            );

            if (isValid) {
                slots.push({
                    startsAt: new Date(candidateStart),
                    endsAt: new Date(candidateEnd),
                });
            }

            candidateStart = new Date(candidateStart.getTime() + INCREMENT_MS);
        }

        return slots;
    }

    // ─── Private Helpers ─────────────────────────────────────────

    /**
     * Score a room based on capacity fit and equipment match.
     *
     * - Exact capacity match to minCapacity yields 1.0
     * - Oversized rooms get lower score: 1.0 - (excess / total) * 0.3
     * - Each matching required equipment tag adds +0.1
     */
    private scoreRoom(
        room: Room,
        equipment: RoomEquipment[],
        minCapacity?: number,
        capacityType?: 'seated' | 'exam' | 'standing',
        requiredEquipment?: string[],
    ): number {
        let score = 1.0;

        if (minCapacity !== undefined && minCapacity > 0) {
            const effectiveCapacity = this.getCapacity(room, capacityType);
            const excess = effectiveCapacity - minCapacity;

            if (excess > 0) {
                score = 1.0 - (excess / effectiveCapacity) * 0.3;
            }
            // exact match stays at 1.0; undersized rooms shouldn't reach here
            // since findByCompoundFilter already filters by minCapacity
        }

        // Equipment match bonus
        if (requiredEquipment && requiredEquipment.length > 0) {
            const equipmentTags = new Set(equipment.map((e) => e.tag));
            for (const req of requiredEquipment) {
                if (equipmentTags.has(req)) {
                    score += 0.1;
                }
            }
        }

        return score;
    }

    /**
     * Get the relevant capacity value based on capacity type.
     */
    private getCapacity(
        room: Room,
        capacityType?: 'seated' | 'exam' | 'standing',
    ): number {
        switch (capacityType) {
            case 'exam':
                return room.examCapacity;
            case 'standing':
                return room.standingCapacity;
            case 'seated':
            default:
                return room.seatedCapacity;
        }
    }

    /**
     * Check whether a candidate slot is fully available:
     * no overlapping bookings, no blackouts, and within operating hours.
     */
    private async isSlotAvailable(
        roomId: string,
        locationNodeId: string,
        startsAt: Date,
        endsAt: Date,
        operatingHours: OperatingHours[],
    ): Promise<boolean> {
        // Check operating hours (if defined)
        if (operatingHours.length > 0) {
            if (!this.isWithinOperatingHours(startsAt, endsAt, operatingHours)) {
                return false;
            }
        }

        // Check overlapping bookings
        const overlapping = await this.bookingStorage.findOverlapping(
            roomId,
            startsAt,
            endsAt,
        );
        if (overlapping.length > 0) {
            return false;
        }

        // Check blackouts
        const blackouts = await this.blackoutStorage.findActiveForScope(
            locationNodeId,
            { startsAt, endsAt },
        );
        if (blackouts.length > 0) {
            return false;
        }

        return true;
    }

    /**
     * Check whether a time range falls entirely within the operating hours
     * for the relevant day(s) of the week.
     */
    private isWithinOperatingHours(
        startsAt: Date,
        endsAt: Date,
        operatingHours: OperatingHours[],
    ): boolean {
        const startDay = startsAt.getDay();
        const dayHours = operatingHours.filter((h) => h.dayOfWeek === startDay);

        if (dayHours.length === 0) {
            // No operating hours defined for this day means the room is closed
            return false;
        }

        // Check if the slot fits within any operating hours window for the day
        const startTimeStr = this.toTimeString(startsAt);
        const endTimeStr = this.toTimeString(endsAt);

        return dayHours.some(
            (h) => startTimeStr >= h.opensAt && endTimeStr <= h.closesAt,
        );
    }

    /**
     * Convert a Date to an HH:MM:SS string for time comparison.
     */
    private toTimeString(date: Date): string {
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }
}
