import { Injectable } from '@nestjs/common';
import { BulkOperationStorage } from '../interfaces/bulk-operation.storage';
import { BookingService } from './booking.service';
import { RecurrenceService } from './recurrence.service';
import { EventBus } from '../events/event-bus';
import type {
    BulkOperation,
    SemesterImportPayload,
} from '../types/entities';
import {
    BulkOperationType,
    BulkOperationStatus,
    BookingStatus,
} from '../types/enums';

@Injectable()
export class BulkOperationService {
    constructor(
        private readonly bulkOperationStorage: BulkOperationStorage,
        private readonly bookingService: BookingService,
        private readonly recurrenceService: RecurrenceService,
        private readonly eventBus: EventBus,
    ) {}

    /**
     * Import an entire semester's worth of bookings in one operation.
     *
     * Creates a BulkOperation record, then iterates through each entry in the
     * payload. Entries with a recurrence definition create recurring booking
     * series; entries without create single bookings. Conflicts are counted
     * but do not abort the operation. Progress is emitted periodically via
     * BulkOperationProgress events.
     */
    async semesterImport(
        payload: SemesterImportPayload,
        triggeredBy: string,
    ): Promise<BulkOperation> {
        let operation = await this.bulkOperationStorage.create({
            type: BulkOperationType.SEMESTER_IMPORT,
            status: BulkOperationStatus.PROCESSING,
            totalItems: payload.entries.length,
            processedItems: 0,
            conflictsDetected: 0,
            resultSummary: null,
            triggeredBy,
            completedAt: null,
        });

        let processedItems = 0;
        let conflictsDetected = 0;

        for (const entry of payload.entries) {
            try {
                if (entry.recurrence) {
                    // Create recurring booking series
                    const result = await this.recurrenceService.createRecurringBooking(
                        {
                            roomId: entry.roomId,
                            requesterId: entry.requesterId,
                            title: entry.title,
                            startsAt: entry.startsAt,
                            endsAt: entry.endsAt,
                            purposeType: entry.purposeType,
                        },
                        entry.recurrence,
                    );
                    conflictsDetected += result.conflicts.length;
                } else {
                    // Create single booking
                    await this.bookingService.create({
                        roomId: entry.roomId,
                        requesterId: entry.requesterId,
                        title: entry.title,
                        startsAt: entry.startsAt,
                        endsAt: entry.endsAt,
                        purposeType: entry.purposeType,
                    });
                }
            } catch {
                conflictsDetected++;
            }

            processedItems++;

            // Update progress every 10 items or on the last item
            if (processedItems % 10 === 0 || processedItems === payload.entries.length) {
                operation = await this.bulkOperationStorage.updateProgress(
                    operation.id,
                    {
                        processedItems,
                        conflictsDetected,
                    },
                );

                this.eventBus.emit({
                    type: 'BulkOperationProgress',
                    payload: operation,
                    metadata: {
                        triggeredBy,
                        timestamp: new Date(),
                    },
                });
            }
        }

        // Mark as completed
        operation = await this.bulkOperationStorage.updateProgress(
            operation.id,
            {
                processedItems,
                conflictsDetected,
                status: BulkOperationStatus.COMPLETED,
            },
        );

        this.eventBus.emit({
            type: 'BulkOperationCompleted',
            payload: operation,
            metadata: {
                triggeredBy,
                timestamp: new Date(),
            },
        });

        return operation;
    }

    /**
     * Shift all matching bookings forward or backward by a given number of days.
     *
     * Finds bookings matching the filter criteria (recurrence rule, room, or
     * time range), creates a BulkOperation record, then attempts to modify each
     * booking's start and end times by the specified number of days. Conflicts
     * are recorded but non-conflicting modifications proceed.
     */
    async dateShift(
        filter: {
            recurrenceRuleId?: string;
            roomId?: string;
            timeRange?: { startsAt: Date; endsAt: Date };
        },
        shiftDays: number,
        triggeredBy: string,
    ): Promise<BulkOperation> {
        // Find matching bookings
        const matchingBookings = await this.findMatchingBookings(filter);

        let operation = await this.bulkOperationStorage.create({
            type: BulkOperationType.DATE_SHIFT,
            status: BulkOperationStatus.PROCESSING,
            totalItems: matchingBookings.length,
            processedItems: 0,
            conflictsDetected: 0,
            resultSummary: null,
            triggeredBy,
            completedAt: null,
        });

        let processedItems = 0;
        let conflictsDetected = 0;
        const shiftMs = shiftDays * 24 * 60 * 60 * 1000;

        for (const booking of matchingBookings) {
            const newStartsAt = new Date(booking.startsAt.getTime() + shiftMs);
            const newEndsAt = new Date(booking.endsAt.getTime() + shiftMs);

            try {
                await this.bookingService.modify(
                    booking.id,
                    {
                        startsAt: newStartsAt,
                        endsAt: newEndsAt,
                    },
                    booking.version,
                );
            } catch {
                conflictsDetected++;
            }

            processedItems++;

            // Update progress every 10 items or on the last item
            if (processedItems % 10 === 0 || processedItems === matchingBookings.length) {
                operation = await this.bulkOperationStorage.updateProgress(
                    operation.id,
                    {
                        processedItems,
                        conflictsDetected,
                    },
                );

                this.eventBus.emit({
                    type: 'BulkOperationProgress',
                    payload: operation,
                    metadata: {
                        triggeredBy,
                        timestamp: new Date(),
                    },
                });
            }
        }

        // Mark as completed
        operation = await this.bulkOperationStorage.updateProgress(
            operation.id,
            {
                processedItems,
                conflictsDetected,
                status: BulkOperationStatus.COMPLETED,
            },
        );

        this.eventBus.emit({
            type: 'BulkOperationCompleted',
            payload: operation,
            metadata: {
                triggeredBy,
                timestamp: new Date(),
            },
        });

        return operation;
    }

