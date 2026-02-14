import { Injectable, Inject } from '@nestjs/common';
import { BookingStorage } from '../interfaces/booking.storage';
import { LocationStorage } from '../interfaces/location.storage';
import type {
    TravelTimeValidationResult,
    TravelTimeViolation,
} from '../types/entities';
import { LocationNodeType } from '../types/enums';

@Injectable()
export class TravelTimeService {
    constructor(
        @Inject('TRAVEL_TIME_MATRIX')
        private readonly travelTimeMatrix: Record<string, number>,
        private readonly bookingStorage: BookingStorage,
        private readonly locationStorage: LocationStorage,
    ) {}

    /**
     * Validate that a person can physically travel between all their bookings
     * on the same day as the proposed booking.
     *
     * Inserts the proposed booking into the person's existing schedule for that
     * day, then checks each adjacent pair. If two consecutive bookings are at
     * different campuses, the gap between them must be at least as long as the
     * travel time in the matrix. Any shortfall is recorded as a violation.
     */
    async validatePersonSchedule(
        personId: string,
        proposedBooking: {
            roomId: string;
            startsAt: Date;
            endsAt: Date;
        },
    ): Promise<TravelTimeValidationResult> {
        // Define the day boundaries for the proposed booking
        const dayStart = new Date(proposedBooking.startsAt);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(proposedBooking.startsAt);
        dayEnd.setHours(23, 59, 59, 999);

        // Get all confirmed bookings for the person on the same day
        const result = await this.bookingStorage.findByPerson(
            personId,
            { startsAt: dayStart, endsAt: dayEnd },
        );

        const existingBookings = result.items;

        // Build combined schedule: existing bookings + proposed, sorted by start time
        const schedule = [
            ...existingBookings.map((b) => ({
                bookingId: b.id,
                roomId: b.roomId,
                startsAt: b.startsAt,
                endsAt: b.endsAt,
            })),
            {
                bookingId: 'proposed',
                roomId: proposedBooking.roomId,
                startsAt: proposedBooking.startsAt,
                endsAt: proposedBooking.endsAt,
            },
        ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

        const violations: TravelTimeViolation[] = [];

        // Check each adjacent pair
        for (let i = 0; i < schedule.length - 1; i++) {
            const current = schedule[i]!;
            const next = schedule[i + 1]!;

            // Resolve both rooms to their campus
            const currentCampus = await this.resolveCampus(current.roomId);
            const nextCampus = await this.resolveCampus(next.roomId);

            // If same campus or either campus is unresolvable, no travel time needed
            if (!currentCampus || !nextCampus) {
                continue;
            }
            if (currentCampus.id === nextCampus.id) {
                continue;
            }

            // Look up travel time between campuses
            const requiredMinutes = this.lookupTravelTime(
                currentCampus.id,
                nextCampus.id,
            );
            if (requiredMinutes === null) {
                // No travel time data available; skip check
                continue;
            }

            // Calculate the available gap in minutes
            const gapMs = next.startsAt.getTime() - current.endsAt.getTime();
            const availableMinutes = gapMs / (60 * 1000);

            if (availableMinutes < requiredMinutes) {
                // Determine which booking ID is the conflicting one
                // (the one that is NOT the proposed booking)
                const conflictingBookingId =
                    current.bookingId === 'proposed'
                        ? next.bookingId
                        : current.bookingId;

                violations.push({
                    fromCampus: currentCampus.displayName,
                    toCampus: nextCampus.displayName,
                    requiredMinutes,
                    availableMinutes,
                    conflictingBookingId,
                });
            }
        }

        return {
            valid: violations.length === 0,
            violations,
        };
    }

    /**
     * Get the travel time in minutes between two locations.
     *
     * Resolves both locations to their campus-type ancestor, then looks up
     * the travel time in the matrix. Returns null if no travel time data
     * is available for the campus pair.
     */
    async getTravelTime(
        fromLocationId: string,
        toLocationId: string,
    ): Promise<number | null> {
        const fromCampus = await this.resolveCampus(fromLocationId);
        const toCampus = await this.resolveCampus(toLocationId);

        if (!fromCampus || !toCampus) {
            return null;
        }

        return this.lookupTravelTime(fromCampus.id, toCampus.id);
    }

    // ─── Private Helpers ─────────────────────────────────────────

    /**
     * Walk up the location tree from the given node to find the nearest
     * ancestor of type CAMPUS.
     */
    private async resolveCampus(
        locationIdOrRoomId: string,
    ): Promise<{ id: string; displayName: string } | null> {
        // First check if the location node itself is a campus
        const node = await this.locationStorage.getById(locationIdOrRoomId);
        if (!node) {
            return null;
        }
        if (node.type === LocationNodeType.CAMPUS) {
            return { id: node.id, displayName: node.displayName };
        }

        // Walk up ancestors
        const ancestors = await this.locationStorage.getAncestors(
            locationIdOrRoomId,
        );
        for (const ancestor of ancestors) {
            if (ancestor.type === LocationNodeType.CAMPUS) {
                return { id: ancestor.id, displayName: ancestor.displayName };
            }
        }

        return null;
    }

    /**
     * Look up travel time between two campus IDs in the matrix.
     * Tries both key orderings ('a|b' and 'b|a').
     */
    private lookupTravelTime(
        campusAId: string,
        campusBId: string,
    ): number | null {
        const keyAB = `${campusAId}|${campusBId}`;
        if (this.travelTimeMatrix[keyAB] !== undefined) {
            return this.travelTimeMatrix[keyAB];
        }

        const keyBA = `${campusBId}|${campusAId}`;
        if (this.travelTimeMatrix[keyBA] !== undefined) {
            return this.travelTimeMatrix[keyBA];
        }

        return null;
    }
}
