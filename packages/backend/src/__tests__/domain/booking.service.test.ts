import { describe, test, expect, beforeEach } from "bun:test";
import { BookingService } from "../../domain/booking.service";
import { ConflictService } from "../../domain/conflict.service";
import { PriorityService } from "../../domain/priority.service";
import { BookingStateMachine } from "../../domain/state-machine";
import { EventBus } from "../../events/event-bus";
import { MockBookingStorage } from "../mocks/mock-booking.storage";
import { MockRoomStorage } from "../mocks/mock-room.storage";
import { MockLocationStorage } from "../mocks/mock-location.storage";
import { MockConflictStorage } from "../mocks/mock-conflict.storage";
import { MockPriorityStorage } from "../mocks/mock-priority.storage";
import { BookingStatus, LocationNodeType } from "../../types/enums";
import {
    BookingConflictError,
    InvalidStateTransitionError,
    StaleVersionError,
    BookingNotFoundError,
    RoomNotFoundError,
} from "../../errors/roomkit.error";
import type { LocationNode, Room } from "../../types/entities";

let bookingStorage: MockBookingStorage;
let roomStorage: MockRoomStorage;
let locationStorage: MockLocationStorage;
let conflictStorage: MockConflictStorage;
let priorityStorage: MockPriorityStorage;
let conflictService: ConflictService;
let priorityService: PriorityService;
let stateMachine: BookingStateMachine;
let eventBus: EventBus;
let service: BookingService;

// Test constants
let testRoom: Room;
let testLocationNode: LocationNode;

function hours(offset: number): Date {
    const d = new Date("2026-03-01T08:00:00.000Z");
    d.setHours(d.getHours() + offset);
    return d;
}

beforeEach(async () => {
    bookingStorage = new MockBookingStorage();
    roomStorage = new MockRoomStorage();
    locationStorage = new MockLocationStorage();
    conflictStorage = new MockConflictStorage();
    priorityStorage = new MockPriorityStorage();

    conflictService = new ConflictService(
        bookingStorage,
        roomStorage,
        conflictStorage,
    );
    priorityService = new PriorityService(priorityStorage);
    stateMachine = new BookingStateMachine();
    eventBus = new EventBus();

    service = new BookingService(
        bookingStorage,
        conflictService,
        roomStorage,
        priorityService,
        eventBus,
        stateMachine,
    );

    // Seed a valid location node and room
    testLocationNode = {
        id: crypto.randomUUID(),
        parentId: null,
        type: LocationNodeType.ROOM,
        displayName: "Room 101",
        path: "campus/room-101",
        aliases: [],
        isActive: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    locationStorage.seed(testLocationNode);

    testRoom = await roomStorage.create({
        locationNodeId: testLocationNode.id,
        seatedCapacity: 30,
        examCapacity: 15,
        standingCapacity: 45,
        setupBufferMinutes: 0,
        teardownBufferMinutes: 0,
        isActive: true,
        metadata: null,
    });
});

// ─── create ────────────────────────────────────────────────────────

describe("BookingService – create", () => {
    test("succeeds with valid data", async () => {
        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Team Meeting",
            startsAt: hours(0),
            endsAt: hours(1),
            purposeType: "LECTURE",
        });

        expect(booking.id).toBeDefined();
        expect(booking.roomId).toBe(testRoom.id);
        expect(booking.requesterId).toBe("user-1");
        expect(booking.title).toBe("Team Meeting");
        expect(booking.status).toBe(BookingStatus.REQUESTED);
    });

    test("idempotency key returns existing booking on duplicate", async () => {
        const first = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Meeting",
            startsAt: hours(0),
            endsAt: hours(1),
            purposeType: "LECTURE",
            idempotencyKey: "idem-key-123",
        });

        const second = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Meeting",
            startsAt: hours(0),
            endsAt: hours(1),
            purposeType: "LECTURE",
            idempotencyKey: "idem-key-123",
        });

        expect(second.id).toBe(first.id);
    });

    test("fails when room has time conflict (BookingConflictError)", async () => {
        // Create a booking that occupies hour 0 to hour 2
        await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "First Booking",
            startsAt: hours(0),
            endsAt: hours(2),
            purposeType: "LECTURE",
        });

        // Attempt to create an overlapping booking (hour 1 to hour 3)
        await expect(
            service.create({
                roomId: testRoom.id,
                requesterId: "user-2",
                title: "Overlapping Booking",
                startsAt: hours(1),
                endsAt: hours(3),
                purposeType: "SEMINAR",
            }),
        ).rejects.toThrow(BookingConflictError);
    });

    test("fails for non-existent room", async () => {
        await expect(
            service.create({
                roomId: "non-existent-room",
                requesterId: "user-1",
                title: "Ghost Room Meeting",
                startsAt: hours(0),
                endsAt: hours(1),
                purposeType: "OPEN",
            }),
        ).rejects.toThrow(RoomNotFoundError);
    });

    test("emits BookingRequested event", async () => {
        let emittedEvent: unknown = null;
        eventBus.on("BookingRequested", (event) => {
            emittedEvent = event;
        });

        await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Event Test",
            startsAt: hours(0),
            endsAt: hours(1),
            purposeType: "OPEN",
        });

        expect(emittedEvent).not.toBeNull();
    });
});

