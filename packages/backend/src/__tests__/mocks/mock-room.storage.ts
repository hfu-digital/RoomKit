import { RoomStorage } from "../../interfaces/room.storage";
import type {
    Room,
    RoomEquipment,
    RoomAccessibility,
    RoomPartition,
    OperatingHours,
} from "../../types/entities";

export class MockRoomStorage extends RoomStorage {
    private rooms = new Map<string, Room>();
    private equipment = new Map<string, RoomEquipment>();
    private accessibility = new Map<string, RoomAccessibility>();
    private partitions = new Map<string, RoomPartition>();
    private operatingHours = new Map<string, OperatingHours>();

    async create(
        data: Omit<Room, "id" | "createdAt" | "updatedAt">,
    ): Promise<Room> {
        const now = new Date();
        const room: Room = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        };
        this.rooms.set(room.id, room);
        return room;
    }

    async findById(id: string): Promise<Room | null> {
        return this.rooms.get(id) ?? null;
    }

    async findByCompoundFilter(filter: {
        minCapacity?: number;
        capacityType?: "seated" | "exam" | "standing";
        equipment?: string[];
        accessibility?: string[];
        locationScope?: string;
        isActive?: boolean;
    }): Promise<Room[]> {
        const results: Room[] = [];

        for (const room of this.rooms.values()) {
            if (filter.isActive !== undefined && room.isActive !== filter.isActive) {
                continue;
            }

            if (filter.minCapacity !== undefined) {
                const capType = filter.capacityType ?? "seated";
                let capacity: number;
                switch (capType) {
                    case "exam":
                        capacity = room.examCapacity;
                        break;
                    case "standing":
                        capacity = room.standingCapacity;
                        break;
                    default:
                        capacity = room.seatedCapacity;
                        break;
                }
                if (capacity < filter.minCapacity) {
                    continue;
                }
            }

            if (filter.locationScope !== undefined) {
                if (room.locationNodeId !== filter.locationScope) {
                    continue;
                }
            }

            if (filter.equipment !== undefined && filter.equipment.length > 0) {
                const roomEquipTags = this.getEquipmentTagsForRoom(room.id);
                const hasAll = filter.equipment.every((tag) =>
                    roomEquipTags.includes(tag),
                );
                if (!hasAll) continue;
            }

            if (
                filter.accessibility !== undefined &&
                filter.accessibility.length > 0
            ) {
                const roomAccessAttrs =
                    this.getAccessibilityAttributesForRoom(room.id);
                const hasAll = filter.accessibility.every((attr) =>
                    roomAccessAttrs.includes(attr),
                );
                if (!hasAll) continue;
            }

            results.push(room);
        }

        return results;
    }

    async getPartitionTree(roomId: string): Promise<RoomPartition[]> {
        const result: RoomPartition[] = [];
        for (const partition of this.partitions.values()) {
            if (partition.parentRoomId === roomId) {
                result.push(partition);
            }
        }
        return result;
    }

    async getWithEquipment(
        id: string,
    ): Promise<
        | (Room & {
              equipment: RoomEquipment[];
              accessibility: RoomAccessibility[];
          })
        | null
    > {
        const room = this.rooms.get(id);
        if (!room) return null;

        const roomEquip: RoomEquipment[] = [];
        for (const eq of this.equipment.values()) {
            if (eq.roomId === id) {
                roomEquip.push(eq);
            }
        }

        const roomAccess: RoomAccessibility[] = [];
        for (const acc of this.accessibility.values()) {
            if (acc.roomId === id) {
                roomAccess.push(acc);
            }
        }

        return {
            ...room,
            equipment: roomEquip,
            accessibility: roomAccess,
        };
    }

    async update(
        id: string,
        data: Partial<Omit<Room, "id" | "createdAt" | "updatedAt">>,
    ): Promise<Room> {
        const existing = this.rooms.get(id);
        if (!existing) {
            throw new Error(`Room not found: ${id}`);
        }
        const updated: Room = {
            ...existing,
            ...data,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: new Date(),
        };
        this.rooms.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        this.rooms.delete(id);
    }

    async addEquipment(roomId: string, tag: string): Promise<RoomEquipment> {
        const entry: RoomEquipment = {
            id: crypto.randomUUID(),
            roomId,
            tag,
        };
        this.equipment.set(entry.id, entry);
        return entry;
    }

    async removeEquipment(roomId: string, tag: string): Promise<void> {
        for (const [key, eq] of this.equipment.entries()) {
            if (eq.roomId === roomId && eq.tag === tag) {
                this.equipment.delete(key);
                return;
            }
        }
    }

    async addAccessibility(
        roomId: string,
        attribute: string,
    ): Promise<RoomAccessibility> {
        const entry: RoomAccessibility = {
            id: crypto.randomUUID(),
            roomId,
            attribute,
        };
        this.accessibility.set(entry.id, entry);
        return entry;
    }

    async removeAccessibility(
        roomId: string,
        attribute: string,
    ): Promise<void> {
        for (const [key, acc] of this.accessibility.entries()) {
            if (acc.roomId === roomId && acc.attribute === attribute) {
                this.accessibility.delete(key);
                return;
            }
        }
    }

    async createPartition(
        data: Omit<RoomPartition, "id">,
    ): Promise<RoomPartition> {
        const partition: RoomPartition = {
            ...data,
            id: crypto.randomUUID(),
        };
        this.partitions.set(partition.id, partition);
        return partition;
    }

    async deletePartition(id: string): Promise<void> {
        this.partitions.delete(id);
    }

    async getOperatingHours(
        locationNodeId: string,
    ): Promise<OperatingHours[]> {
        const result: OperatingHours[] = [];
        for (const hours of this.operatingHours.values()) {
            if (hours.locationNodeId === locationNodeId) {
                result.push(hours);
            }
        }
        return result;
    }

    async setOperatingHours(
        locationNodeId: string,
        hours: Omit<OperatingHours, "id" | "locationNodeId">[],
    ): Promise<OperatingHours[]> {
        // Remove existing hours for this locationNodeId
        for (const [key, existing] of this.operatingHours.entries()) {
            if (existing.locationNodeId === locationNodeId) {
                this.operatingHours.delete(key);
            }
        }

        const created: OperatingHours[] = [];
        for (const h of hours) {
            const entry: OperatingHours = {
                ...h,
                id: crypto.randomUUID(),
                locationNodeId,
            };
            this.operatingHours.set(entry.id, entry);
            created.push(entry);
        }
        return created;
    }

    /** Test helper: clear all stored data. */
    clear(): void {
        this.rooms.clear();
        this.equipment.clear();
        this.accessibility.clear();
        this.partitions.clear();
        this.operatingHours.clear();
    }

    /** Test helper: seed a room directly. */
    seedRoom(room: Room): void {
        this.rooms.set(room.id, room);
    }

    /** Test helper: seed a partition directly. */
    seedPartition(partition: RoomPartition): void {
        this.partitions.set(partition.id, partition);
    }

    // ── Private helpers ─────────────────────────────────────────────

    private getEquipmentTagsForRoom(roomId: string): string[] {
        const tags: string[] = [];
        for (const eq of this.equipment.values()) {
            if (eq.roomId === roomId) {
                tags.push(eq.tag);
            }
        }
        return tags;
    }

    private getAccessibilityAttributesForRoom(roomId: string): string[] {
        const attrs: string[] = [];
        for (const acc of this.accessibility.values()) {
            if (acc.roomId === roomId) {
                attrs.push(acc.attribute);
            }
        }
        return attrs;
    }
}
