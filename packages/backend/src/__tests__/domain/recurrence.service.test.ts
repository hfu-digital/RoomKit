import { describe, test, expect, beforeEach } from "bun:test";
import { RecurrenceService } from "../../domain/recurrence.service";
import { ConflictService } from "../../domain/conflict.service";
import { MockRecurrenceStorage } from "../mocks/mock-recurrence.storage";
import { MockBookingStorage } from "../mocks/mock-booking.storage";
import { MockRoomStorage } from "../mocks/mock-room.storage";
import { MockConflictStorage } from "../mocks/mock-conflict.storage";
import { MockLocationStorage } from "../mocks/mock-location.storage";
import {
    RecurrenceFrequency,
    RecurrenceModType,
    BookingStatus,
    LocationNodeType,
} from "../../types/enums";
import { RecurrenceConflictError } from "../../errors/roomkit.error";
import type { Room, LocationNode, RecurrenceRule, Booking } from "../../types/entities";

let recurrenceStorage: MockRecurrenceStorage;
let bookingStorage: MockBookingStorage;
let roomStorage: MockRoomStorage;
let conflictStorage: MockConflictStorage;
let locationStorage: MockLocationStorage;
let conflictService: ConflictService;
let service: RecurrenceService;

let testRoom: Room;

// ─── Helpers ───────────────────────────────────────────────────────

