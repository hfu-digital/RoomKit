import type { LocationNodeType } from "../types/enums";

export interface CreateLocationNodeDto {
    parentId: string | null;
    type: LocationNodeType;
    displayName: string;
    aliases?: string[];
    isActive?: boolean;
    metadata?: string | null;
}

export interface UpdateLocationNodeDto {
    displayName?: string;
    aliases?: string[];
    isActive?: boolean;
    metadata?: string | null;
}

export function validateCreateLocationNode(dto: CreateLocationNodeDto): string[] {
    const errors: string[] = [];
    if (!dto.displayName || dto.displayName.trim().length === 0) {
        errors.push("displayName is required");
    }
    if (!dto.type) {
        errors.push("type is required");
    }
    if (dto.displayName && dto.displayName.length > 255) {
        errors.push("displayName must be 255 characters or less");
    }
    return errors;
}
