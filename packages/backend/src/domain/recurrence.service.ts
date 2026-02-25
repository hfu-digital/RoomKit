import { Injectable } from '@nestjs/common';
import { RecurrenceStorage } from '../interfaces/recurrence.storage';
import { BookingStorage } from '../interfaces/booking.storage';
import { ConflictService } from './conflict.service';
import type { RecurrenceRule, Booking } from '../types/entities';
import { RecurrenceFrequency, RecurrenceModType } from '../types/enums';
import type { CreateBookingDto, UpdateBookingDto } from '../dto/booking.dto';
import { BookingNotFoundError, RecurrenceConflictError, RoomKitError } from '../errors/roomkit.error';

@Injectable()
export class RecurrenceService {
    constructor(
        private readonly recurrenceStorage: RecurrenceStorage,
        private readonly bookingStorage: BookingStorage,
        private readonly conflictService: ConflictService,
    ) {}

    /**
     * Expand a recurrence rule into a sorted array of concrete dates.
     *
     * - WEEKLY: every week on the specified daysOfWeek
     * - BIWEEKLY: every other week on the specified daysOfWeek
     * - CUSTOM: only weeks whose ISO calendar week number appears in calendarWeeks
     *
     * Dates present in exceptionDates are excluded (compared by date only).
     * All returned dates have their time component set to 00:00:00.
     */
    expandSeries(
        rule: Pick<
            RecurrenceRule,
            'frequency' | 'daysOfWeek' | 'calendarWeeks' | 'seriesStartsAt' | 'seriesEndsAt' | 'exceptionDates'
        >,
    ): Date[] {
        const dates: Date[] = [];
        const start = new Date(rule.seriesStartsAt);
        const end = new Date(rule.seriesEndsAt);

        // Build a set of exception date strings for fast lookup (YYYY-MM-DD)
        const exceptionSet = new Set(
            (rule.exceptionDates ?? []).map((d) => this.toDateString(new Date(d))),
        );

        // Normalize start to the beginning of its week (Monday = 1 in ISO)
        const cursor = this.getMonday(start);
        const calendarWeeksSet = rule.calendarWeeks
            ? new Set(rule.calendarWeeks)
            : null;

        // Track week index for biweekly counting (0-based from the start week)
        let weekIndex = 0;

        while (cursor.getTime() <= end.getTime() + 6 * 24 * 60 * 60 * 1000) {
            const isoWeek = this.getISOWeekNumber(cursor);

            const includeThisWeek = this.shouldIncludeWeek(
                rule.frequency,
                weekIndex,
                isoWeek,
                calendarWeeksSet,
            );

            if (includeThisWeek) {
                for (const dow of rule.daysOfWeek) {
                    const date = this.getDateForDayOfWeek(cursor, dow);

                    // Ensure the date falls within the series bounds
                    if (date.getTime() < this.stripTime(start).getTime()) {
                        continue;
                    }
                    if (date.getTime() > this.stripTime(end).getTime()) {
                        continue;
                    }

                    // Exclude exception dates
                    if (exceptionSet.has(this.toDateString(date))) {
                        continue;
                    }

                    dates.push(date);
                }
            }

            // Advance to next Monday
            cursor.setDate(cursor.getDate() + 7);
            weekIndex++;
        }

        // Sort chronologically
        dates.sort((a, b) => a.getTime() - b.getTime());

        return dates;
    }

