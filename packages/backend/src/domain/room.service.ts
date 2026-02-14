import { Injectable } from "@nestjs/common";
import { RoomStorage } from "../interfaces/room.storage";
import { LocationStorage } from "../interfaces/location.storage";
import type { CreateRoomDto, RoomFilterDto } from "../dto/room.dto";
import { validateCreateRoom } from "../dto/room.dto";
import type {
    Room,
    RoomEquipment,
    RoomAccessibility,
    RoomPartition,
    OperatingHours,
} from "../types/entities";
import { LocationNodeType } from "../types/enums";
import {
    RoomNotFoundError,
    RoomKitError,
} from "../errors/roomkit.error";

@Injectable()
export class RoomService {
    constructor(
        private readonly roomStorage: RoomStorage,
        private readonly locationStorage: LocationStorage,
    ) {}

    /**
     * Creates a new room.
     *
     * Validates the DTO, verifies the locationNodeId points to a location
     * node of type ROOM, then delegates creation to storage.
     */
    async create(dto: CreateRoomDto): Promise<Room> {
        const errors = validateCreateRoom(dto);
        if (errors.length > 0) {
            throw new RoomKitError(
                "VALIDATION_ERROR",
                `Validation failed: ${errors.join(", ")}`,
                { errors },
            );
        }

        const locationNode = await this.locationStorage.getById(
            dto.locationNodeId,
        );
        if (!locationNode) {
            throw new RoomNotFoundError({ roomId: dto.locationNodeId });
        }
        if (locationNode.type !== LocationNodeType.ROOM) {
            throw new RoomKitError(
                "INVALID_LOCATION_TYPE",
                `Location node ${dto.locationNodeId} is of type "${locationNode.type}", expected "${LocationNodeType.ROOM}"`,
                {
                    locationNodeId: dto.locationNodeId,
                    actualType: locationNode.type,
                    expectedType: LocationNodeType.ROOM,
                },
            );
        }

        return this.roomStorage.create({
            locationNodeId: dto.locationNodeId,
            seatedCapacity: dto.seatedCapacity,
            examCapacity: dto.examCapacity,
            standingCapacity: dto.standingCapacity,
            setupBufferMinutes: dto.setupBufferMinutes ?? 0,
            teardownBufferMinutes: dto.teardownBufferMinutes ?? 0,
            isActive: dto.isActive ?? true,
            metadata: dto.metadata ?? null,
        });
    }

    /**
     * Finds a room by its ID.
     */
    async findById(id: string): Promise<Room | null> {
        return this.roomStorage.findById(id);
    }

    /**
     * Finds rooms matching the given compound filter.
     */
    async findByFilter(filter: RoomFilterDto): Promise<Room[]> {
        return this.roomStorage.findByCompoundFilter({
            minCapacity: filter.minCapacity,
            capacityType: filter.capacityType,
            equipment: filter.equipment,
            accessibility: filter.accessibility,
            locationScope: filter.locationScope,
            isActive: filter.isActive,
        });
    }

    /**
     * Returns the partition tree (parent/child relationships) for a room.
     */
    async getPartitionTree(roomId: string): Promise<RoomPartition[]> {
        const room = await this.roomStorage.findById(roomId);
        if (!room) {
            throw new RoomNotFoundError({ roomId });
        }
        return this.roomStorage.getPartitionTree(roomId);
    }

    /**
     * Returns a room with its equipment and accessibility attributes.
     */
    async getWithEquipment(
        id: string,
    ): Promise<
        | (Room & {
              equipment: RoomEquipment[];
              accessibility: RoomAccessibility[];
          })
        | null
    > {
        return this.roomStorage.getWithEquipment(id);
    }

