import { Injectable } from '@nestjs/common';
import { BlackoutStorage } from '../interfaces/blackout.storage';
import { BookingStorage } from '../interfaces/booking.storage';
import { LocationStorage } from '../interfaces/location.storage';
import { EventBus } from '../events/event-bus';
import type { BlackoutWindow, Booking } from '../types/entities';
import { LocationNodeType } from '../types/enums';
import { InvalidTimeRangeError } from '../errors/roomkit.error';

@Injectable()
export class BlackoutService {
    constructor(
        private readonly blackoutStorage: BlackoutStorage,
        private readonly bookingStorage: BookingStorage,
        private readonly locationStorage: LocationStorage,
        private readonly eventBus: EventBus,
    ) {}

    /**
     * Create a new blackout window.
     *
     * Validates that startsAt is before endsAt, persists the blackout via
     * storage, and emits a BlackoutCreated event.
     */
    async create(
        data: Omit<BlackoutWindow, 'id' | 'createdAt'>,
    ): Promise<BlackoutWindow> {
        if (data.startsAt >= data.endsAt) {
            throw new InvalidTimeRangeError({
                startsAt: data.startsAt.toISOString(),
                endsAt: data.endsAt.toISOString(),
                reason: 'startsAt must be before endsAt',
            });
        }

        const blackout = await this.blackoutStorage.create(data);

        this.eventBus.emit({
            type: 'BlackoutCreated',
            payload: blackout,
            metadata: {
                triggeredBy: 'system',
                timestamp: new Date(),
            },
        });

        return blackout;
    }

    /**
     * Get all active blackout windows for a location node within a time range.
     *
     * Delegates to storage which handles cascading up the location hierarchy
     * (e.g., a building-level blackout applies to all rooms within it).
     */
    async getActiveBlackouts(
        locationNodeId: string,
        timeRange: { startsAt: Date; endsAt: Date },
    ): Promise<BlackoutWindow[]> {
        return this.blackoutStorage.findActiveForScope(
            locationNodeId,
            timeRange,
        );
    }

    /**
     * Analyze the impact of a blackout window on existing bookings.
     *
     * Resolves the location node and all descendant rooms, then checks each
     * room for overlapping bookings during the blackout period. If impacted
     * bookings are found, emits a BlackoutImpactDetected event.
     */
    async analyzeImpact(blackout: BlackoutWindow): Promise<Booking[]> {
        const impactedBookings: Booking[] = [];

        // Get the location node and find all descendant rooms
        const descendantRooms = await this.resolveDescendantRooms(
            blackout.locationNodeId,
        );

        for (const roomLocationNodeId of descendantRooms) {
            const overlapping = await this.bookingStorage.findOverlapping(
                roomLocationNodeId,
                blackout.startsAt,
                blackout.endsAt,
            );
            impactedBookings.push(...overlapping);
        }

        if (impactedBookings.length > 0) {
            this.eventBus.emit({
                type: 'BlackoutImpactDetected',
                payload: {
                    blackout,
                    impactedBookings,
                },
                metadata: {
                    triggeredBy: 'system',
                    timestamp: new Date(),
                },
            });
        }

        return impactedBookings;
    }

    /**
     * Delete a blackout window by its ID.
     */
    async delete(id: string): Promise<void> {
        return this.blackoutStorage.delete(id);
    }

    // ─── Private Helpers ─────────────────────────────────────────

    /**
     * Recursively resolve all descendant room-type location node IDs
     * starting from a given location node.
     *
     * If the node itself is of type ROOM, returns just that node's ID.
     * Otherwise, walks down the tree collecting all ROOM-type descendants.
     */
    private async resolveDescendantRooms(
        locationNodeId: string,
    ): Promise<string[]> {
        const node = await this.locationStorage.getById(locationNodeId);
        if (!node) {
            return [];
        }

        if (node.type === LocationNodeType.ROOM) {
            return [node.id];
        }

        const roomIds: string[] = [];
        const children = await this.locationStorage.getChildren(locationNodeId);

        for (const child of children) {
            if (child.type === LocationNodeType.ROOM) {
                roomIds.push(child.id);
            } else {
                // Recurse into non-room children (buildings, floors, wings, etc.)
                const descendantRooms = await this.resolveDescendantRooms(
                    child.id,
                );
                roomIds.push(...descendantRooms);
            }
        }

        return roomIds;
    }
}
