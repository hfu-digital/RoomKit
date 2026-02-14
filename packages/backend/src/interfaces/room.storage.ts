import type {
    Room,
    RoomEquipment,
    RoomAccessibility,
    RoomPartition,
    OperatingHours,
} from "../types/entities";

export abstract class RoomStorage {
    abstract create(
        data: Omit<Room, "id" | "createdAt" | "updatedAt">,
    ): Promise<Room>;

    abstract findById(id: string): Promise<Room | null>;

    abstract findByCompoundFilter(filter: {
        minCapacity?: number;
        capacityType?: "seated" | "exam" | "standing";
        equipment?: string[];
        accessibility?: string[];
        locationScope?: string;
        isActive?: boolean;
    }): Promise<Room[]>;

    abstract getPartitionTree(roomId: string): Promise<RoomPartition[]>;

    abstract getWithEquipment(
        id: string,
    ): Promise<
        | (Room & {
              equipment: RoomEquipment[];
              accessibility: RoomAccessibility[];
          })
        | null
    >;

    abstract update(
        id: string,
        data: Partial<Omit<Room, "id" | "createdAt" | "updatedAt">>,
    ): Promise<Room>;

    abstract delete(id: string): Promise<void>;

    abstract addEquipment(
        roomId: string,
        tag: string,
    ): Promise<RoomEquipment>;

    abstract removeEquipment(
        roomId: string,
        tag: string,
    ): Promise<void>;

    abstract addAccessibility(
        roomId: string,
        attribute: string,
    ): Promise<RoomAccessibility>;

    abstract removeAccessibility(
        roomId: string,
        attribute: string,
    ): Promise<void>;

    abstract createPartition(
        data: Omit<RoomPartition, "id">,
    ): Promise<RoomPartition>;

    abstract deletePartition(id: string): Promise<void>;

    abstract getOperatingHours(
        locationNodeId: string,
    ): Promise<OperatingHours[]>;

    abstract setOperatingHours(
        locationNodeId: string,
        hours: Omit<OperatingHours, "id" | "locationNodeId">[],
    ): Promise<OperatingHours[]>;
}
