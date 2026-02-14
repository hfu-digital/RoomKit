import { describe, test, expect, beforeEach } from "bun:test";
import { RoomService } from "../../domain/room.service";
import { MockRoomStorage } from "../mocks/mock-room.storage";
import { MockLocationStorage } from "../mocks/mock-location.storage";
import { LocationNodeType } from "../../types/enums";
import {
    RoomNotFoundError,
    RoomKitError,
} from "../../errors/roomkit.error";
import type { LocationNode, Room, OperatingHours } from "../../types/entities";

let roomStorage: MockRoomStorage;
let locationStorage: MockLocationStorage;
let service: RoomService;

// ─── Helpers ───────────────────────────────────────────────────────

function seedRoomLocationNode(
    overrides: Partial<LocationNode> = {},
): LocationNode {
    const node: LocationNode = {
        id: crypto.randomUUID(),
        parentId: null,
        type: LocationNodeType.ROOM,
        displayName: "Room 101",
        path: "campus/building/room-101",
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

function seedBuildingLocationNode(
    overrides: Partial<LocationNode> = {},
): LocationNode {
    const node: LocationNode = {
        id: crypto.randomUUID(),
        parentId: null,
        type: LocationNodeType.BUILDING,
        displayName: "Building A",
        path: "campus/building-a",
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

// ─── Setup ─────────────────────────────────────────────────────────

beforeEach(() => {
    roomStorage = new MockRoomStorage();
    locationStorage = new MockLocationStorage();
    service = new RoomService(roomStorage, locationStorage);
});

// ─── create ────────────────────────────────────────────────────────

describe("RoomService – create", () => {
    test("creates room with valid data", async () => {
        const locationNode = seedRoomLocationNode();

        const room = await service.create({
            locationNodeId: locationNode.id,
            seatedCapacity: 40,
            examCapacity: 20,
            standingCapacity: 60,
        });

        expect(room.id).toBeDefined();
        expect(room.locationNodeId).toBe(locationNode.id);
        expect(room.seatedCapacity).toBe(40);
        expect(room.examCapacity).toBe(20);
        expect(room.standingCapacity).toBe(60);
        expect(room.setupBufferMinutes).toBe(0);
        expect(room.teardownBufferMinutes).toBe(0);
        expect(room.isActive).toBe(true);
        expect(room.metadata).toBeNull();
    });

    test("creates room with optional buffer times", async () => {
        const locationNode = seedRoomLocationNode();

        const room = await service.create({
            locationNodeId: locationNode.id,
            seatedCapacity: 10,
            examCapacity: 5,
            standingCapacity: 15,
            setupBufferMinutes: 10,
            teardownBufferMinutes: 5,
        });

        expect(room.setupBufferMinutes).toBe(10);
        expect(room.teardownBufferMinutes).toBe(5);
    });

    test("rejects non-room location type", async () => {
        const buildingNode = seedBuildingLocationNode();

        await expect(
            service.create({
                locationNodeId: buildingNode.id,
                seatedCapacity: 30,
                examCapacity: 15,
                standingCapacity: 45,
            }),
        ).rejects.toThrow(RoomKitError);

        try {
            await service.create({
                locationNodeId: buildingNode.id,
                seatedCapacity: 30,
                examCapacity: 15,
                standingCapacity: 45,
            });
        } catch (err) {
            const error = err as RoomKitError;
            expect(error.code).toBe("INVALID_LOCATION_TYPE");
            expect(error.context.actualType).toBe(LocationNodeType.BUILDING);
            expect(error.context.expectedType).toBe(LocationNodeType.ROOM);
        }
    });

    test("rejects non-existent location node", async () => {
        await expect(
            service.create({
                locationNodeId: "non-existent-id",
                seatedCapacity: 10,
                examCapacity: 5,
                standingCapacity: 15,
            }),
        ).rejects.toThrow(RoomNotFoundError);
    });

    test("rejects negative capacities (validation error)", async () => {
        const locationNode = seedRoomLocationNode();

        await expect(
            service.create({
                locationNodeId: locationNode.id,
                seatedCapacity: -1,
                examCapacity: 5,
                standingCapacity: 10,
            }),
        ).rejects.toThrow(RoomKitError);
    });
});

// ─── findByFilter ──────────────────────────────────────────────────

describe("RoomService – findByFilter", () => {
    test("returns all rooms when no filter applied", async () => {
        const node1 = seedRoomLocationNode({
            displayName: "Room 1",
            path: "campus/room-1",
        });
        const node2 = seedRoomLocationNode({
            displayName: "Room 2",
            path: "campus/room-2",
        });

        await service.create({
            locationNodeId: node1.id,
            seatedCapacity: 20,
            examCapacity: 10,
            standingCapacity: 30,
        });
        await service.create({
            locationNodeId: node2.id,
            seatedCapacity: 40,
            examCapacity: 20,
            standingCapacity: 60,
        });

        const rooms = await service.findByFilter({});
        expect(rooms).toHaveLength(2);
    });

    test("filters by minimum capacity", async () => {
        const node1 = seedRoomLocationNode({
            displayName: "Small Room",
            path: "campus/small",
        });
        const node2 = seedRoomLocationNode({
            displayName: "Large Room",
            path: "campus/large",
        });

        await service.create({
            locationNodeId: node1.id,
            seatedCapacity: 10,
            examCapacity: 5,
            standingCapacity: 15,
        });
        await service.create({
            locationNodeId: node2.id,
            seatedCapacity: 50,
            examCapacity: 25,
            standingCapacity: 75,
        });

        const rooms = await service.findByFilter({
            minCapacity: 30,
            capacityType: "seated",
        });
        expect(rooms).toHaveLength(1);
        expect(rooms[0].seatedCapacity).toBe(50);
    });

    test("filters by active status", async () => {
        const node1 = seedRoomLocationNode({
            displayName: "Active Room",
            path: "campus/active",
        });
        const node2 = seedRoomLocationNode({
            displayName: "Inactive Room",
            path: "campus/inactive",
        });

        await service.create({
            locationNodeId: node1.id,
            seatedCapacity: 20,
            examCapacity: 10,
            standingCapacity: 30,
            isActive: true,
        });
        await service.create({
            locationNodeId: node2.id,
            seatedCapacity: 20,
            examCapacity: 10,
            standingCapacity: 30,
            isActive: false,
        });

        const rooms = await service.findByFilter({ isActive: true });
        expect(rooms).toHaveLength(1);
        expect(rooms[0].isActive).toBe(true);
    });

    test("filters by equipment tags", async () => {
        const node1 = seedRoomLocationNode({
            displayName: "Projector Room",
            path: "campus/projector",
        });
        const node2 = seedRoomLocationNode({
            displayName: "Basic Room",
            path: "campus/basic",
        });

        const room1 = await service.create({
            locationNodeId: node1.id,
            seatedCapacity: 30,
            examCapacity: 15,
            standingCapacity: 40,
        });
        await service.create({
            locationNodeId: node2.id,
            seatedCapacity: 30,
            examCapacity: 15,
            standingCapacity: 40,
        });

        await service.addEquipment(room1.id, "projector");

        const rooms = await service.findByFilter({
            equipment: ["projector"],
        });
        expect(rooms).toHaveLength(1);
        expect(rooms[0].id).toBe(room1.id);
    });
});

// ─── getPartitionTree ──────────────────────────────────────────────

describe("RoomService – getPartitionTree", () => {
    test("returns partition tree for room", async () => {
        const nodeParent = seedRoomLocationNode({
            displayName: "Main Hall",
            path: "campus/main-hall",
        });
        const nodeChild = seedRoomLocationNode({
            displayName: "Hall Section A",
            path: "campus/hall-a",
        });

        const parentRoom = await service.create({
            locationNodeId: nodeParent.id,
            seatedCapacity: 100,
            examCapacity: 50,
            standingCapacity: 150,
        });
        const childRoom = await service.create({
            locationNodeId: nodeChild.id,
            seatedCapacity: 30,
            examCapacity: 15,
            standingCapacity: 45,
        });

        await service.createPartition(parentRoom.id, childRoom.id);

        const tree = await service.getPartitionTree(parentRoom.id);
        expect(tree).toHaveLength(1);
        expect(tree[0].parentRoomId).toBe(parentRoom.id);
        expect(tree[0].childRoomId).toBe(childRoom.id);
    });

    test("throws RoomNotFoundError for non-existent room", async () => {
        await expect(
            service.getPartitionTree("non-existent"),
        ).rejects.toThrow(RoomNotFoundError);
    });
});

// ─── getEffectiveOperatingHours ────────────────────────────────────

describe("RoomService – getEffectiveOperatingHours", () => {
    test("returns hours from room's own node when defined", async () => {
        const roomNode = seedRoomLocationNode();
        const room = await service.create({
            locationNodeId: roomNode.id,
            seatedCapacity: 20,
            examCapacity: 10,
            standingCapacity: 30,
        });

        // Set operating hours on the room's own location node
        const hours: Omit<OperatingHours, "id" | "locationNodeId">[] = [
            { dayOfWeek: 1, opensAt: "08:00", closesAt: "18:00" },
            { dayOfWeek: 2, opensAt: "08:00", closesAt: "18:00" },
        ];
        await roomStorage.setOperatingHours(roomNode.id, hours);

        const effective = await service.getEffectiveOperatingHours(room.id);
        expect(effective).toHaveLength(2);
        expect(effective[0].dayOfWeek).toBe(1);
        expect(effective[0].opensAt).toBe("08:00");
    });

    test("cascades up hierarchy to find operating hours", async () => {
        // Create hierarchy: building -> floor -> room
        const buildingNode = seedBuildingLocationNode({
            id: crypto.randomUUID(),
            path: "campus/building-x",
            displayName: "Building X",
        });

        const floorNode: LocationNode = {
            id: crypto.randomUUID(),
            parentId: buildingNode.id,
            type: LocationNodeType.FLOOR,
            displayName: "Floor 1",
            path: "campus/building-x/floor-1",
            aliases: [],
            isActive: true,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        locationStorage.seed(floorNode);

        const roomNode: LocationNode = {
            id: crypto.randomUUID(),
            parentId: floorNode.id,
            type: LocationNodeType.ROOM,
            displayName: "Room 101",
            path: "campus/building-x/floor-1/room-101",
            aliases: [],
            isActive: true,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        locationStorage.seed(roomNode);

        const room = await service.create({
            locationNodeId: roomNode.id,
            seatedCapacity: 20,
            examCapacity: 10,
            standingCapacity: 30,
        });

        // Set hours only on building (ancestor), not on room or floor
        const hours: Omit<OperatingHours, "id" | "locationNodeId">[] = [
            { dayOfWeek: 1, opensAt: "07:00", closesAt: "22:00" },
        ];
        await roomStorage.setOperatingHours(buildingNode.id, hours);

        const effective = await service.getEffectiveOperatingHours(room.id);
        expect(effective).toHaveLength(1);
        expect(effective[0].opensAt).toBe("07:00");
        expect(effective[0].closesAt).toBe("22:00");
    });

    test("returns empty array when no hours defined anywhere", async () => {
        const roomNode = seedRoomLocationNode({
            displayName: "No Hours Room",
            path: "campus/no-hours",
        });
        const room = await service.create({
            locationNodeId: roomNode.id,
            seatedCapacity: 10,
            examCapacity: 5,
            standingCapacity: 15,
        });

        const effective = await service.getEffectiveOperatingHours(room.id);
        expect(effective).toEqual([]);
    });

    test("throws RoomNotFoundError for non-existent room", async () => {
        await expect(
            service.getEffectiveOperatingHours("non-existent"),
        ).rejects.toThrow(RoomNotFoundError);
    });
});

// ─── Equipment ─────────────────────────────────────────────────────

describe("RoomService – equipment management", () => {
    test("add equipment to room", async () => {
        const node = seedRoomLocationNode();
        const room = await service.create({
            locationNodeId: node.id,
            seatedCapacity: 20,
            examCapacity: 10,
            standingCapacity: 30,
        });

        const equipment = await service.addEquipment(room.id, "projector");
        expect(equipment.roomId).toBe(room.id);
        expect(equipment.tag).toBe("projector");
        expect(equipment.id).toBeDefined();
    });

    test("remove equipment from room", async () => {
        const node = seedRoomLocationNode();
        const room = await service.create({
            locationNodeId: node.id,
            seatedCapacity: 20,
            examCapacity: 10,
            standingCapacity: 30,
        });

        await service.addEquipment(room.id, "whiteboard");
        await expect(
            service.removeEquipment(room.id, "whiteboard"),
        ).resolves.toBeUndefined();
    });

    test("addEquipment throws for non-existent room", async () => {
        await expect(
            service.addEquipment("non-existent", "projector"),
        ).rejects.toThrow(RoomNotFoundError);
    });

    test("removeEquipment throws for non-existent room", async () => {
        await expect(
            service.removeEquipment("non-existent", "projector"),
        ).rejects.toThrow(RoomNotFoundError);
    });
});

// ─── Accessibility ─────────────────────────────────────────────────

describe("RoomService – accessibility management", () => {
    test("add accessibility attribute to room", async () => {
        const node = seedRoomLocationNode();
        const room = await service.create({
            locationNodeId: node.id,
            seatedCapacity: 20,
            examCapacity: 10,
            standingCapacity: 30,
        });

        const attr = await service.addAccessibility(room.id, "wheelchair_accessible");
        expect(attr.roomId).toBe(room.id);
        expect(attr.attribute).toBe("wheelchair_accessible");
        expect(attr.id).toBeDefined();
    });

    test("remove accessibility attribute from room", async () => {
        const node = seedRoomLocationNode();
        const room = await service.create({
            locationNodeId: node.id,
            seatedCapacity: 20,
            examCapacity: 10,
            standingCapacity: 30,
        });

        await service.addAccessibility(room.id, "hearing_loop");
        await expect(
            service.removeAccessibility(room.id, "hearing_loop"),
        ).resolves.toBeUndefined();
    });

    test("addAccessibility throws for non-existent room", async () => {
        await expect(
            service.addAccessibility("non-existent", "wheelchair_accessible"),
        ).rejects.toThrow(RoomNotFoundError);
    });

    test("removeAccessibility throws for non-existent room", async () => {
        await expect(
            service.removeAccessibility("non-existent", "wheelchair_accessible"),
        ).rejects.toThrow(RoomNotFoundError);
    });
});
