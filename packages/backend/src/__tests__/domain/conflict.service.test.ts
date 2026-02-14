import { describe, test, expect, beforeEach } from "bun:test";
import { ConflictService } from "../../domain/conflict.service";
import { MockBookingStorage } from "../mocks/mock-booking.storage";
import { MockRoomStorage } from "../mocks/mock-room.storage";
import { MockConflictStorage } from "../mocks/mock-conflict.storage";
import { MockLocationStorage } from "../mocks/mock-location.storage";
import { BookingStatus, LocationNodeType } from "../../types/enums";
import type { Booking, Room, LocationNode } from "../../types/entities";

let bookingStorage: MockBookingStorage;
let roomStorage: MockRoomStorage;
let conflictStorage: MockConflictStorage;
let locationStorage: MockLocationStorage;
let service: ConflictService;

// ─── Helpers ───────────────────────────────────────────────────────

function hours(offset: number): Date {
    const d = new Date("2026-03-01T08:00:00.000Z");
    d.setHours(d.getHours() + offset);
    return d;
}

async function seedRoom(
    locationNodeId: string,
    capacity: number = 30,
): Promise<Room> {
    return roomStorage.create({
        locationNodeId,
        seatedCapacity: capacity,
        examCapacity: Math.floor(capacity / 2),
        standingCapacity: Math.floor(capacity * 1.5),
        setupBufferMinutes: 0,
        teardownBufferMinutes: 0,
        isActive: true,
        metadata: null,
    });
}

function seedLocationNode(overrides: Partial<LocationNode> = {}): LocationNode {
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
        ...overrides,
    };
    locationStorage.seed(node);
    return node;
}

async function seedBooking(
    roomId: string,
    startsAt: Date,
    endsAt: Date,
    overrides: Partial<Omit<Booking, "id" | "version" | "createdAt" | "updatedAt">> = {},
): Promise<Booking> {
    return bookingStorage.createWithConflictCheck(
        {
            roomId,
            requesterId: "user-1",
            onBehalfOfId: null,
            title: "Test Booking",
            description: null,
            startsAt,
            endsAt,
            status: BookingStatus.REQUESTED,
            priority: 50,
            purposeType: "LECTURE",
            idempotencyKey: null,
            recurrenceRuleId: null,
            recurrenceModType: null,
            metadata: null,
            ...overrides,
        },
        { checkPartitions: false, checkBuffers: false },
    );
}

// ─── Setup ─────────────────────────────────────────────────────────

beforeEach(() => {
    bookingStorage = new MockBookingStorage();
    roomStorage = new MockRoomStorage();
    conflictStorage = new MockConflictStorage();
    locationStorage = new MockLocationStorage();

    service = new ConflictService(
        bookingStorage,
        roomStorage,
        conflictStorage,
    );
});

// ─── Direct Overlap Detection ──────────────────────────────────────

describe("ConflictService – direct overlap detection", () => {
    test("detects overlapping booking in same room", async () => {
        const locNode = seedLocationNode();
        const room = await seedRoom(locNode.id);

        await seedBooking(room.id, hours(0), hours(2));

        const result = await service.checkConflicts(
            room.id,
            hours(1),
            hours(3),
        );

        expect(result.hasConflict).toBe(true);
        expect(result.directConflicts).toHaveLength(1);
    });

    test("no conflict when times do not overlap", async () => {
        const locNode = seedLocationNode();
        const room = await seedRoom(locNode.id);

        await seedBooking(room.id, hours(0), hours(2));

        const result = await service.checkConflicts(
            room.id,
            hours(3),
            hours(5),
        );

        expect(result.hasConflict).toBe(false);
        expect(result.directConflicts).toHaveLength(0);
    });

    test("excludes specific booking from conflict check", async () => {
        const locNode = seedLocationNode();
        const room = await seedRoom(locNode.id);

        const existing = await seedBooking(room.id, hours(0), hours(2));

        const result = await service.checkConflicts(
            room.id,
            hours(1),
            hours(3),
            existing.id, // Exclude the existing booking
        );

        expect(result.hasConflict).toBe(false);
        expect(result.directConflicts).toHaveLength(0);
    });

    test("detects exact time match as overlap", async () => {
        const locNode = seedLocationNode();
        const room = await seedRoom(locNode.id);

        await seedBooking(room.id, hours(0), hours(2));

        const result = await service.checkConflicts(
            room.id,
            hours(0),
            hours(2),
        );

        expect(result.hasConflict).toBe(true);
    });

    test("multiple overlapping bookings detected", async () => {
        const locNode = seedLocationNode();
        const room = await seedRoom(locNode.id);

        // Seed bookings directly to bypass conflict checking during creation
        const now = new Date();
        bookingStorage.seedBooking({
            id: crypto.randomUUID(),
            roomId: room.id,
            requesterId: "user-1",
            onBehalfOfId: null,
            title: "Booking A",
            description: null,
            startsAt: hours(0),
            endsAt: hours(3),
            status: BookingStatus.REQUESTED,
            priority: 50,
            purposeType: "LECTURE",
            version: 1,
            idempotencyKey: null,
            recurrenceRuleId: null,
            recurrenceModType: null,
            metadata: null,
            createdAt: now,
            updatedAt: now,
        });
        bookingStorage.seedBooking({
            id: crypto.randomUUID(),
            roomId: room.id,
            requesterId: "user-2",
            onBehalfOfId: null,
            title: "Booking B",
            description: null,
            startsAt: hours(2),
            endsAt: hours(5),
            status: BookingStatus.REQUESTED,
            priority: 50,
            purposeType: "LECTURE",
            version: 1,
            idempotencyKey: null,
            recurrenceRuleId: null,
            recurrenceModType: null,
            metadata: null,
            createdAt: now,
            updatedAt: now,
        });

        const result = await service.checkConflicts(
            room.id,
            hours(1),
            hours(4),
        );

        expect(result.hasConflict).toBe(true);
        expect(result.directConflicts).toHaveLength(2);
    });
});

