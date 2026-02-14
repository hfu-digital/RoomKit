/**
 * Base error class and domain-specific error subclasses for the RoomKit library.
 *
 * Every error carries a machine-readable `code` (e.g. 'LOCATION_NOT_FOUND')
 * and a structured `context` object so callers can inspect failure details
 * without parsing human-readable messages.
 */

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

export class RoomKitError extends Error {
    public readonly code: string;
    public readonly context: Record<string, unknown>;

    constructor(code: string, message: string, context: Record<string, unknown> = {}) {
        super(message);
        this.name = 'RoomKitError';
        this.code = code;
        this.context = context;

        // Restore prototype chain (required when extending built-ins in TS)
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

// ---------------------------------------------------------------------------
// Location errors
// ---------------------------------------------------------------------------

export class LocationNotFoundError extends RoomKitError {
    constructor(context: { locationId: string }) {
        super(
            'LOCATION_NOT_FOUND',
            `Location not found: ${context.locationId}`,
            context,
        );
        this.name = 'LocationNotFoundError';
    }
}

export class LocationPathConflictError extends RoomKitError {
    constructor(context: { path: string }) {
        super(
            'LOCATION_PATH_CONFLICT',
            `Location path already exists: ${context.path}`,
            context,
        );
        this.name = 'LocationPathConflictError';
    }
}

// ---------------------------------------------------------------------------
// Room errors
// ---------------------------------------------------------------------------

export class RoomNotFoundError extends RoomKitError {
    constructor(context: { roomId: string }) {
        super(
            'ROOM_NOT_FOUND',
            `Room not found: ${context.roomId}`,
            context,
        );
        this.name = 'RoomNotFoundError';
    }
}

export class CapacityExceededError extends RoomKitError {
    constructor(context: {
        roomId: string;
        required: number;
        available: number;
        capacityType: string;
    }) {
        super(
            'CAPACITY_EXCEEDED',
            `Room ${context.roomId} capacity exceeded: required ${context.required}, available ${context.available} (type: ${context.capacityType})`,
            context,
        );
        this.name = 'CapacityExceededError';
    }
}

// ---------------------------------------------------------------------------
// Booking errors
// ---------------------------------------------------------------------------

export class BookingNotFoundError extends RoomKitError {
    constructor(context: { bookingId: string }) {
        super(
            'BOOKING_NOT_FOUND',
            `Booking not found: ${context.bookingId}`,
            context,
        );
        this.name = 'BookingNotFoundError';
    }
}

export class BookingConflictError extends RoomKitError {
    constructor(context: {
        roomId: string;
        startsAt: string;
        endsAt: string;
        conflictingBookingId: string;
    }) {
        super(
            'BOOKING_CONFLICT',
            `Booking conflict in room ${context.roomId} from ${context.startsAt} to ${context.endsAt} — conflicts with booking ${context.conflictingBookingId}`,
            context,
        );
        this.name = 'BookingConflictError';
    }
}

export class PartitionConflictError extends RoomKitError {
    constructor(context: {
        roomId: string;
        partitionRoomId: string;
        conflictingBookingId: string;
    }) {
        super(
            'PARTITION_CONFLICT',
            `Partition conflict: room ${context.roomId} partition ${context.partitionRoomId} conflicts with booking ${context.conflictingBookingId}`,
            context,
        );
        this.name = 'PartitionConflictError';
    }
}

// ---------------------------------------------------------------------------
// State & versioning errors
// ---------------------------------------------------------------------------

export class InvalidStateTransitionError extends RoomKitError {
    constructor(context: {
        bookingId: string;
        currentStatus: string;
        attemptedStatus: string;
        allowedTransitions: string[];
    }) {
        super(
            'INVALID_STATE_TRANSITION',
            `Cannot transition booking ${context.bookingId} from "${context.currentStatus}" to "${context.attemptedStatus}". Allowed transitions: [${context.allowedTransitions.join(', ')}]`,
            context,
        );
        this.name = 'InvalidStateTransitionError';
    }
}

export class StaleVersionError extends RoomKitError {
    constructor(context: {
        bookingId: string;
        expectedVersion: number;
        actualVersion: number;
    }) {
        super(
            'STALE_VERSION',
            `Stale version for booking ${context.bookingId}: expected version ${context.expectedVersion}, actual version ${context.actualVersion}`,
            context,
        );
        this.name = 'StaleVersionError';
    }
}

// ---------------------------------------------------------------------------
// Time & recurrence errors
// ---------------------------------------------------------------------------

export class InvalidTimeRangeError extends RoomKitError {
    constructor(context: { startsAt: string; endsAt: string; reason: string }) {
        super(
            'INVALID_TIME_RANGE',
            `Invalid time range from ${context.startsAt} to ${context.endsAt}: ${context.reason}`,
            context,
        );
        this.name = 'InvalidTimeRangeError';
    }
}

export class RecurrenceConflictError extends RoomKitError {
    constructor(context: { ruleId: string; conflictingDates: string[] }) {
        super(
            'RECURRENCE_CONFLICT',
            `Recurrence rule ${context.ruleId} has conflicts on: ${context.conflictingDates.join(', ')}`,
            context,
        );
        this.name = 'RecurrenceConflictError';
    }
}

// ---------------------------------------------------------------------------
// Exam & cohort errors
// ---------------------------------------------------------------------------

export class ExamCohortOverlapError extends RoomKitError {
    constructor(context: {
        cohortId: string;
        existingSessionId: string;
        timeRange: string;
    }) {
        super(
            'EXAM_COHORT_OVERLAP',
            `Exam cohort ${context.cohortId} overlaps with existing session ${context.existingSessionId} during ${context.timeRange}`,
            context,
        );
        this.name = 'ExamCohortOverlapError';
    }
}

// ---------------------------------------------------------------------------
// Bulk operation errors
// ---------------------------------------------------------------------------

export class BulkOperationPartialError extends RoomKitError {
    constructor(context: {
        operationId: string;
        succeeded: number;
        failed: number;
        conflicts: unknown[];
    }) {
        super(
            'BULK_OPERATION_PARTIAL',
            `Bulk operation ${context.operationId} partially failed: ${context.succeeded} succeeded, ${context.failed} failed with ${context.conflicts.length} conflict(s)`,
            context,
        );
        this.name = 'BulkOperationPartialError';
    }
}

// ---------------------------------------------------------------------------
// Blackout errors
// ---------------------------------------------------------------------------

export class BlackoutConflictError extends RoomKitError {
    constructor(context: {
        blackoutId: string;
        locationNodeId: string;
        timeRange: string;
    }) {
        super(
            'BLACKOUT_CONFLICT',
            `Blackout ${context.blackoutId} conflicts with existing bookings at location node ${context.locationNodeId} during ${context.timeRange}`,
            context,
        );
        this.name = 'BlackoutConflictError';
    }
}

// ---------------------------------------------------------------------------
// Configuration errors
// ---------------------------------------------------------------------------

export class ConfigKeyInvalidError extends RoomKitError {
    constructor(context: { key: string; reason: string }) {
        super(
            'CONFIG_KEY_INVALID',
            `Invalid configuration key "${context.key}": ${context.reason}`,
            context,
        );
        this.name = 'ConfigKeyInvalidError';
    }
}

// ---------------------------------------------------------------------------
// Idempotency errors
// ---------------------------------------------------------------------------

export class IdempotencyConflictError extends RoomKitError {
    constructor(context: {
        idempotencyKey: string;
        existingBookingId: string;
    }) {
        super(
            'IDEMPOTENCY_CONFLICT',
            `Idempotency key "${context.idempotencyKey}" already associated with booking ${context.existingBookingId}`,
            context,
        );
        this.name = 'IdempotencyConflictError';
    }
}
