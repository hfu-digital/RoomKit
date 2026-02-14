# RoomKit Prisma Schema Reference

> **Add these models to YOUR `schema.prisma`.** RoomKit does not own your database.
> Copy-paste the block below and adjust the `datasource`/`generator` to match your project.

```prisma
// ──────────────────────────────────────────────────────────────
// RoomKit Prisma Schema Reference
// Add these models to YOUR schema.prisma.
// RoomKit does not own your database.
// ──────────────────────────────────────────────────────────────

enum LocationNodeType {
    institution
    campus
    building
    floor
    wing
    room
}

enum BookingStatus {
    requested
    confirmed
    in_progress
    completed
    cancelled
}

enum RecurrenceFrequency {
    weekly
    biweekly
    custom
}

enum RecurrenceModType {
    original
    modified
    detached
}

enum BlackoutScope {
    room
    floor
    building
    campus
    institution
}

enum ExamLayoutType {
    every_other_seat
    full
}

enum ConflictResolutionType {
    reject_new
    displace_existing
    manual
}

enum BulkOperationType {
    semester_import
    date_shift
    batch_cancel
}

enum BulkOperationStatus {
    pending
    processing
    completed
    failed
}

// ─── Location Hierarchy ────────────────────────────────────────

model LocationNode {
    id          String           @id @default(uuid())
    parentId    String?
    parent      LocationNode?    @relation("LocationHierarchy", fields: [parentId], references: [id])
    children    LocationNode[]   @relation("LocationHierarchy")
    type        LocationNodeType
    displayName String
    path        String           @unique
    aliases     String[]
    isActive    Boolean          @default(true)
    metadata    String?
    createdAt   DateTime         @default(now())
    updatedAt   DateTime         @updatedAt

    rooms           Room[]
    operatingHours  OperatingHours[]
    blackoutWindows BlackoutWindow[]
    configEntries   ConfigEntry[]

    @@index([parentId])
}

// ─── Room ──────────────────────────────────────────────────────

model Room {
    id                    String   @id @default(uuid())
    locationNodeId        String
    locationNode          LocationNode @relation(fields: [locationNodeId], references: [id])
    seatedCapacity        Int
    examCapacity          Int
    standingCapacity      Int
    setupBufferMinutes    Int      @default(0)
    teardownBufferMinutes Int      @default(0)
    isActive              Boolean  @default(true)
    metadata              String?
    createdAt             DateTime @default(now())
    updatedAt             DateTime @updatedAt

    equipment        RoomEquipment[]
    accessibility    RoomAccessibility[]
    parentPartitions RoomPartition[]  @relation("ParentRoom")
    childPartitions  RoomPartition[]  @relation("ChildRoom")
    bookings         Booking[]
}

model RoomEquipment {
    id     String @id @default(uuid())
    roomId String
    room   Room   @relation(fields: [roomId], references: [id], onDelete: Cascade)
    tag    String

    @@unique([roomId, tag])
}

model RoomAccessibility {
    id        String @id @default(uuid())
    roomId    String
    room      Room   @relation(fields: [roomId], references: [id], onDelete: Cascade)
    attribute String

    @@unique([roomId, attribute])
}

model RoomPartition {
    id           String @id @default(uuid())
    parentRoomId String
    parentRoom   Room   @relation("ParentRoom", fields: [parentRoomId], references: [id])
    childRoomId  String
    childRoom    Room   @relation("ChildRoom", fields: [childRoomId], references: [id])

    @@unique([parentRoomId, childRoomId])
}

model OperatingHours {
    id             String       @id @default(uuid())
    locationNodeId String
    locationNode   LocationNode @relation(fields: [locationNodeId], references: [id], onDelete: Cascade)
    dayOfWeek      Int          // 0=Sunday, 6=Saturday
    opensAt        String       // "08:00"
    closesAt       String       // "22:00"

    @@unique([locationNodeId, dayOfWeek])
}

// ─── Booking ───────────────────────────────────────────────────

model Booking {
    id                String             @id @default(uuid())
    roomId            String
    room              Room               @relation(fields: [roomId], references: [id])
    requesterId       String
    onBehalfOfId      String?
    title             String
    description       String?
    startsAt          DateTime
    endsAt            DateTime
    status            BookingStatus      @default(requested)
    priority          Int                @default(25)
    purposeType       String
    version           Int                @default(1)
    idempotencyKey    String?
    recurrenceRuleId  String?
    recurrenceRule    RecurrenceRule?    @relation(fields: [recurrenceRuleId], references: [id])
    recurrenceModType RecurrenceModType?
    metadata          String?
    createdAt         DateTime           @default(now())
    updatedAt         DateTime           @updatedAt

    transitions BookingStateTransition[]
    examSession ExamSession?
    conflictsA  ConflictRecord[]         @relation("ConflictBookingA")
    conflictsB  ConflictRecord[]         @relation("ConflictBookingB")

    @@index([roomId, startsAt, endsAt])
    @@index([requesterId, startsAt])
    @@index([recurrenceRuleId])
    @@unique([idempotencyKey]) // Note: Ideally a partial unique where not null
}

model BookingStateTransition {
    id          String        @id @default(uuid())
    bookingId   String
    booking     Booking       @relation(fields: [bookingId], references: [id], onDelete: Cascade)
    fromStatus  BookingStatus?
    toStatus    BookingStatus
    triggeredBy String
    reason      String?
    timestamp   DateTime      @default(now())

    @@index([bookingId, timestamp])
}

// ─── Recurrence ────────────────────────────────────────────────

model RecurrenceRule {
    id             String              @id @default(uuid())
    frequency      RecurrenceFrequency
    daysOfWeek     Int[]
    calendarWeeks  Int[]
    seriesStartsAt DateTime
    seriesEndsAt   DateTime
    exceptionDates DateTime[]
    createdAt      DateTime            @default(now())
    updatedAt      DateTime            @updatedAt

    bookings Booking[]
}

// ─── Blackout ──────────────────────────────────────────────────

model BlackoutWindow {
    id               String       @id @default(uuid())
    locationNodeId   String
    locationNode     LocationNode @relation(fields: [locationNodeId], references: [id])
    scope            BlackoutScope
    title            String
    reason           String?
    startsAt         DateTime
    endsAt           DateTime
    isRecurring      Boolean      @default(false)
    recurrenceRuleId String?
    createdAt        DateTime     @default(now())

    @@index([locationNodeId, startsAt, endsAt])
}

// ─── Conflict ──────────────────────────────────────────────────

model ConflictRecord {
    id             String                @id @default(uuid())
    bookingAId     String
    bookingA       Booking               @relation("ConflictBookingA", fields: [bookingAId], references: [id])
    bookingBId     String
    bookingB       Booking               @relation("ConflictBookingB", fields: [bookingBId], references: [id])
    resolutionType ConflictResolutionType
    resolvedBy     String?
    resolvedAt     DateTime?
    createdAt      DateTime              @default(now())
}

// ─── Config ────────────────────────────────────────────────────

model ConfigEntry {
    id                String        @id @default(uuid())
    locationNodeId    String?
    locationNode      LocationNode? @relation(fields: [locationNodeId], references: [id])
    key               String
    value             String
    inheritFromParent Boolean       @default(true)
    createdAt         DateTime      @default(now())
    updatedAt         DateTime      @updatedAt

    @@unique([locationNodeId, key])
}

// ─── Priority ──────────────────────────────────────────────────

model PriorityTier {
    id        String   @id @default(uuid())
    name      String   @unique
    weight    Int
    createdAt DateTime @default(now())
}

// ─── Exam ──────────────────────────────────────────────────────

model ExamSession {
    id               String        @id @default(uuid())
    bookingId        String        @unique
    booking          Booking       @relation(fields: [bookingId], references: [id])
    cohortId         String
    layoutType       ExamLayoutType
    requiredCapacity Int
    supervisorIds    String[]
    metadata         String?
    createdAt        DateTime      @default(now())

    @@index([cohortId])
}

// ─── Bulk Operation ────────────────────────────────────────────

model BulkOperation {
    id                String              @id @default(uuid())
    type              BulkOperationType
    status            BulkOperationStatus @default(pending)
    totalItems        Int
    processedItems    Int                 @default(0)
    conflictsDetected Int                 @default(0)
    resultSummary     String?
    triggeredBy       String
    createdAt         DateTime            @default(now())
    completedAt       DateTime?
}
```