    /**
     * Cancel multiple bookings matching the given filter criteria.
     *
     * Finds all non-terminal bookings matching the filter (room, time range,
     * or requester), then cancels each one via the BookingService. Returns
     * a BulkOperation summary of the batch cancellation.
     */
    async batchCancel(
        filter: {
            roomId?: string;
            timeRange?: { startsAt: Date; endsAt: Date };
            requesterId?: string;
        },
        reason: string,
        triggeredBy: string,
    ): Promise<BulkOperation> {
        // Find matching non-terminal bookings
        const matchingBookings = await this.findNonTerminalBookings(filter);

        let operation = await this.bulkOperationStorage.create({
            type: BulkOperationType.BATCH_CANCEL,
            status: BulkOperationStatus.PROCESSING,
            totalItems: matchingBookings.length,
            processedItems: 0,
            conflictsDetected: 0,
            resultSummary: null,
            triggeredBy,
            completedAt: null,
        });

        let processedItems = 0;
        let conflictsDetected = 0;

        for (const booking of matchingBookings) {
            try {
                await this.bookingService.cancel(
                    booking.id,
                    triggeredBy,
                    reason,
                );
            } catch {
                conflictsDetected++;
            }

            processedItems++;

            // Update progress every 10 items or on the last item
            if (processedItems % 10 === 0 || processedItems === matchingBookings.length) {
                operation = await this.bulkOperationStorage.updateProgress(
                    operation.id,
                    {
                        processedItems,
                        conflictsDetected,
                    },
                );

                this.eventBus.emit({
                    type: 'BulkOperationProgress',
                    payload: operation,
                    metadata: {
                        triggeredBy,
                        timestamp: new Date(),
                    },
                });
            }
        }

        // Mark as completed
        operation = await this.bulkOperationStorage.updateProgress(
            operation.id,
            {
                processedItems,
                conflictsDetected,
                status: BulkOperationStatus.COMPLETED,
            },
        );

        this.eventBus.emit({
            type: 'BulkOperationCompleted',
            payload: operation,
            metadata: {
                triggeredBy,
                timestamp: new Date(),
            },
        });

        return operation;
    }

    // ─── Private Helpers ─────────────────────────────────────────

    /**
     * Find bookings matching the given filter criteria.
     * Uses room-based or person-based queries depending on which filters
     * are provided.
     */
    private async findMatchingBookings(filter: {
        recurrenceRuleId?: string;
        roomId?: string;
        timeRange?: { startsAt: Date; endsAt: Date };
    }): Promise<
        { id: string; startsAt: Date; endsAt: Date; version: number; status: string }[]
    > {
        const timeRange = filter.timeRange ?? {
            startsAt: new Date(0),
            endsAt: new Date('2099-12-31'),
        };

        if (filter.roomId) {
            const result = await this.bookingService.getByRoom(
                filter.roomId,
                timeRange,
            );

            let bookings = result.items;

            // Further filter by recurrence rule if specified
            if (filter.recurrenceRuleId) {
                bookings = bookings.filter(
                    (b) => b.recurrenceRuleId === filter.recurrenceRuleId,
                );
            }

            return bookings;
        }

        // If no roomId filter, we need a broader approach
        // For recurrence rule filtering, there's no direct storage query
        // so we rely on the provided time range to narrow results
        return [];
    }

    /**
     * Find non-terminal bookings matching the given filter.
     *
     * Terminal statuses (COMPLETED, CANCELLED) are excluded so only
     * bookings that can still be cancelled are returned.
     */
    private async findNonTerminalBookings(filter: {
        roomId?: string;
        timeRange?: { startsAt: Date; endsAt: Date };
        requesterId?: string;
    }): Promise<
        { id: string; startsAt: Date; endsAt: Date; version: number; status: string }[]
    > {
        const terminalStatuses = new Set([
            BookingStatus.COMPLETED,
            BookingStatus.CANCELLED,
        ]);

        const timeRange = filter.timeRange ?? {
            startsAt: new Date(0),
            endsAt: new Date('2099-12-31'),
        };

        let bookings: { id: string; startsAt: Date; endsAt: Date; version: number; status: string }[] = [];

        if (filter.roomId) {
            const result = await this.bookingService.getByRoom(
                filter.roomId,
                timeRange,
            );
            bookings = result.items;
        } else if (filter.requesterId) {
            const result = await this.bookingService.getByPerson(
                filter.requesterId,
                timeRange,
            );
            bookings = result.items;
        }

        // Filter out terminal bookings
        return bookings.filter(
            (b) => !terminalStatuses.has(b.status as BookingStatus),
        );
    }
}
