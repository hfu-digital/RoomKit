import type { RecurrenceModType } from "../types/enums";

export interface CreateBookingDto {
    roomId: string;
    requesterId: string;
    onBehalfOfId?: string | null;
    title: string;
    description?: string | null;
    startsAt: Date;
    endsAt: Date;
    priority?: number;
    purposeType: string;
    idempotencyKey?: string | null;
    recurrenceRuleId?: string | null;
    recurrenceModType?: RecurrenceModType | null;
    metadata?: string | null;
}

export interface UpdateBookingDto {
    roomId?: string;
    title?: string;
    description?: string | null;
    startsAt?: Date;
    endsAt?: Date;
    priority?: number;
    purposeType?: string;
    onBehalfOfId?: string | null;
    metadata?: string | null;
}

export interface TransitionBookingDto {
    toStatus: string;
    triggeredBy: string;
    reason?: string;
}

export function validateCreateBooking(dto: CreateBookingDto): string[] {
    const errors: string[] = [];
    if (!dto.roomId) {
        errors.push("roomId is required");
    }
    if (!dto.requesterId) {
        errors.push("requesterId is required");
    }
    if (!dto.title || dto.title.trim().length === 0) {
        errors.push("title is required");
    }
    if (!dto.startsAt) {
        errors.push("startsAt is required");
    }
    if (!dto.endsAt) {
        errors.push("endsAt is required");
    }
    if (dto.startsAt && dto.endsAt && dto.startsAt >= dto.endsAt) {
        errors.push("startsAt must be before endsAt");
    }
    if (!dto.purposeType || dto.purposeType.trim().length === 0) {
        errors.push("purposeType is required");
    }
    if (dto.priority !== undefined && (dto.priority < 0 || dto.priority > 100)) {
        errors.push("priority must be between 0 and 100");
    }
    return errors;
}
