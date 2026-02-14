import type {
    LocationNodeType,
    BookingStatus,
    RecurrenceFrequency,
    RecurrenceModType,
    BlackoutScope,
    ExamLayoutType,
    ConflictResolutionType,
    BulkOperationType,
    BulkOperationStatus,
} from "./enums";

// ─── Location Hierarchy ────────────────────────────────────────

export interface LocationNode {
    id: string;
    parentId: string | null;
    type: LocationNodeType;
    displayName: string;
    path: string;
    aliases: string[];
    isActive: boolean;
    metadata: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Room ──────────────────────────────────────────────────────

export interface Room {
    id: string;
    locationNodeId: string;
    seatedCapacity: number;
    examCapacity: number;
    standingCapacity: number;
    setupBufferMinutes: number;
    teardownBufferMinutes: number;
    isActive: boolean;
    metadata: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface RoomEquipment {
    id: string;
    roomId: string;
    tag: string;
}

export interface RoomAccessibility {
    id: string;
    roomId: string;
    attribute: string;
}

export interface RoomPartition {
    id: string;
    parentRoomId: string;
    childRoomId: string;
}

export interface OperatingHours {
    id: string;
    locationNodeId: string;
    dayOfWeek: number;
    opensAt: string;
    closesAt: string;
}

// ─── Booking ───────────────────────────────────────────────────

export interface Booking {
    id: string;
    roomId: string;
    requesterId: string;
    onBehalfOfId: string | null;
    title: string;
    description: string | null;
    startsAt: Date;
    endsAt: Date;
    status: BookingStatus;
    priority: number;
    purposeType: string;
    version: number;
    idempotencyKey: string | null;
    recurrenceRuleId: string | null;
    recurrenceModType: RecurrenceModType | null;
    metadata: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface BookingStateTransition {
    id: string;
    bookingId: string;
    fromStatus: BookingStatus | null;
    toStatus: BookingStatus;
    triggeredBy: string;
    reason: string | null;
    timestamp: Date;
}

// ─── Recurrence ────────────────────────────────────────────────

export interface RecurrenceRule {
    id: string;
    frequency: RecurrenceFrequency;
    daysOfWeek: number[];
    calendarWeeks: number[] | null;
    seriesStartsAt: Date;
    seriesEndsAt: Date;
    exceptionDates: Date[];
    createdAt: Date;
    updatedAt: Date;
}

// ─── Blackout ──────────────────────────────────────────────────

export interface BlackoutWindow {
    id: string;
    locationNodeId: string;
    scope: BlackoutScope;
    title: string;
    reason: string | null;
    startsAt: Date;
    endsAt: Date;
    isRecurring: boolean;
    recurrenceRuleId: string | null;
    createdAt: Date;
}

// ─── Conflict ──────────────────────────────────────────────────

export interface ConflictRecord {
    id: string;
    bookingAId: string;
    bookingBId: string;
    resolutionType: ConflictResolutionType;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    createdAt: Date;
}

// ─── Config ────────────────────────────────────────────────────

export interface ConfigEntry {
    id: string;
    locationNodeId: string | null;
    key: string;
    value: string;
    inheritFromParent: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Priority ──────────────────────────────────────────────────

export interface PriorityTier {
    id: string;
    name: string;
    weight: number;
    createdAt: Date;
}

// ─── Exam ──────────────────────────────────────────────────────

export interface ExamSession {
    id: string;
    bookingId: string;
    cohortId: string;
    layoutType: ExamLayoutType;
    requiredCapacity: number;
    supervisorIds: string[];
    metadata: string | null;
    createdAt: Date;
}

// ─── Bulk Operation ────────────────────────────────────────────

export interface BulkOperation {
    id: string;
    type: BulkOperationType;
    status: BulkOperationStatus;
    totalItems: number;
    processedItems: number;
    conflictsDetected: number;
    resultSummary: string | null;
    triggeredBy: string;
    createdAt: Date;
    completedAt: Date | null;
}

// ─── Domain Result Types ───────────────────────────────────────

export interface ConflictCheckResult {
    hasConflict: boolean;
    directConflicts: Booking[];
    partitionConflicts: { roomId: string; booking: Booking }[];
}

export interface AlternativeSuggestion {
    type: "same_room_different_time" | "different_room_same_time";
    room: Room | null;
    startsAt: Date;
    endsAt: Date;
    score: number;
}

export interface ConflictResolution {
    winner: "existing" | "new";
    action: "reject_new" | "displace_existing";
    alternatives: AlternativeSuggestion[];
}

export interface TimeSlot {
    startsAt: Date;
    endsAt: Date;
}

export interface AvailabilityFilter {
    timeRange: { startsAt: Date; endsAt: Date };
    minCapacity?: number;
    capacityType?: "seated" | "exam" | "standing";
    requiredEquipment?: string[];
    requiredAccessibility?: string[];
    locationScope?: string;
    excludeRoomIds?: string[];
}

export interface AvailabilityResultItem {
    room: Room & { equipment: RoomEquipment[]; accessibility: RoomAccessibility[] };
    score: number;
    availableSlots?: TimeSlot[];
}

export interface AvailabilityResult {
    items: AvailabilityResultItem[];
    nextCursor?: string;
    totalMatching: number;
}

export interface TravelTimeViolation {
    fromCampus: string;
    toCampus: string;
    requiredMinutes: number;
    availableMinutes: number;
    conflictingBookingId: string;
}

export interface TravelTimeValidationResult {
    valid: boolean;
    violations: TravelTimeViolation[];
}

export interface EventMetadata {
    triggeredBy: string;
    correlationId?: string;
    timestamp: Date;
}

export interface SemesterImportPayload {
    entries: {
        roomId: string;
        startsAt: Date;
        endsAt: Date;
        requesterId: string;
        purposeType: string;
        title: string;
        recurrence?: Omit<RecurrenceRule, "id" | "createdAt" | "updatedAt">;
    }[];
}

export interface Pagination {
    cursor?: string;
    limit: number;
}

export interface PaginatedResult<T> {
    items: T[];
    nextCursor?: string;
}