// ─── confirm / checkIn / complete happy path ───────────────────────

describe("BookingService – state transitions happy path", () => {
    test("confirm transitions from REQUESTED to CONFIRMED", async () => {
        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Confirm Test",
            startsAt: hours(0),
            endsAt: hours(1),
            purposeType: "LECTURE",
        });

        const confirmed = await service.confirm(booking.id, "admin-1");
        expect(confirmed.status).toBe(BookingStatus.CONFIRMED);
    });

    test("checkIn transitions from CONFIRMED to IN_PROGRESS", async () => {
        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "CheckIn Test",
            startsAt: hours(0),
            endsAt: hours(1),
            purposeType: "LECTURE",
        });

        await service.confirm(booking.id, "admin-1");
        const started = await service.checkIn(booking.id, "user-1");
        expect(started.status).toBe(BookingStatus.IN_PROGRESS);
    });

    test("complete transitions from IN_PROGRESS to COMPLETED", async () => {
        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Complete Test",
            startsAt: hours(0),
            endsAt: hours(1),
            purposeType: "LECTURE",
        });

        await service.confirm(booking.id, "admin-1");
        await service.checkIn(booking.id, "user-1");
        const completed = await service.complete(booking.id, "user-1");
        expect(completed.status).toBe(BookingStatus.COMPLETED);
    });

    test("full lifecycle: requested -> confirmed -> in_progress -> completed", async () => {
        const events: string[] = [];
        eventBus.on("BookingRequested", () => events.push("requested"));
        eventBus.on("BookingConfirmed", () => events.push("confirmed"));
        eventBus.on("BookingStarted", () => events.push("started"));
        eventBus.on("BookingCompleted", () => events.push("completed"));

        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Lifecycle Test",
            startsAt: hours(0),
            endsAt: hours(1),
            purposeType: "LECTURE",
        });

        await service.confirm(booking.id, "admin-1");
        await service.checkIn(booking.id, "user-1");
        await service.complete(booking.id, "user-1");

        expect(events).toEqual(["requested", "confirmed", "started", "completed"]);
    });
});

// ─── cancel ────────────────────────────────────────────────────────

