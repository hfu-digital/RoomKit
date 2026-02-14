export interface CreateRoomDto {
    locationNodeId: string;
    seatedCapacity: number;
    examCapacity: number;
    standingCapacity: number;
    setupBufferMinutes?: number;
    teardownBufferMinutes?: number;
    isActive?: boolean;
    metadata?: string | null;
}

export interface UpdateRoomDto {
    seatedCapacity?: number;
    examCapacity?: number;
    standingCapacity?: number;
    setupBufferMinutes?: number;
    teardownBufferMinutes?: number;
    isActive?: boolean;
    metadata?: string | null;
}

export interface RoomFilterDto {
    minCapacity?: number;
    capacityType?: "seated" | "exam" | "standing";
    equipment?: string[];
    accessibility?: string[];
    locationScope?: string;
    isActive?: boolean;
}

export function validateCreateRoom(dto: CreateRoomDto): string[] {
    const errors: string[] = [];
    if (!dto.locationNodeId) {
        errors.push("locationNodeId is required");
    }
    if (dto.seatedCapacity < 0) {
        errors.push("seatedCapacity must be non-negative");
    }
    if (dto.examCapacity < 0) {
        errors.push("examCapacity must be non-negative");
    }
    if (dto.standingCapacity < 0) {
        errors.push("standingCapacity must be non-negative");
    }
    if (dto.setupBufferMinutes !== undefined && dto.setupBufferMinutes < 0) {
        errors.push("setupBufferMinutes must be non-negative");
    }
    if (dto.teardownBufferMinutes !== undefined && dto.teardownBufferMinutes < 0) {
        errors.push("teardownBufferMinutes must be non-negative");
    }
    return errors;
}