// ─── Partition Tree Conflict Detection ─────────────────────────────

describe("ConflictService – partition tree conflict detection", () => {
    test("detects conflict in child partition room", async () => {
        const parentLocNode = seedLocationNode({ displayName: "Main Hall" });
        const childLocNode = seedLocationNode({ displayName: "Hall Section A" });

        const parentRoom = await seedRoom(parentLocNode.id, 100);
        const childRoom = await seedRoom(childLocNode.id, 30);

        // Create partition relationship
        await roomStorage.createPartition({
            parentRoomId: parentRoom.id,
            childRoomId: childRoom.id,
        });

        // Booking in child room
        await seedBooking(childRoom.id, hours(0), hours(2));

        // Check conflict on parent room (should detect child's booking via partition)
        const result = await service.checkConflicts(
            parentRoom.id,
            hours(1),
            hours(3),
        );

        expect(result.hasConflict).toBe(true);
        expect(result.partitionConflicts).toHaveLength(1);
        expect(result.partitionConflicts[0].roomId).toBe(childRoom.id);
    });

    test("detects conflict when checking parent and child has booking (bidirectional)", async () => {
        const parentLocNode = seedLocationNode({ displayName: "Main Hall 2" });
        const childLocNode1 = seedLocationNode({ displayName: "Hall Section B1" });
        const childLocNode2 = seedLocationNode({ displayName: "Hall Section B2" });

        const parentRoom = await seedRoom(parentLocNode.id, 100);
        const childRoom1 = await seedRoom(childLocNode1.id, 30);
        const childRoom2 = await seedRoom(childLocNode2.id, 30);

        // Create two partitions under the parent
        await roomStorage.createPartition({
            parentRoomId: parentRoom.id,
            childRoomId: childRoom1.id,
        });
        await roomStorage.createPartition({
            parentRoomId: parentRoom.id,
            childRoomId: childRoom2.id,
        });

        // Booking in child room 1
        await seedBooking(childRoom1.id, hours(0), hours(2));
        // Booking in child room 2 at a different time
        await seedBooking(childRoom2.id, hours(4), hours(6));

        // Check conflict on parent room at hours 0-2 (should see childRoom1's booking)
        const result = await service.checkConflicts(
            parentRoom.id,
            hours(0),
            hours(2),
        );

        expect(result.hasConflict).toBe(true);
        expect(result.partitionConflicts).toHaveLength(1);
        expect(result.partitionConflicts[0].roomId).toBe(childRoom1.id);

        // Check at hours 4-6 (should see childRoom2's booking)
        const result2 = await service.checkConflicts(
            parentRoom.id,
            hours(4),
            hours(6),
        );

        expect(result2.hasConflict).toBe(true);
        expect(result2.partitionConflicts).toHaveLength(1);
        expect(result2.partitionConflicts[0].roomId).toBe(childRoom2.id);
    });

    test("no partition conflict when times do not overlap", async () => {
        const parentLocNode = seedLocationNode({ displayName: "Hall P" });
        const childLocNode = seedLocationNode({ displayName: "Hall C" });

        const parentRoom = await seedRoom(parentLocNode.id, 100);
        const childRoom = await seedRoom(childLocNode.id, 30);

        await roomStorage.createPartition({
            parentRoomId: parentRoom.id,
            childRoomId: childRoom.id,
        });

        // Booking in child room at hours 0-2
        await seedBooking(childRoom.id, hours(0), hours(2));

        // Check for parent room at hours 4-6
        const result = await service.checkConflicts(
            parentRoom.id,
            hours(4),
            hours(6),
        );

        expect(result.hasConflict).toBe(false);
        expect(result.partitionConflicts).toHaveLength(0);
    });
});

// ─── suggestAlternatives ───────────────────────────────────────────