function seedLocationNode(): LocationNode {
    const node: LocationNode = {
        id: crypto.randomUUID(),
        parentId: null,
        type: LocationNodeType.ROOM,
        displayName: "Room",
        path: `campus/room-${crypto.randomUUID().slice(0, 8)}`,
        aliases: [],
        isActive: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    locationStorage.seed(node);
    return node;
}

// ─── Setup ─────────────────────────────────────────────────────────

beforeEach(async () => {
    recurrenceStorage = new MockRecurrenceStorage();
    bookingStorage = new MockBookingStorage();
    roomStorage = new MockRoomStorage();
    conflictStorage = new MockConflictStorage();
    locationStorage = new MockLocationStorage();

    conflictService = new ConflictService(
        bookingStorage,
        roomStorage,
        conflictStorage,
    );

    service = new RecurrenceService(
        recurrenceStorage,
        bookingStorage,
        conflictService,
    );

    const locNode = seedLocationNode();
    testRoom = await roomStorage.create({
        locationNodeId: locNode.id,
        seatedCapacity: 30,
        examCapacity: 15,
        standingCapacity: 45,
        setupBufferMinutes: 0,
        teardownBufferMinutes: 0,
        isActive: true,
        metadata: null,
    });
});

// ─── expandSeries ──────────────────────────────────────────────────

describe("RecurrenceService – expandSeries", () => {
    test("weekly on Mon/Wed for 4 weeks produces 8 dates", () => {
        // Start: Monday 2026-03-02, End: Sunday 2026-03-29 (4 full weeks)
        const dates = service.expandSeries({
            frequency: RecurrenceFrequency.WEEKLY,
            daysOfWeek: [1, 3], // Monday=1, Wednesday=3
            calendarWeeks: null,
            seriesStartsAt: new Date("2026-03-02T00:00:00.000Z"),
            seriesEndsAt: new Date("2026-03-29T23:59:59.000Z"),
            exceptionDates: [],
        });

        expect(dates).toHaveLength(8);

        // Verify all dates are Mondays or Wednesdays
        for (const date of dates) {
            const dow = date.getDay();
            expect([1, 3]).toContain(dow);
        }

        // Verify sorted order
        for (let i = 1; i < dates.length; i++) {
            expect(dates[i].getTime()).toBeGreaterThan(dates[i - 1].getTime());
        }
    });

    test("biweekly on Fri for 6 weeks produces 3 dates", () => {
        // Start: Friday 2026-03-06, End: Thursday 2026-04-16 (just before 4th Friday)
        // Week 0 (starting): Fri 2026-03-06 (included, weekIndex 0)
        // Week 1: skipped (weekIndex 1)
        // Week 2: Fri 2026-03-20 (included, weekIndex 2)
        // Week 3: skipped (weekIndex 3)
        // Week 4: Fri 2026-04-03 (included, weekIndex 4)
        // Week 5: skipped (weekIndex 5)
        // Week 6: Fri 2026-04-17 -- falls after series end, excluded
        const dates = service.expandSeries({
            frequency: RecurrenceFrequency.BIWEEKLY,
            daysOfWeek: [5], // Friday
            calendarWeeks: null,
            seriesStartsAt: new Date("2026-03-06T00:00:00.000Z"),
            seriesEndsAt: new Date("2026-04-16T23:59:59.000Z"),
            exceptionDates: [],
        });

        expect(dates).toHaveLength(3);

        // All should be Fridays
        for (const date of dates) {
            expect(date.getDay()).toBe(5);
        }
    });

    test("respects exception dates", () => {
        // Weekly on Monday for 4 weeks, but exclude 2nd Monday
        const dates = service.expandSeries({
            frequency: RecurrenceFrequency.WEEKLY,
            daysOfWeek: [1], // Monday
            calendarWeeks: null,
            seriesStartsAt: new Date("2026-03-02T00:00:00.000Z"),
            seriesEndsAt: new Date("2026-03-29T23:59:59.000Z"),
            exceptionDates: [new Date("2026-03-09T00:00:00.000Z")], // Exclude 2nd Monday
        });

        expect(dates).toHaveLength(3); // 4 - 1 excluded = 3

        // Ensure the excluded date is not present
        const dateStrings = dates.map(
            (d) =>
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        );
        expect(dateStrings).not.toContain("2026-03-09");
    });

    test("empty result when range is empty", () => {
        const dates = service.expandSeries({
            frequency: RecurrenceFrequency.WEEKLY,
            daysOfWeek: [1],
            calendarWeeks: null,
            seriesStartsAt: new Date("2026-03-02T00:00:00.000Z"),
            seriesEndsAt: new Date("2026-03-02T00:00:00.000Z"),
            exceptionDates: [],
        });

        // Only one Monday (the start date itself)
        expect(dates).toHaveLength(1);
    });

    test("custom frequency with calendarWeeks", () => {
        // Only include specific ISO calendar weeks
        // Week 10 of 2026 starts on 2026-03-02 (Monday)
        // Week 12 of 2026 starts on 2026-03-16 (Monday)
        const dates = service.expandSeries({
            frequency: RecurrenceFrequency.CUSTOM,
            daysOfWeek: [1], // Monday
            calendarWeeks: [10, 12],
            seriesStartsAt: new Date("2026-03-02T00:00:00.000Z"),
            seriesEndsAt: new Date("2026-03-29T23:59:59.000Z"),
            exceptionDates: [],
        });

        // Should only have dates in weeks 10 and 12
        expect(dates).toHaveLength(2);
    });
});

// ─── createRecurringBooking ────────────────────────────────────────

describe("RecurrenceService – createRecurringBooking", () => {
    test("happy path creates all instances", async () => {
        const template = {
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Weekly Lecture",
            startsAt: new Date("2026-03-02T10:00:00.000Z"),
            endsAt: new Date("2026-03-02T12:00:00.000Z"),
            purposeType: "LECTURE",
        };

        const rule = {
            frequency: RecurrenceFrequency.WEEKLY,
            daysOfWeek: [1], // Monday
            calendarWeeks: null,
            seriesStartsAt: new Date("2026-03-02T00:00:00.000Z"),
            seriesEndsAt: new Date("2026-03-23T23:59:59.000Z"),
            exceptionDates: [],
        };

        const result = await service.createRecurringBooking(template, rule);

        expect(result.rule).toBeDefined();
        expect(result.rule.id).toBeDefined();
        expect(result.bookings).toHaveLength(4); // 4 Mondays
        expect(result.conflicts).toHaveLength(0);

        // Each booking should reference the recurrence rule
        for (const booking of result.bookings) {
            expect(booking.recurrenceRuleId).toBe(result.rule.id);
            expect(booking.recurrenceModType).toBe(RecurrenceModType.ORIGINAL);
        }
    });

    test("partial conflicts returns error info for conflicting dates", async () => {
        // Pre-seed a booking that occupies one of the recurring slots
        const conflictDate = new Date("2026-03-09T10:00:00.000Z");
        const conflictEnd = new Date("2026-03-09T12:00:00.000Z");

        await bookingStorage.createWithConflictCheck(
            {
                roomId: testRoom.id,
                requesterId: "other-user",
                onBehalfOfId: null,
                title: "Blocking Booking",
                description: null,
                startsAt: conflictDate,
                endsAt: conflictEnd,
                status: BookingStatus.REQUESTED,
                priority: 50,
                purposeType: "SEMINAR",
                idempotencyKey: null,
                recurrenceRuleId: null,
                recurrenceModType: null,
                metadata: null,
            },
            { checkPartitions: false, checkBuffers: false },
        );

        const template = {
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Weekly Lecture",
            startsAt: new Date("2026-03-02T10:00:00.000Z"),
            endsAt: new Date("2026-03-02T12:00:00.000Z"),
            purposeType: "LECTURE",
        };

        const rule = {
            frequency: RecurrenceFrequency.WEEKLY,
            daysOfWeek: [1],
            calendarWeeks: null,
            seriesStartsAt: new Date("2026-03-02T00:00:00.000Z"),
            seriesEndsAt: new Date("2026-03-23T23:59:59.000Z"),
            exceptionDates: [],
        };

        const result = await service.createRecurringBooking(template, rule);

        // 3 out of 4 should succeed, 1 conflict
        expect(result.bookings).toHaveLength(3);
        expect(result.conflicts).toHaveLength(1);
    });

    test("each booking gets the correct time-of-day from template", async () => {
        const template = {
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Morning Class",
            startsAt: new Date("2026-03-02T09:30:00.000Z"),
            endsAt: new Date("2026-03-02T11:00:00.000Z"),
            purposeType: "LECTURE",
        };

        const rule = {
            frequency: RecurrenceFrequency.WEEKLY,
            daysOfWeek: [1],
            calendarWeeks: null,
            seriesStartsAt: new Date("2026-03-02T00:00:00.000Z"),
            seriesEndsAt: new Date("2026-03-16T23:59:59.000Z"),
            exceptionDates: [],
        };

        const result = await service.createRecurringBooking(template, rule);

        for (const booking of result.bookings) {
            expect(booking.startsAt.getUTCHours()).toBe(9);
            expect(booking.startsAt.getUTCMinutes()).toBe(30);
            expect(booking.endsAt.getUTCHours()).toBe(11);
            expect(booking.endsAt.getUTCMinutes()).toBe(0);
        }
    });
});

// ─── modifySingle ──────────────────────────────────────────────────

describe("RecurrenceService – modifySingle", () => {
    test("marks booking as modified (detaches from series pattern)", async () => {
        const template = {
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Weekly Lecture",
            startsAt: new Date("2026-03-02T10:00:00.000Z"),
            endsAt: new Date("2026-03-02T12:00:00.000Z"),
            purposeType: "LECTURE",
        };

        const rule = {
            frequency: RecurrenceFrequency.WEEKLY,
            daysOfWeek: [1],
            calendarWeeks: null,
            seriesStartsAt: new Date("2026-03-02T00:00:00.000Z"),
            seriesEndsAt: new Date("2026-03-23T23:59:59.000Z"),
            exceptionDates: [],
        };

        const result = await service.createRecurringBooking(template, rule);
        const firstBooking = result.bookings[0];

        const modified = await service.modifySingle(
            firstBooking.id,
            { title: "Special One-Off" },
            firstBooking.version,
        );

        expect(modified.title).toBe("Special One-Off");
        expect(modified.recurrenceModType).toBe(RecurrenceModType.MODIFIED);
    });

    test("conflict check on time change for single instance", async () => {
        // Create a second room for the conflicting booking
        const locNode2 = seedLocationNode();
        const room2 = await roomStorage.create({
            locationNodeId: locNode2.id,
            seatedCapacity: 30,
            examCapacity: 15,
            standingCapacity: 45,
            setupBufferMinutes: 0,
            teardownBufferMinutes: 0,
            isActive: true,
            metadata: null,
        });

        const template = {
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Weekly Lecture",
            startsAt: new Date("2026-03-02T10:00:00.000Z"),
            endsAt: new Date("2026-03-02T12:00:00.000Z"),
            purposeType: "LECTURE",
        };

        const rule = {
            frequency: RecurrenceFrequency.WEEKLY,
            daysOfWeek: [1],
            calendarWeeks: null,
            seriesStartsAt: new Date("2026-03-02T00:00:00.000Z"),
            seriesEndsAt: new Date("2026-03-23T23:59:59.000Z"),
            exceptionDates: [],
        };

        const result = await service.createRecurringBooking(template, rule);
        const firstBooking = result.bookings[0];

        // Create a blocking booking at a different time in the same room
        await bookingStorage.createWithConflictCheck(
            {
                roomId: testRoom.id,
                requesterId: "other-user",
                onBehalfOfId: null,
                title: "Blocker",
                description: null,
                startsAt: new Date("2026-03-02T14:00:00.000Z"),
                endsAt: new Date("2026-03-02T16:00:00.000Z"),
                status: BookingStatus.REQUESTED,
                priority: 50,
                purposeType: "SEMINAR",
                idempotencyKey: null,
                recurrenceRuleId: null,
                recurrenceModType: null,
                metadata: null,
            },
            { checkPartitions: false, checkBuffers: false },
        );

        // Try to move the first booking's time to overlap with the blocker
        await expect(
            service.modifySingle(
                firstBooking.id,
                {
                    startsAt: new Date("2026-03-02T14:30:00.000Z"),
                    endsAt: new Date("2026-03-02T16:30:00.000Z"),
                },
                firstBooking.version,
            ),
        ).rejects.toThrow(RecurrenceConflictError);
    });

    test("throws error for non-existent booking", async () => {
        await expect(
            service.modifySingle(
                "non-existent",
                { title: "Should fail" },
                1,
            ),
        ).rejects.toThrow();
    });
});

// ─── modifyAll ─────────────────────────────────────────────────────

describe("RecurrenceService – modifyAll", () => {
    /**
     * Helper: after createRecurringBooking, seed all created bookings into the
     * MockRecurrenceStorage so that getInstancesByRule can find them.
     * (The RecurrenceService creates bookings via bookingStorage, but
     * modifyAll reads them via recurrenceStorage.getInstancesByRule.)
     */
    function syncBookingsToRecurrenceStorage(bookings: Booking[]): void {
        for (const booking of bookings) {
            recurrenceStorage.seedBooking(booking);
        }
    }

    test("re-expands series and skips modified bookings", async () => {
        const template = {
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Weekly Lecture",
            startsAt: new Date("2026-03-02T10:00:00.000Z"),
            endsAt: new Date("2026-03-02T12:00:00.000Z"),
            purposeType: "LECTURE",
        };

        const rule = {
            frequency: RecurrenceFrequency.WEEKLY,
            daysOfWeek: [1],
            calendarWeeks: null,
            seriesStartsAt: new Date("2026-03-02T00:00:00.000Z"),
            seriesEndsAt: new Date("2026-03-23T23:59:59.000Z"),
            exceptionDates: [],
        };

        const createResult = await service.createRecurringBooking(template, rule);
        expect(createResult.bookings).toHaveLength(4);

        // Sync bookings to recurrence storage for getInstancesByRule
        syncBookingsToRecurrenceStorage(createResult.bookings);

        // Mark one booking as MODIFIED so it gets skipped by modifyAll
        const firstBooking = createResult.bookings[0];
        const modifiedBooking = await service.modifySingle(
            firstBooking.id,
            { title: "Modified Single" },
            firstBooking.version,
        );

        // Update the recurrence storage copy with the modified version
        recurrenceStorage.seedBooking(modifiedBooking);

        // Now modifyAll with a title change
        const modifyResult = await service.modifyAll(
            createResult.rule.id,
            { title: "Updated Lecture Title" },
        );

        // The MODIFIED booking should be in skipped, not in bookings
        expect(modifyResult.skipped).toHaveLength(1);
        expect(modifyResult.skipped[0].id).toBe(firstBooking.id);

        // The recreated bookings should have the new title
        for (const booking of modifyResult.bookings) {
            expect(booking.title).toBe("Updated Lecture Title");
            expect(booking.recurrenceModType).toBe(RecurrenceModType.ORIGINAL);
        }
    });

    test("throws error for non-existent rule", async () => {
        await expect(
            service.modifyAll("non-existent-rule", { title: "Nothing" }),
        ).rejects.toThrow();
    });

    test("re-creates bookings with updated times", async () => {
        const template = {
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Weekly Lecture",
            startsAt: new Date("2026-03-02T10:00:00.000Z"),
            endsAt: new Date("2026-03-02T12:00:00.000Z"),
            purposeType: "LECTURE",
        };

        const rule = {
            frequency: RecurrenceFrequency.WEEKLY,
            daysOfWeek: [1],
            calendarWeeks: null,
            seriesStartsAt: new Date("2026-03-02T00:00:00.000Z"),
            seriesEndsAt: new Date("2026-03-16T23:59:59.000Z"),
            exceptionDates: [],
        };

        const createResult = await service.createRecurringBooking(template, rule);
        expect(createResult.bookings).toHaveLength(3);

        // Sync bookings to recurrence storage
        syncBookingsToRecurrenceStorage(createResult.bookings);

        // ModifyAll with new start/end times
        const modifyResult = await service.modifyAll(
            createResult.rule.id,
            {
                startsAt: new Date("2026-03-02T14:00:00.000Z"),
                endsAt: new Date("2026-03-02T16:00:00.000Z"),
            },
        );

        // Verify new time slots
        for (const booking of modifyResult.bookings) {
            expect(booking.startsAt.getUTCHours()).toBe(14);
            expect(booking.endsAt.getUTCHours()).toBe(16);
        }
    });
});
