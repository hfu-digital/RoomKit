import { describe, test, expect, beforeEach } from "bun:test";
import { LocationService } from "../../domain/location.service";
import { MockLocationStorage } from "../mocks/mock-location.storage";
import { LocationNodeType } from "../../types/enums";
import {
    LocationNotFoundError,
    LocationPathConflictError,
    RoomKitError,
} from "../../errors/roomkit.error";
import type { LocationNode } from "../../types/entities";

let locationStorage: MockLocationStorage;
let service: LocationService;

beforeEach(() => {
    locationStorage = new MockLocationStorage();
    service = new LocationService(locationStorage);
});

// ─── Helpers ───────────────────────────────────────────────────────

function makeNode(overrides: Partial<LocationNode> = {}): LocationNode {
    return {
        id: crypto.randomUUID(),
        parentId: null,
        type: LocationNodeType.BUILDING,
        displayName: "Test Node",
        path: "test-node",
        aliases: [],
        isActive: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

// ─── createNode ────────────────────────────────────────────────────

describe("LocationService – createNode", () => {
    test("creates a root node with auto-generated path slug", async () => {
        const node = await service.createNode({
            parentId: null,
            type: LocationNodeType.INSTITUTION,
            displayName: "HFU Campus",
        });

        expect(node.id).toBeDefined();
        expect(node.path).toBe("hfu-campus");
        expect(node.parentId).toBeNull();
        expect(node.displayName).toBe("HFU Campus");
        expect(node.type).toBe(LocationNodeType.INSTITUTION);
        expect(node.isActive).toBe(true);
    });

    test("creates a child node under existing parent", async () => {
        const parent = await service.createNode({
            parentId: null,
            type: LocationNodeType.CAMPUS,
            displayName: "Main Campus",
        });

        const child = await service.createNode({
            parentId: parent.id,
            type: LocationNodeType.BUILDING,
            displayName: "Building A",
        });

        expect(child.parentId).toBe(parent.id);
        expect(child.path).toBe("main-campus/building-a");
    });

    test("rejects invalid parent (LocationNotFoundError)", async () => {
        await expect(
            service.createNode({
                parentId: "non-existent-id",
                type: LocationNodeType.BUILDING,
                displayName: "Orphan",
            }),
        ).rejects.toThrow(LocationNotFoundError);
    });

    test("rejects duplicate paths (LocationPathConflictError)", async () => {
        await service.createNode({
            parentId: null,
            type: LocationNodeType.CAMPUS,
            displayName: "Furtwangen",
        });

        await expect(
            service.createNode({
                parentId: null,
                type: LocationNodeType.CAMPUS,
                displayName: "Furtwangen",
            }),
        ).rejects.toThrow(LocationPathConflictError);
    });

    test("rejects empty displayName (validation error)", async () => {
        await expect(
            service.createNode({
                parentId: null,
                type: LocationNodeType.CAMPUS,
                displayName: "",
            }),
        ).rejects.toThrow(RoomKitError);
    });

    test("slugifies special characters in path", async () => {
        const node = await service.createNode({
            parentId: null,
            type: LocationNodeType.BUILDING,
            displayName: "Building A+B (North)",
        });

        // Special chars removed, spaces become hyphens
        expect(node.path).toBe("building-ab-north");
    });

    test("applies default values for optional fields", async () => {
        const node = await service.createNode({
            parentId: null,
            type: LocationNodeType.CAMPUS,
            displayName: "DefaultTest",
        });

        expect(node.aliases).toEqual([]);
        expect(node.isActive).toBe(true);
        expect(node.metadata).toBeNull();
    });
});

// ─── getTree ───────────────────────────────────────────────────────

describe("LocationService – getTree", () => {
    test("builds correct hierarchy from flat nodes", async () => {
        const campus = await service.createNode({
            parentId: null,
            type: LocationNodeType.CAMPUS,
            displayName: "Campus",
        });

        const buildingA = await service.createNode({
            parentId: campus.id,
            type: LocationNodeType.BUILDING,
            displayName: "Building A",
        });

        const floor1 = await service.createNode({
            parentId: buildingA.id,
            type: LocationNodeType.FLOOR,
            displayName: "Floor 1",
        });

        const tree = await service.getTree();

        expect(tree).toHaveLength(1);
        expect(tree[0].id).toBe(campus.id);
        expect(tree[0].children).toHaveLength(1);
        expect(tree[0].children[0].id).toBe(buildingA.id);
        expect(tree[0].children[0].children).toHaveLength(1);
        expect(tree[0].children[0].children[0].id).toBe(floor1.id);
        expect(tree[0].children[0].children[0].children).toHaveLength(0);
    });

    test("getTree with rootId returns subtree rooted at that node", async () => {
        const campus = await service.createNode({
            parentId: null,
            type: LocationNodeType.CAMPUS,
            displayName: "Campus",
        });

        const buildingA = await service.createNode({
            parentId: campus.id,
            type: LocationNodeType.BUILDING,
            displayName: "Building A",
        });

        const buildingB = await service.createNode({
            parentId: campus.id,
            type: LocationNodeType.BUILDING,
            displayName: "Building B",
        });

        const floorA1 = await service.createNode({
            parentId: buildingA.id,
            type: LocationNodeType.FLOOR,
            displayName: "Floor 1",
        });

        // getTree(campus.id) builds tree with campus as the virtual root.
        // buildTree is called with parentId = campus.id, so it returns
        // nodes whose parentId === campus.id (i.e. the two buildings).
        const tree = await service.getTree(campus.id);

        // The direct children of campus are the two buildings
        expect(tree).toHaveLength(2);
        const treeIds = tree.map((n) => n.id).sort();
        expect(treeIds).toContain(buildingA.id);
        expect(treeIds).toContain(buildingB.id);

        // Building A should have Floor 1 as a child
        const buildingANode = tree.find((n) => n.id === buildingA.id)!;
        expect(buildingANode.children).toHaveLength(1);
        expect(buildingANode.children[0].id).toBe(floorA1.id);
    });

    test("getTree with non-existent rootId throws LocationNotFoundError", async () => {
        await expect(service.getTree("non-existent")).rejects.toThrow(
            LocationNotFoundError,
        );
    });

    test("getTree returns empty array when no nodes exist", async () => {
        const tree = await service.getTree();
        expect(tree).toEqual([]);
    });
});

// ─── resolveAlias ──────────────────────────────────────────────────

describe("LocationService – resolveAlias", () => {
    test("finds correct node by alias", async () => {
        const node = makeNode({
            aliases: ["hauptgebaeude", "main-building"],
            displayName: "Main Building",
            path: "main-building",
            type: LocationNodeType.BUILDING,
        });
        locationStorage.seed(node);

        const found = await service.resolveAlias("hauptgebaeude");
        expect(found).not.toBeNull();
        expect(found!.id).toBe(node.id);
    });

    test("returns null for unknown alias", async () => {
        const found = await service.resolveAlias("does-not-exist");
        expect(found).toBeNull();
    });
});

// ─── moveNode ──────────────────────────────────────────────────────

describe("LocationService – moveNode", () => {
    test("updates path for node and descendants", async () => {
        const campusA = await service.createNode({
            parentId: null,
            type: LocationNodeType.CAMPUS,
            displayName: "Campus A",
        });

        const campusB = await service.createNode({
            parentId: null,
            type: LocationNodeType.CAMPUS,
            displayName: "Campus B",
        });

        const building = await service.createNode({
            parentId: campusA.id,
            type: LocationNodeType.BUILDING,
            displayName: "Building X",
        });

        const floor = await service.createNode({
            parentId: building.id,
            type: LocationNodeType.FLOOR,
            displayName: "Floor 1",
        });

        // Move building from campusA to campusB
        const moved = await service.moveNode(building.id, campusB.id);

        expect(moved.parentId).toBe(campusB.id);
        expect(moved.path).toBe("campus-b/building-x");

        // Verify descendant path was updated
        const updatedFloor = await service.getById(floor.id);
        expect(updatedFloor).not.toBeNull();
        expect(updatedFloor!.path).toBe("campus-b/building-x/floor-1");
    });

    test("throws LocationNotFoundError for non-existent node", async () => {
        const campus = await service.createNode({
            parentId: null,
            type: LocationNodeType.CAMPUS,
            displayName: "Campus",
        });

        await expect(
            service.moveNode("non-existent", campus.id),
        ).rejects.toThrow(LocationNotFoundError);
    });

    test("throws LocationNotFoundError for non-existent new parent", async () => {
        const building = await service.createNode({
            parentId: null,
            type: LocationNodeType.BUILDING,
            displayName: "Building",
        });

        await expect(
            service.moveNode(building.id, "non-existent-parent"),
        ).rejects.toThrow(LocationNotFoundError);
    });

    test("throws LocationPathConflictError when target path already taken", async () => {
        const campus = await service.createNode({
            parentId: null,
            type: LocationNodeType.CAMPUS,
            displayName: "Campus",
        });

        await service.createNode({
            parentId: campus.id,
            type: LocationNodeType.BUILDING,
            displayName: "Existing",
        });

        // Create a building at root level that we'll try to move under campus
        // where the same slug already exists
        const otherBuilding = await service.createNode({
            parentId: null,
            type: LocationNodeType.BUILDING,
            displayName: "Existing",
        });

        await expect(
            service.moveNode(otherBuilding.id, campus.id),
        ).rejects.toThrow(LocationPathConflictError);
    });
});

// ─── getAncestors ──────────────────────────────────────────────────

describe("LocationService – getAncestors", () => {
    test("returns correct ancestor chain from leaf to root", async () => {
        const institution = await service.createNode({
            parentId: null,
            type: LocationNodeType.INSTITUTION,
            displayName: "HFU",
        });

        const campus = await service.createNode({
            parentId: institution.id,
            type: LocationNodeType.CAMPUS,
            displayName: "Furtwangen",
        });

        const building = await service.createNode({
            parentId: campus.id,
            type: LocationNodeType.BUILDING,
            displayName: "Building A",
        });

        const floor = await service.createNode({
            parentId: building.id,
            type: LocationNodeType.FLOOR,
            displayName: "Floor 2",
        });

        const ancestors = await service.getAncestors(floor.id);

        // Ancestors ordered from immediate parent upward
        expect(ancestors).toHaveLength(3);
        expect(ancestors[0].id).toBe(building.id);
        expect(ancestors[1].id).toBe(campus.id);
        expect(ancestors[2].id).toBe(institution.id);
    });

    test("returns empty array for root node", async () => {
        const root = await service.createNode({
            parentId: null,
            type: LocationNodeType.INSTITUTION,
            displayName: "Root",
        });

        const ancestors = await service.getAncestors(root.id);
        expect(ancestors).toEqual([]);
    });
});
