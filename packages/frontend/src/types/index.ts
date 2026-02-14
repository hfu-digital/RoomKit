// ─── Enums ────────────────────────────────────────────────────

export enum LocationNodeType {
    INSTITUTION = "institution",
    CAMPUS = "campus",
    BUILDING = "building",
    FLOOR = "floor",
    WING = "wing",
    ROOM = "room",
}

export enum BookingStatus {
    REQUESTED = "requested",
    CONFIRMED = "confirmed",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
}

export enum RecurrenceFrequency {
    WEEKLY = "weekly",
    BIWEEKLY = "biweekly",
    CUSTOM = "custom",
}

export enum RecurrenceModType {
    ORIGINAL = "original",
    MODIFIED = "modified",
    DETACHED = "detached",
}

export enum BlackoutScope {
    ROOM = "room",
    FLOOR = "floor",
    BUILDING = "building",
    CAMPUS = "campus",
    INSTITUTION = "institution",
}

export enum ExamLayoutType {
    EVERY_OTHER_SEAT = "every-other-seat",
    FULL = "full",
}

export enum ConflictResolutionType {
    REJECT_NEW = "reject_new",
    DISPLACE_EXISTING = "displace_existing",
    MANUAL = "manual",
}

export enum BulkOperationType {
    SEMESTER_IMPORT = "semester_import",
    DATE_SHIFT = "date_shift",
    BATCH_CANCEL = "batch_cancel",
}

export enum BulkOperationStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
}

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
    createdAt: string;
    updatedAt: string;
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
    createdAt: string;
    updatedAt: string;
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
    startsAt: string;
    endsAt: string;
    status: BookingStatus;
    priority: number;
    purposeType: string;
    version: number;
    idempotencyKey: string | null;
    recurrenceRuleId: string | null;
    recurrenceModType: RecurrenceModType | null;
    metadata: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BookingStateTransition {
    id: string;
    bookingId: string;
    fromStatus: BookingStatus | null;
    toStatus: BookingStatus;
    triggeredBy: string;
    reason: string | null;
    timestamp: string;
}

// ─── Recurrence ────────────────────────────────────────────────

export interface RecurrenceRule {
    id: string;
    frequency: RecurrenceFrequency;
    daysOfWeek: number[];
    calendarWeeks: number[] | null;
    seriesStartsAt: string;
    seriesEndsAt: string;
    exceptionDates: string[];
    createdAt: string;
    updatedAt: string;
}

// ─── Blackout ──────────────────────────────────────────────────

export interface BlackoutWindow {
    id: string;
    locationNodeId: string;
    scope: BlackoutScope;
    title: string;
    reason: string | null;
    startsAt: string;
    endsAt: string;
    isRecurring: boolean;
    recurrenceRuleId: string | null;
    createdAt: string;
}

// ─── Conflict ──────────────────────────────────────────────────

export interface ConflictRecord {
    id: string;
    bookingAId: string;
    bookingBId: string;
    resolutionType: ConflictResolutionType;
    resolvedBy: string | null;
    resolvedAt: string | null;
    createdAt: string;
}

// ─── Config ────────────────────────────────────────────────────

export interface ConfigEntry {
    id: string;
    locationNodeId: string | null;
    key: string;
    value: string;
    inheritFromParent: boolean;
    createdAt: string;
    updatedAt: string;
}

// ─── Priority ──────────────────────────────────────────────────

export interface PriorityTier {
    id: string;
    name: string;
    weight: number;
    createdAt: string;
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
    createdAt: string;
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
    createdAt: string;
    completedAt: string | null;
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
    startsAt: string;
    endsAt: string;
    score: number;
}

export interface TimeSlot {
    startsAt: string;
    endsAt: string;
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

// ─── Pagination ────────────────────────────────────────────────

export interface Pagination {
    cursor?: string;
    limit: number;
}

export interface PaginatedResult<T> {
    items: T[];
    nextCursor?: string;
}

// ─── API Response Wrapper ──────────────────────────────────────

export type ApiResponse<T> = {
    data: T;
    error?: string;
};