    /**
     * Determines the effective operating hours for a room by walking up the
     * location hierarchy from the room's node to the root. Returns the
     * operating hours from the most specific (closest) ancestor that has
     * them defined.
     */
    async getEffectiveOperatingHours(
        roomId: string,
    ): Promise<OperatingHours[]> {
        const room = await this.roomStorage.findById(roomId);
        if (!room) {
            throw new RoomNotFoundError({ roomId });
        }

        // Check the room's own location node first
        const ownHours = await this.roomStorage.getOperatingHours(
            room.locationNodeId,
        );
        if (ownHours.length > 0) {
            return ownHours;
        }

        // Walk up the ancestors from most specific to least specific
        const ancestors = await this.locationStorage.getAncestors(
            room.locationNodeId,
        );
        for (const ancestor of ancestors) {
            const hours = await this.roomStorage.getOperatingHours(
                ancestor.id,
            );
            if (hours.length > 0) {
                return hours;
            }
        }

        // No operating hours defined at any level
        return [];
    }

    /**
     * Adds an equipment tag to a room.
     */
    async addEquipment(roomId: string, tag: string): Promise<RoomEquipment> {
        const room = await this.roomStorage.findById(roomId);
        if (!room) {
            throw new RoomNotFoundError({ roomId });
        }
        return this.roomStorage.addEquipment(roomId, tag);
    }

    /**
     * Removes an equipment tag from a room.
     */
    async removeEquipment(roomId: string, tag: string): Promise<void> {
        const room = await this.roomStorage.findById(roomId);
        if (!room) {
            throw new RoomNotFoundError({ roomId });
        }
        return this.roomStorage.removeEquipment(roomId, tag);
    }

    /**
     * Adds an accessibility attribute to a room.
     */
    async addAccessibility(
        roomId: string,
        attribute: string,
    ): Promise<RoomAccessibility> {
        const room = await this.roomStorage.findById(roomId);
        if (!room) {
            throw new RoomNotFoundError({ roomId });
        }
        return this.roomStorage.addAccessibility(roomId, attribute);
    }

    /**
     * Removes an accessibility attribute from a room.
     */
    async removeAccessibility(
        roomId: string,
        attribute: string,
    ): Promise<void> {
        const room = await this.roomStorage.findById(roomId);
        if (!room) {
            throw new RoomNotFoundError({ roomId });
        }
        return this.roomStorage.removeAccessibility(roomId, attribute);
    }

    /**
     * Creates a partition relationship between two rooms.
     *
     * Validates both rooms exist and that the child is not already an
     * ancestor of the parent in the partition tree (no circular references).
     */
    async createPartition(
        parentRoomId: string,
        childRoomId: string,
    ): Promise<RoomPartition> {
        const parentRoom = await this.roomStorage.findById(parentRoomId);
        if (!parentRoom) {
            throw new RoomNotFoundError({ roomId: parentRoomId });
        }

        const childRoom = await this.roomStorage.findById(childRoomId);
        if (!childRoom) {
            throw new RoomNotFoundError({ roomId: childRoomId });
        }

        // Check for circular reference: walk up the partition tree from the
        // parent to ensure the child is not already an ancestor.
        const parentPartitions =
            await this.roomStorage.getPartitionTree(parentRoomId);
        if (this.isAncestorInPartitionTree(childRoomId, parentRoomId, parentPartitions)) {
            throw new RoomKitError(
                "CIRCULAR_PARTITION",
                `Cannot create partition: room ${childRoomId} is already an ancestor of room ${parentRoomId} in the partition tree`,
                { parentRoomId, childRoomId },
            );
        }

        return this.roomStorage.createPartition({
            parentRoomId,
            childRoomId,
        });
    }

    /**
     * Deletes a partition relationship by its ID.
     */
    async deletePartition(id: string): Promise<void> {
        return this.roomStorage.deletePartition(id);
    }

    // ─── Private Helpers ─────────────────────────────────────────

    /**
     * Checks whether `candidateAncestorId` is an ancestor of `roomId`
     * in the given partition tree. Walks up parent links recursively.
     */
    private isAncestorInPartitionTree(
        candidateAncestorId: string,
        roomId: string,
        partitions: RoomPartition[],
    ): boolean {
        // Find all partitions where roomId is the child
        const parentLinks = partitions.filter(
            (p) => p.childRoomId === roomId,
        );

        for (const link of parentLinks) {
            if (link.parentRoomId === candidateAncestorId) {
                return true;
            }
            if (
                this.isAncestorInPartitionTree(
                    candidateAncestorId,
                    link.parentRoomId,
                    partitions,
                )
            ) {
                return true;
            }
        }

        return false;
    }
}