describe("ConflictService – suggestAlternatives", () => {
    test("returns sorted results with same-room-different-time first", async () => {
        const locNode1 = seedLocationNode({
            displayName: "Room 1",
            path: "campus/room-1",
        });
        const locNode2 = seedLocationNode({
            displayName: "Room 2",
            path: "campus/room-2",
        });

        const room1 = await seedRoom(locNode1.id, 30);
        const room2 = await seedRoom(locNode2.id, 30);

        // Block room1 at hours 0-2
        await seedBooking(room1.id, hours(0), hours(2));

        const suggestions = await service.suggestAlternatives(
            room1.id,
            hours(0),
            hours(2),
        );

        expect(suggestions.length).toBeGreaterThan(0);

        // Verify sorting: same_room_different_time (score 1.0) should come first
        const sameRoomSuggestions = suggestions.filter(
            (s) => s.type === "same_room_different_time",
        );
        const diffRoomSuggestions = suggestions.filter(
            (s) => s.type === "different_room_same_time",
        );

        if (sameRoomSuggestions.length > 0 && diffRoomSuggestions.length > 0) {
            // First suggestion should be same_room_different_time with higher score
            expect(suggestions[0].score).toBeGreaterThanOrEqual(
                suggestions[suggestions.length - 1].score,
            );
        }
    });

    test("suggests different rooms at same time", async () => {
        const locNode1 = seedLocationNode({
            displayName: "Blocked Room",
            path: "campus/blocked",
        });
        const locNode2 = seedLocationNode({
            displayName: "Available Room",
            path: "campus/available",
        });

        const room1 = await seedRoom(locNode1.id, 30);
        const room2 = await seedRoom(locNode2.id, 30);

        // Block room1 at hours 0-2
        await seedBooking(room1.id, hours(0), hours(2));

        const suggestions = await service.suggestAlternatives(
            room1.id,
            hours(0),
            hours(2),
        );

        const diffRoomSuggestions = suggestions.filter(
            (s) => s.type === "different_room_same_time",
        );

        expect(diffRoomSuggestions.length).toBeGreaterThanOrEqual(1);
        expect(diffRoomSuggestions[0].room).not.toBeNull();
        expect(diffRoomSuggestions[0].room!.id).toBe(room2.id);
    });

    test("suggests later time slots in same room", async () => {
        const locNode = seedLocationNode({
            displayName: "Busy Room",
            path: "campus/busy",
        });
        const room = await seedRoom(locNode.id, 30);

        // Block hours 0-2
        await seedBooking(room.id, hours(0), hours(2));

        const suggestions = await service.suggestAlternatives(
            room.id,
            hours(0),
            hours(2),
        );

        const sameRoomSuggestions = suggestions.filter(
            (s) => s.type === "same_room_different_time",
        );

        expect(sameRoomSuggestions.length).toBeGreaterThan(0);
        // Should suggest a time after the conflict
        for (const s of sameRoomSuggestions) {
            expect(s.startsAt.getTime()).toBeGreaterThan(hours(0).getTime());
        }
    });
});

// ─── resolveByPriority ─────────────────────────────────────────────

describe("ConflictService – resolveByPriority", () => {
    test("higher priority new booking displaces existing", () => {
        const existingBooking: Booking = {
            id: "booking-existing",
            roomId: "room-1",
            requesterId: "user-1",
            onBehalfOfId: null,
            title: "Low Priority",
            description: null,
            startsAt: hours(0),
            endsAt: hours(2),
            status: BookingStatus.REQUESTED,
            priority: 25,
            purposeType: "OPEN",
            version: 1,
            idempotencyKey: null,
            recurrenceRuleId: null,
            recurrenceModType: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = service.resolveByPriority(existingBooking, {
            priority: 100,
            requesterId: "user-2",
        });

        expect(result.winner).toBe("new");
        expect(result.action).toBe("displace_existing");
    });

    test("lower priority new booking is rejected", () => {
        const existingBooking: Booking = {
            id: "booking-existing",
            roomId: "room-1",
            requesterId: "user-1",
            onBehalfOfId: null,
            title: "High Priority",
            description: null,
            startsAt: hours(0),
            endsAt: hours(2),
            status: BookingStatus.REQUESTED,
            priority: 100,
            purposeType: "LECTURE",
            version: 1,
            idempotencyKey: null,
            recurrenceRuleId: null,
            recurrenceModType: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = service.resolveByPriority(existingBooking, {
            priority: 25,
            requesterId: "user-2",
        });

        expect(result.winner).toBe("existing");
        expect(result.action).toBe("reject_new");
    });

    test("equal priority: existing booking wins (tie-break)", () => {
        const existingBooking: Booking = {
            id: "booking-existing",
            roomId: "room-1",
            requesterId: "user-1",
            onBehalfOfId: null,
            title: "Same Priority",
            description: null,
            startsAt: hours(0),
            endsAt: hours(2),
            status: BookingStatus.REQUESTED,
            priority: 50,
            purposeType: "SEMINAR",
            version: 1,
            idempotencyKey: null,
            recurrenceRuleId: null,
            recurrenceModType: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = service.resolveByPriority(existingBooking, {
            priority: 50,
            requesterId: "user-2",
        });

        expect(result.winner).toBe("existing");
        expect(result.action).toBe("reject_new");
    });
});