    /**
     * Create a full recurring booking series from a template and rule definition.
     *
     * Creates the recurrence rule, expands it to concrete dates, then creates
     * individual bookings for each date. Conflicts are recorded but do not
     * abort the entire operation -- successfully created bookings are returned
     * alongside any conflict information.
     */
    async createRecurringBooking(
        bookingTemplate: CreateBookingDto,
        rule: Omit<RecurrenceRule, 'id' | 'createdAt' | 'updatedAt'>,
    ): Promise<{
        rule: RecurrenceRule;
        bookings: Booking[];
        conflicts: { date: Date; error: string }[];
    }> {
        const createdRule = await this.recurrenceStorage.createRule(rule);
        const dates = this.expandSeries(createdRule);

        const bookings: Booking[] = [];
        const conflicts: { date: Date; error: string }[] = [];

        // Extract time-of-day from the template
        const templateStartTime = this.extractTimeOfDay(bookingTemplate.startsAt);
        const templateEndTime = this.extractTimeOfDay(bookingTemplate.endsAt);

        for (const date of dates) {
            const startsAt = this.applyTimeOfDay(date, templateStartTime);
            const endsAt = this.applyTimeOfDay(date, templateEndTime);

            try {
                const booking = await this.bookingStorage.createWithConflictCheck(
                    {
                        roomId: bookingTemplate.roomId,
                        requesterId: bookingTemplate.requesterId,
                        onBehalfOfId: bookingTemplate.onBehalfOfId ?? null,
                        title: bookingTemplate.title,
                        description: bookingTemplate.description ?? null,
                        startsAt,
                        endsAt,
                        status: 'requested' as never,
                        priority: bookingTemplate.priority ?? 0,
                        purposeType: bookingTemplate.purposeType,
                        idempotencyKey: null,
                        recurrenceRuleId: createdRule.id,
                        recurrenceModType: RecurrenceModType.ORIGINAL,
                        metadata: bookingTemplate.metadata ?? null,
                    },
                    {
                        checkPartitions: true,
                        checkBuffers: true,
                    },
                );
                bookings.push(booking);
            } catch (err) {
                conflicts.push({
                    date,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        return { rule: createdRule, bookings, conflicts };
    }

    /**
     * Modify a single instance of a recurring booking.
     *
     * Marks the instance as MODIFIED (detaching it from the series pattern)
     * and applies the requested changes. If time or room changes are included,
     * a conflict check is performed.
     */
    async modifySingle(
        bookingId: string,
        changes: UpdateBookingDto,
        expectedVersion: number,
    ): Promise<Booking> {
        const booking = await this.bookingStorage.findById(bookingId);
        if (!booking) {
            throw new BookingNotFoundError({ bookingId });
        }

        // If time or room changed, check for conflicts
        if (
            changes.roomId !== undefined ||
            changes.startsAt !== undefined ||
            changes.endsAt !== undefined
        ) {
            const effectiveRoomId = changes.roomId ?? booking.roomId;
            const effectiveStartsAt = changes.startsAt ?? booking.startsAt;
            const effectiveEndsAt = changes.endsAt ?? booking.endsAt;

            const conflictResult = await this.conflictService.checkConflicts(
                effectiveRoomId,
                effectiveStartsAt,
                effectiveEndsAt,
                bookingId,
            );

            if (conflictResult.hasConflict) {
                throw new RecurrenceConflictError({
                    ruleId: booking.recurrenceRuleId ?? 'unknown',
                    conflictingDates: [
                        (changes.startsAt ?? booking.startsAt).toISOString(),
                    ],
                });
            }
        }

        const updated = await this.bookingStorage.updateWithVersion(
            bookingId,
            {
                ...changes,
                recurrenceModType: RecurrenceModType.MODIFIED,
            },
            expectedVersion,
        );

        return updated;
    }

    /**
     * Modify this instance and all future instances of a recurring series.
     *
     * Splits the series at the target booking's date:
     * - The original rule is truncated to end the day before the target date
     * - A new rule is created starting from the target date with changes applied
     * - All future ORIGINAL instances from the old rule are deleted
     * - New bookings are expanded from the new rule
     */
    async modifyThisAndFuture(
        bookingId: string,
        changes: UpdateBookingDto,
    ): Promise<{ newRule: RecurrenceRule; bookings: Booking[] }> {
        const targetBooking = await this.bookingStorage.findById(bookingId);
        if (!targetBooking) {
            throw new BookingNotFoundError({ bookingId });
        }
        if (!targetBooking.recurrenceRuleId) {
            throw new RoomKitError(
                'RECURRENCE_NOT_LINKED',
                `Booking ${bookingId} is not part of a recurrence series`,
                { bookingId },
            );
        }

        const originalRule = await this.recurrenceStorage.getRuleById(
            targetBooking.recurrenceRuleId,
        );
        if (!originalRule) {
            throw new RoomKitError(
                'RECURRENCE_RULE_NOT_FOUND',
                `Recurrence rule not found: ${targetBooking.recurrenceRuleId}`,
                { ruleId: targetBooking.recurrenceRuleId },
            );
        }

        // Split date: the day before the target booking's date
        const targetDate = this.stripTime(targetBooking.startsAt);
        const dayBefore = new Date(targetDate);
        dayBefore.setDate(dayBefore.getDate() - 1);

        // Truncate the original rule's end date
        await this.recurrenceStorage.updateRule(originalRule.id, {
            seriesEndsAt: dayBefore,
        });

        // Delete future ORIGINAL instances from the old rule (on or after target date)
        await this.recurrenceStorage.deleteInstancesByRule(originalRule.id, {
            after: targetDate,
            modTypeFilter: [RecurrenceModType.ORIGINAL],
        });

        // Create new rule starting from the target date
        const newRule = await this.recurrenceStorage.createRule({
            frequency: originalRule.frequency,
            daysOfWeek: originalRule.daysOfWeek,
            calendarWeeks: originalRule.calendarWeeks,
            seriesStartsAt: targetDate,
            seriesEndsAt: originalRule.seriesEndsAt,
            exceptionDates: originalRule.exceptionDates.filter(
                (d) => new Date(d).getTime() >= targetDate.getTime(),
            ),
        });

        // Expand new rule and create bookings with changes applied
        const dates = this.expandSeries(newRule);
        const bookings: Booking[] = [];

        const templateStartTime = this.extractTimeOfDay(
            changes.startsAt ?? targetBooking.startsAt,
        );
        const templateEndTime = this.extractTimeOfDay(
            changes.endsAt ?? targetBooking.endsAt,
        );

        for (const date of dates) {
            const startsAt = this.applyTimeOfDay(date, templateStartTime);
            const endsAt = this.applyTimeOfDay(date, templateEndTime);

            try {
                const booking = await this.bookingStorage.createWithConflictCheck(
                    {
                        roomId: changes.roomId ?? targetBooking.roomId,
                        requesterId: targetBooking.requesterId,
                        onBehalfOfId: changes.onBehalfOfId ?? targetBooking.onBehalfOfId,
                        title: changes.title ?? targetBooking.title,
                        description: changes.description ?? targetBooking.description,
                        startsAt,
                        endsAt,
                        status: targetBooking.status,
                        priority: changes.priority ?? targetBooking.priority,
                        purposeType: changes.purposeType ?? targetBooking.purposeType,
                        idempotencyKey: null,
                        recurrenceRuleId: newRule.id,
                        recurrenceModType: RecurrenceModType.ORIGINAL,
                        metadata: changes.metadata ?? targetBooking.metadata,
                    },
                    {
                        checkPartitions: true,
                        checkBuffers: true,
                    },
                );
                bookings.push(booking);
            } catch {
                // Skip conflicting instances during series split
            }
        }

        return { newRule, bookings };
    }

    /**
     * Modify all instances of a recurring series.
     *
     * ORIGINAL instances are deleted and re-created with the changes applied.
     * MODIFIED and DETACHED instances are left untouched and returned as
     * "skipped" so the caller knows they were not affected.
     */
    async modifyAll(
        ruleId: string,
        changes: UpdateBookingDto,
    ): Promise<{ bookings: Booking[]; skipped: Booking[] }> {
        const rule = await this.recurrenceStorage.getRuleById(ruleId);
        if (!rule) {
            throw new RoomKitError(
                'RECURRENCE_RULE_NOT_FOUND',
                `Recurrence rule not found: ${ruleId}`,
                { ruleId },
            );
        }

        const allInstances = await this.recurrenceStorage.getInstancesByRule(ruleId);

        // Separate into original (replaceable) and modified/detached (skip)
        const original = allInstances.filter(
            (b) => b.recurrenceModType === RecurrenceModType.ORIGINAL,
        );
        const skipped = allInstances.filter(
            (b) => b.recurrenceModType !== RecurrenceModType.ORIGINAL,
        );

        // Delete original instances
        await this.recurrenceStorage.deleteInstancesByRule(ruleId, {
            modTypeFilter: [RecurrenceModType.ORIGINAL],
        });

        // Update rule if changes affect the schedule
        if (changes.startsAt || changes.endsAt) {
            // If the time-of-day template changed, the rule itself doesn't change
            // but we still need to re-expand. No rule update needed for time-only changes.
        }

        // Re-expand the rule and create new bookings
        const dates = this.expandSeries(rule);
        const bookings: Booking[] = [];

        // Use the first original instance (or the rule times) as a time template
        const timeTemplate = original[0];
        const templateStartTime = this.extractTimeOfDay(
            changes.startsAt ?? timeTemplate?.startsAt ?? rule.seriesStartsAt,
        );
        const templateEndTime = this.extractTimeOfDay(
            changes.endsAt ?? timeTemplate?.endsAt ?? rule.seriesEndsAt,
        );

        for (const date of dates) {
            const startsAt = this.applyTimeOfDay(date, templateStartTime);
            const endsAt = this.applyTimeOfDay(date, templateEndTime);

            try {
                const booking = await this.bookingStorage.createWithConflictCheck(
                    {
                        roomId: changes.roomId ?? timeTemplate?.roomId ?? '',
                        requesterId: timeTemplate?.requesterId ?? '',
                        onBehalfOfId: changes.onBehalfOfId ?? timeTemplate?.onBehalfOfId ?? null,
                        title: changes.title ?? timeTemplate?.title ?? '',
                        description: changes.description ?? timeTemplate?.description ?? null,
                        startsAt,
                        endsAt,
                        status: timeTemplate?.status ?? ('requested' as never),
                        priority: changes.priority ?? timeTemplate?.priority ?? 0,
                        purposeType: changes.purposeType ?? timeTemplate?.purposeType ?? '',
                        idempotencyKey: null,
                        recurrenceRuleId: ruleId,
                        recurrenceModType: RecurrenceModType.ORIGINAL,
                        metadata: changes.metadata ?? timeTemplate?.metadata ?? null,
                    },
                    {
                        checkPartitions: true,
                        checkBuffers: true,
                    },
                );
                bookings.push(booking);
            } catch {
                // Skip conflicting instances during bulk modify
            }
        }

        return { bookings, skipped };
    }

    // ─── Private Helpers ─────────────────────────────────────────

    /**
     * Determine whether a given week should be included based on frequency.
     */
    private shouldIncludeWeek(
        frequency: RecurrenceFrequency,
        weekIndex: number,
        isoWeek: number,
        calendarWeeksSet: Set<number> | null,
    ): boolean {
        switch (frequency) {
            case RecurrenceFrequency.WEEKLY:
                return true;
            case RecurrenceFrequency.BIWEEKLY:
                return weekIndex % 2 === 0;
            case RecurrenceFrequency.CUSTOM:
                return calendarWeeksSet ? calendarWeeksSet.has(isoWeek) : false;
            default:
                return false;
        }
    }

    /**
     * Get the Monday of the week containing the given date.
     */
    private getMonday(date: Date): Date {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const dayOfWeek = d.getDay(); // 0=Sunday
        // Shift so Monday=0: (dayOfWeek + 6) % 7
        const diff = (dayOfWeek + 6) % 7;
        d.setDate(d.getDate() - diff);
        return d;
    }

    /**
     * Get the date for a specific day-of-week (0=Sunday, 1=Monday, etc.)
     * within the week starting at the given Monday.
     */
    private getDateForDayOfWeek(monday: Date, dayOfWeek: number): Date {
        const d = new Date(monday);
        // monday.getDay() should be 1 (Monday).
        // dayOfWeek 0 = Sunday => offset from Monday = 6
        // dayOfWeek 1 = Monday => offset from Monday = 0
        // dayOfWeek 2 = Tuesday => offset from Monday = 1
        // etc.
        const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        d.setDate(d.getDate() + offset);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /**
     * Get the ISO 8601 week number for a given date.
     */
    private getISOWeekNumber(date: Date): number {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday = 7
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil(
            ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
        );
    }

    /**
     * Convert a Date to a YYYY-MM-DD string for date-only comparison.
     */
    private toDateString(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /**
     * Strip the time component from a Date, returning midnight (00:00:00).
     */
    private stripTime(date: Date): Date {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /**
     * Extract hours, minutes, seconds, milliseconds from a Date.
     */
    private extractTimeOfDay(date: Date): {
        hours: number;
        minutes: number;
        seconds: number;
        milliseconds: number;
    } {
        return {
            hours: date.getHours(),
            minutes: date.getMinutes(),
            seconds: date.getSeconds(),
            milliseconds: date.getMilliseconds(),
        };
    }

    /**
     * Apply a time-of-day to a date-only Date object.
     */
    private applyTimeOfDay(
        date: Date,
        time: { hours: number; minutes: number; seconds: number; milliseconds: number },
    ): Date {
        const d = new Date(date);
        d.setHours(time.hours, time.minutes, time.seconds, time.milliseconds);
        return d;
    }
}
