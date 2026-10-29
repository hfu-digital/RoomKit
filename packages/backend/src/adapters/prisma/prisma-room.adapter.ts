import type { RoomKitPrismaClient } from "../../types/prisma-delegates";
import type {
    Room,
    RoomEquipment,
    RoomAccessibility,
    RoomPartition,
    OperatingHours,
} from "../../types/entities";
import { RoomStorage } from "../../interfaces/room.storage";

export class PrismaRoomAdapter extends RoomStorage {
    constructor(private readonly prisma: RoomKitPrismaClient) {
        super();
    }

    async create(
        data: Omit<Room, "id" | "createdAt" | "updatedAt">,
    ): Promise<Room> {
        return this.prisma.room.create({ data });
    }

    async findById(id: string): Promise<Room | null> {
        return this.prisma.room.findUnique({ where: { id } });
    }

    async findByCompoundFilter(filter: {
        minCapacity?: number;
        capacityType?: "seated" | "exam" | "standing";
        equipment?: string[];
        accessibility?: string[];
        locationScope?: string;
        isActive?: boolean;
    }): Promise<Room[]> {
        const where: Record<string, unknown> = {};

        if (filter.isActive !== undefined) {
            where.isActive = filter.isActive;
        }

        // Build capacity filter based on capacityType
        if (filter.minCapacity !== undefined) {
            const capacityField =
                filter.capacityType === "exam"
                    ? "examCapacity"
                    : filter.capacityType === "standing"
                      ? "standingCapacity"
                      : "seatedCapacity";
            where[capacityField] = { gte: filter.minCapacity };
        }

        if (filter.equipment?.length) {
            where.AND = filter.equipment.map(tag => ({ equipment: { some: { tag } } }));
        }
        if (filter.accessibility?.length) {
            const clauses = (where.AND ?? []) as Record<string, unknown>[];
            where.AND = [...clauses, ...filter.accessibility.map(attribute => ({ accessibility: { some: { attribute } } }))];
        }
        if (filter.locationScope !== undefined) {
            const prefix = filter.locationScope.endsWith('/') ? filter.locationScope : filter.locationScope + '/';
            where.locationNode = { OR: [{ path: filter.locationScope }, { path: { startsWith: prefix } }] };
        }
        return this.prisma.room.findMany({ where });
    }

    async getWithEquipmentBatch(ids: string[]): Promise<(Room & { equipment: RoomEquipment[]; accessibility: RoomAccessibility[] })[]> {
        if (!ids.length) return [];
        const where: Record<string, unknown> = { id: { in: ids } };
        return this.prisma.room.findMany({ where, include: { equipment: true, accessibility: true } });
    }

    async getPartitionTree(roomId: string): Promise<RoomPartition[]> {
        const asParent = await this.prisma.roomPartition.findMany({
            where: { parentRoomId: roomId },
        });
        const asChild = await this.prisma.roomPartition.findMany({
            where: { childRoomId: roomId },
        });

        // Deduplicate by partition id
        const seen = new Set<string>();
        const result: RoomPartition[] = [];
        for (const p of [...asParent, ...asChild]) {
            if (!seen.has(p.id)) {
                seen.add(p.id);
                result.push(p);
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
        const room = await this.prisma.room.findUnique({ where: { id } });
        if (!room) {
            return null;
        }

        const equipment = await this.prisma.roomEquipment.findMany({
            where: { roomId: id },
        });
        const accessibility = await this.prisma.roomAccessibility.findMany({
            where: { roomId: id },
        });

        return {
            ...room,
            equipment,
            accessibility,
        };
    }

    async update(
        id: string,
        data: Partial<Omit<Room, "id" | "createdAt" | "updatedAt">>,
    ): Promise<Room> {
        return this.prisma.room.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.room.delete({ where: { id } });
    }

    async addEquipment(
        roomId: string,
        tag: string,
    ): Promise<RoomEquipment> {
        return this.prisma.roomEquipment.create({
            data: { roomId, tag },
        });
    }

    async removeEquipment(roomId: string, tag: string): Promise<void> {
        await this.prisma.roomEquipment.delete({
            where: { roomId_tag: { roomId, tag } },
        });
    }

    async addAccessibility(
        roomId: string,
        attribute: string,
    ): Promise<RoomAccessibility> {
        return this.prisma.roomAccessibility.create({
            data: { roomId, attribute },
        });
    }

    async removeAccessibility(
        roomId: string,
        attribute: string,
    ): Promise<void> {
        // Find and delete the specific accessibility record
        const records = await this.prisma.roomAccessibility.findMany({
            where: { roomId, attribute },
        });
        if (records.length > 0) {
            await this.prisma.roomAccessibility.delete({
                where: { id: records[0].id },
            });
        }
    }

    async createPartition(
        data: Omit<RoomPartition, "id">,
    ): Promise<RoomPartition> {
        return this.prisma.roomPartition.create({ data });
    }

    async deletePartition(id: string): Promise<void> {
        await this.prisma.roomPartition.delete({ where: { id } });
    }

    async getOperatingHours(
        locationNodeId: string,
    ): Promise<OperatingHours[]> {
        return this.prisma.operatingHours.findMany({
            where: { locationNodeId },
        });
    }

    async setOperatingHours(
        locationNodeId: string,
        hours: Omit<OperatingHours, "id" | "locationNodeId">[],
    ): Promise<OperatingHours[]> {
        return this.prisma.$transaction(async (tx) => {
            // Delete all existing operating hours for this location
            const existing = await tx.operatingHours.findMany({
                where: { locationNodeId },
            });
            for (const record of existing) {
                await tx.operatingHours.delete({ where: { id: record.id } });
            }

            // Create new operating hours
            const created: OperatingHours[] = [];
            for (const entry of hours) {
                const record = await tx.operatingHours.create({
                    data: {
                        locationNodeId,
                        ...entry,
                    },
                });
                created.push(record);
            }

            return created;
        });
    }
}