describe("BookingService – cancel", () => {
    test("cancel from REQUESTED", async () => {
        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Cancel Req",
            startsAt: hours(0),
            endsAt: hours(1),
            purposeType: "OPEN",
        });

        const cancelled = await service.cancel(booking.id, "user-1", "Changed plans");
        expect(cancelled.status).toBe(BookingStatus.CANCELLED);
    });

    test("cancel from CONFIRMED", async () => {
        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Cancel Conf",
            startsAt: hours(2),
            endsAt: hours(3),
            purposeType: "OPEN",
        });

        await service.confirm(booking.id, "admin-1");
        const cancelled = await service.cancel(booking.id, "admin-1");
        expect(cancelled.status).toBe(BookingStatus.CANCELLED);
    });

    test("cancel from IN_PROGRESS", async () => {
        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Cancel InProg",
            startsAt: hours(4),
            endsAt: hours(5),
            purposeType: "OPEN",
        });

        await service.confirm(booking.id, "admin-1");
        await service.checkIn(booking.id, "user-1");
        const cancelled = await service.cancel(booking.id, "admin-1", "Emergency");
        expect(cancelled.status).toBe(BookingStatus.CANCELLED);
    });

    test("cancel from COMPLETED throws InvalidStateTransitionError", async () => {
        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Cancel Completed",
            startsAt: hours(6),
            endsAt: hours(7),
            purposeType: "OPEN",
        });

        await service.confirm(booking.id, "admin-1");
        await service.checkIn(booking.id, "user-1");
        await service.complete(booking.id, "user-1");

        await expect(
            service.cancel(booking.id, "admin-1"),
        ).rejects.toThrow(InvalidStateTransitionError);
    });

    test("cancel emits BookingCancelled event", async () => {
        let emittedEvent: unknown = null;
        eventBus.on("BookingCancelled", (event) => {
            emittedEvent = event;
        });

        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Cancel Event",
            startsAt: hours(8),
            endsAt: hours(9),
            purposeType: "OPEN",
        });

        await service.cancel(booking.id, "user-1");
        expect(emittedEvent).not.toBeNull();
    });
});

// ─── modify ────────────────────────────────────────────────────────

describe("BookingService – modify", () => {
    test("modify with stale version throws StaleVersionError", async () => {
        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Stale Version Test",
            startsAt: hours(0),
            endsAt: hours(1),
            purposeType: "OPEN",
        });

        // First modify (succeeds, bumps version)
        await service.modify(
            booking.id,
            { title: "Updated Title" },
            booking.version,
        );

        // Second modify with old version
        await expect(
            service.modify(
                booking.id,
                { title: "Another Update" },
                booking.version, // stale - should be booking.version + 1 now
            ),
        ).rejects.toThrow(StaleVersionError);
    });

    test("modify with time change re-checks conflicts", async () => {
        // Create first booking occupying hours 0-2
        await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Existing Booking",
            startsAt: hours(0),
            endsAt: hours(2),
            purposeType: "LECTURE",
        });

        // Create second booking occupying hours 4-6 (no conflict)
        const booking2 = await service.create({
            roomId: testRoom.id,
            requesterId: "user-2",
            title: "Movable Booking",
            startsAt: hours(4),
            endsAt: hours(6),
            purposeType: "SEMINAR",
        });

        // Try to move booking2 into conflicting time range
        await expect(
            service.modify(
                booking2.id,
                { startsAt: hours(1), endsAt: hours(3) },
                booking2.version,
            ),
        ).rejects.toThrow(BookingConflictError);
    });

    test("modify with title-only change succeeds without conflict check", async () => {
        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Original Title",
            startsAt: hours(0),
            endsAt: hours(1),
            purposeType: "OPEN",
        });

        const updated = await service.modify(
            booking.id,
            { title: "New Title" },
            booking.version,
        );

        expect(updated.title).toBe("New Title");
    });

    test("modify on terminal state throws error", async () => {
        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Terminal Modify",
            startsAt: hours(10),
            endsAt: hours(11),
            purposeType: "OPEN",
        });

        await service.cancel(booking.id, "user-1");

        await expect(
            service.modify(
                booking.id,
                { title: "Should fail" },
                1,
            ),
        ).rejects.toThrow(InvalidStateTransitionError);
    });

    test("modify non-existent booking throws BookingNotFoundError", async () => {
        await expect(
            service.modify(
                "non-existent-id",
                { title: "Nothing" },
                1,
            ),
        ).rejects.toThrow(BookingNotFoundError);
    });

    test("modify emits BookingModified event", async () => {
        let emittedEvent: unknown = null;
        eventBus.on("BookingModified", (event) => {
            emittedEvent = event;
        });

        const booking = await service.create({
            roomId: testRoom.id,
            requesterId: "user-1",
            title: "Event Test",
            startsAt: hours(12),
            endsAt: hours(13),
            purposeType: "OPEN",
        });

        await service.modify(
            booking.id,
            { title: "Modified Title" },
            booking.version,
        );

        expect(emittedEvent).not.toBeNull();
    });
});
