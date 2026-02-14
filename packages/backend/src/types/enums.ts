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
