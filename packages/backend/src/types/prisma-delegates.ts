/**
 * Structural Prisma delegate types.
 * These types describe the shape a PrismaClient must satisfy WITHOUT importing @prisma/client.
 * Consumers provide their own PrismaClient that matches this structure.
 */

// ─── Generic delegate helpers ──────────────────────────────────

export interface PrismaDelegate<
    TCreate,
    TWhere,
    TUpdate,
    TOrderBy,
    TInclude,
    TResult,
> {
    create(args: { data: TCreate; include?: TInclude }): Promise<TResult>;
    findUnique(args: { where: TWhere; include?: TInclude }): Promise<TResult | null>;
    findMany(args?: {
        where?: Partial<TWhere>;
        orderBy?: TOrderBy;
        include?: TInclude;
        take?: number;
        skip?: number;
        cursor?: TWhere;
    }): Promise<TResult[]>;
    update(args: { where: TWhere; data: TUpdate; include?: TInclude }): Promise<TResult>;
    delete(args: { where: TWhere }): Promise<TResult>;
    count(args?: { where?: Partial<TWhere> }): Promise<number>;
}

// ─── Per-entity where types ────────────────────────────────────

export interface LocationNodeWhere {
    id?: string;
    path?: string;
    parentId?: string | null;
    type?: string;
    isActive?: boolean;
    aliases?: { has?: string };
}

export interface RoomWhere {
    id?: string;
    locationNodeId?: string;
    isActive?: boolean;
    seatedCapacity?: { gte?: number };
    examCapacity?: { gte?: number };
    standingCapacity?: { gte?: number };
}

export interface RoomEquipmentWhere {
    id?: string;
    roomId?: string;
    tag?: string;
    roomId_tag?: { roomId: string; tag: string };
}

export interface RoomAccessibilityWhere {
    id?: string;
    roomId?: string;
    attribute?: string;
}

export interface RoomPartitionWhere {
    id?: string;
    parentRoomId?: string;
    childRoomId?: string;
}

export interface OperatingHoursWhere {
    id?: string;
    locationNodeId?: string;
    dayOfWeek?: number;
}

export interface BookingWhere {
    id?: string;
    roomId?: string;
    requesterId?: string;
    status?: string;
    idempotencyKey?: string;
    recurrenceRuleId?: string;
    recurrenceModType?: string;
    startsAt?: Date | { gte?: Date; lte?: Date; lt?: Date; gt?: Date };
    endsAt?: Date | { gte?: Date; lte?: Date; lt?: Date; gt?: Date };
    version?: number;
    AND?: BookingWhere[];
    OR?: BookingWhere[];
    NOT?: BookingWhere;
}

export interface BookingStateTransitionWhere {
    id?: string;
    bookingId?: string;
    timestamp?: Date | { gte?: Date; lte?: Date };
}

export interface RecurrenceRuleWhere {
    id?: string;
}

export interface BlackoutWindowWhere {
    id?: string;
    locationNodeId?: string | { in?: string[] };
    startsAt?: Date | { lte?: Date };
    endsAt?: Date | { gte?: Date };
    scope?: string;
    AND?: BlackoutWindowWhere[];
    OR?: BlackoutWindowWhere[];
}

export interface ConflictRecordWhere {
    id?: string;
    bookingAId?: string;
    bookingBId?: string;
    OR?: ConflictRecordWhere[];
}

export interface ConfigEntryWhere {
    id?: string;
    locationNodeId?: string | null;
    key?: string;
    locationNodeId_key?: { locationNodeId: string | null; key: string };
}

export interface PriorityTierWhere {
    id?: string;
    name?: string;
}

export interface ExamSessionWhere {
    id?: string;
    bookingId?: string;
    cohortId?: string;
}

export interface BulkOperationWhere {
    id?: string;
    status?: string;
}

// ─── Transaction type ──────────────────────────────────────────

export type TransactionIsolationLevel =
    | "ReadUncommitted"
    | "ReadCommitted"
    | "RepeatableRead"
    | "Serializable";

export interface TransactionOptions {
    isolationLevel?: TransactionIsolationLevel;
}

// ─── Composite PrismaClient shape ──────────────────────────────

export interface RoomKitPrismaClient {
    locationNode: PrismaDelegate<any, LocationNodeWhere, any, any, any, any>;
    room: PrismaDelegate<any, RoomWhere, any, any, any, any>;
    roomEquipment: PrismaDelegate<any, RoomEquipmentWhere, any, any, any, any>;
    roomAccessibility: PrismaDelegate<any, RoomAccessibilityWhere, any, any, any, any>;
    roomPartition: PrismaDelegate<any, RoomPartitionWhere, any, any, any, any>;
    operatingHours: PrismaDelegate<any, OperatingHoursWhere, any, any, any, any>;
    booking: PrismaDelegate<any, BookingWhere, any, any, any, any>;
    bookingStateTransition: PrismaDelegate<any, BookingStateTransitionWhere, any, any, any, any>;
    recurrenceRule: PrismaDelegate<any, RecurrenceRuleWhere, any, any, any, any>;
    blackoutWindow: PrismaDelegate<any, BlackoutWindowWhere, any, any, any, any>;
    conflictRecord: PrismaDelegate<any, ConflictRecordWhere, any, any, any, any>;
    configEntry: PrismaDelegate<any, ConfigEntryWhere, any, any, any, any>;
    priorityTier: PrismaDelegate<any, PriorityTierWhere, any, any, any, any>;
    examSession: PrismaDelegate<any, ExamSessionWhere, any, any, any, any>;
    bulkOperation: PrismaDelegate<any, BulkOperationWhere, any, any, any, any>;
    $transaction<T>(fn: (tx: RoomKitPrismaClient) => Promise<T>, options?: TransactionOptions): Promise<T>;
}
