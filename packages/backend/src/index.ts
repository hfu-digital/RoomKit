// @hfu.digital/roomkit-nestjs — barrel export

// ─── Module ────────────────────────────────────────────────────
export { RoomKitModule } from "./module";
export type { RoomKitModuleOptions } from "./module";

// ─── Types ─────────────────────────────────────────────────────
export {
    LocationNodeType,
    BookingStatus,
    RecurrenceFrequency,
    RecurrenceModType,
    BlackoutScope,
    ExamLayoutType,
    ConflictResolutionType,
    BulkOperationType,
    BulkOperationStatus,
} from "./types/enums";

export type {
    LocationNode,
    Room,
    RoomEquipment,
    RoomAccessibility,
    RoomPartition,
    OperatingHours,
    Booking,
    BookingStateTransition,
    RecurrenceRule,
    BlackoutWindow,
    ConflictRecord,
    ConfigEntry,
    PriorityTier,
    ExamSession,
    BulkOperation,
    ConflictCheckResult,
    AlternativeSuggestion,
    ConflictResolution,
    TimeSlot,
    AvailabilityFilter,
    AvailabilityResult,
    AvailabilityResultItem,
    TravelTimeViolation,
    TravelTimeValidationResult,
    EventMetadata,
    SemesterImportPayload,
    Pagination,
    PaginatedResult,
} from "./types/entities";

export type { RoomKitPrismaClient } from "./types/prisma-delegates";

// ─── Storage Interfaces ───────────────────────────────────────
export { LocationStorage } from "./interfaces/location.storage";
export { RoomStorage } from "./interfaces/room.storage";
export { BookingStorage } from "./interfaces/booking.storage";
export { RecurrenceStorage } from "./interfaces/recurrence.storage";
export { BlackoutStorage } from "./interfaces/blackout.storage";
export { ConflictStorage } from "./interfaces/conflict.storage";
export { ConfigStorage } from "./interfaces/config.storage";
export { AuditStorage } from "./interfaces/audit.storage";
export { PriorityStorage } from "./interfaces/priority.storage";
export { ExamStorage } from "./interfaces/exam.storage";
export { BulkOperationStorage } from "./interfaces/bulk-operation.storage";

// ─── Domain Services ──────────────────────────────────────────
export { LocationService } from "./domain/location.service";
export { RoomService } from "./domain/room.service";
export { BookingService } from "./domain/booking.service";
export { ConflictService } from "./domain/conflict.service";
export { AvailabilityService } from "./domain/availability.service";
export { RecurrenceService } from "./domain/recurrence.service";
export { BlackoutService } from "./domain/blackout.service";
export { ConfigService } from "./domain/config.service";
export { AuditService } from "./domain/audit.service";
export { PriorityService } from "./domain/priority.service";
export { TravelTimeService } from "./domain/travel-time.service";
export { ExamService } from "./domain/exam.service";
export { BulkOperationService } from "./domain/bulk-operation.service";
export { BookingStateMachine } from "./domain/state-machine";

// ─── Events ───────────────────────────────────────────────────
export { EventBus } from "./events/event-bus";
export type { RoomKitEvent, RoomKitEventType, EventPayload } from "./events/event-bus";

// ─── Errors ───────────────────────────────────────────────────
export {
    RoomKitError,
    LocationNotFoundError,
    LocationPathConflictError,
    RoomNotFoundError,
    CapacityExceededError,
    BookingNotFoundError,
    BookingConflictError,
    PartitionConflictError,
    InvalidStateTransitionError,
    StaleVersionError,
    InvalidTimeRangeError,
    RecurrenceConflictError,
    ExamCohortOverlapError,
    BulkOperationPartialError,
    BlackoutConflictError,
    ConfigKeyInvalidError,
    IdempotencyConflictError,
} from "./errors/roomkit.error";

// ─── DTOs ─────────────────────────────────────────────────────
export type { CreateLocationNodeDto, UpdateLocationNodeDto } from "./dto/location.dto";
export { validateCreateLocationNode } from "./dto/location.dto";
export type { CreateRoomDto, UpdateRoomDto, RoomFilterDto } from "./dto/room.dto";
export { validateCreateRoom } from "./dto/room.dto";
export type { CreateBookingDto, UpdateBookingDto, TransitionBookingDto } from "./dto/booking.dto";
export { validateCreateBooking, validateUpdateBooking } from "./dto/booking.dto";

// ─── Prisma Adapters ──────────────────────────────────────────
export { PrismaRoomKitAdapter } from "./adapters/prisma/prisma-roomkit.adapter";
export { PrismaLocationAdapter } from "./adapters/prisma/prisma-location.adapter";
export { PrismaRoomAdapter } from "./adapters/prisma/prisma-room.adapter";
export { PrismaBookingAdapter } from "./adapters/prisma/prisma-booking.adapter";
export { PrismaRecurrenceAdapter } from "./adapters/prisma/prisma-recurrence.adapter";
export { PrismaBlackoutAdapter } from "./adapters/prisma/prisma-blackout.adapter";
export { PrismaConflictAdapter } from "./adapters/prisma/prisma-conflict.adapter";
export { PrismaConfigAdapter } from "./adapters/prisma/prisma-config.adapter";
export { PrismaAuditAdapter } from "./adapters/prisma/prisma-audit.adapter";
export { PrismaPriorityAdapter } from "./adapters/prisma/prisma-priority.adapter";
export { PrismaExamAdapter } from "./adapters/prisma/prisma-exam.adapter";
export { PrismaBulkOperationAdapter } from "./adapters/prisma/prisma-bulk-operation.adapter";

// ─── Seeder ───────────────────────────────────────────────────
export { RoomKitSeeder, seedRoomKit } from "./seeder";
