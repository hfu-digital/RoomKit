# RoomKit — Claude Code Implementation Plan

> A step-by-step execution guide for building RoomKit using Claude Code.  
> Each task is a self-contained prompt you can feed to Claude Code sequentially.  
> Based on the **Kit Library Scaffold** skill adapted to the RoomKit domain.

---

## How to Use This Plan

Each **Task** below is designed as one Claude Code session. The tasks are ordered by dependency — later tasks assume earlier ones are complete. Each task includes:

- **Goal** — what gets built
- **Files touched** — what Claude Code should create or modify
- **Acceptance criteria** — how you know it's done
- **Claude Code prompt** — copy-pasteable prompt to kick off the task

The plan follows the 10-phase timeline from the RoomKit spec but breaks each phase into granular, Claude Code-sized units of work.

---

## Phase 1: Monorepo Skeleton (Week 1)

### Task 1.1 — Initialize Monorepo Root

**Goal:** Create the Bun + Turborepo monorepo with all root config files, empty `packages/backend` and `packages/frontend` workspaces, and the CI pipeline. Everything should build (even if the packages export nothing yet).

**Files created:**
```
/roomkit-monorepo/
├── package.json
├── turbo.json
├── tsconfig.base.json
├── bunfig.toml
├── .gitignore
├── LICENSE (MIT)
├── README.md (placeholder)
├── packages/
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts          # empty barrel export
│   └── frontend/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── src/
│           └── index.ts          # empty barrel export
├── examples/
│   ├── nestjs-api/.gitkeep
│   └── nextjs-app/.gitkeep
└── .github/
    └── workflows/
        └── publish.yml
```

**Acceptance criteria:**
- `bun install` succeeds at root
- `bun run build` succeeds (both packages compile with zero errors)
- `bun run typecheck` passes
- CI workflow is syntactically valid YAML

**Claude Code prompt:**
```
Read the project files /mnt/project/library-skill.md and /mnt/project/roomkit-final-plan.md for context.

Scaffold a Bun + Turborepo monorepo called `roomkit-monorepo` following the Kit Library Scaffold pattern exactly. Use these specifics:

- npm scope: @roomkit
- Backend package: @hfu.digital/roomkit-nestjs (packages/backend)
- Frontend package: @hfu.digital/roomkit-react (packages/frontend)
- Both packages should have empty src/index.ts barrel exports for now
- Root configs: turbo.json, tsconfig.base.json, bunfig.toml, .gitignore
- MIT LICENSE
- .github/workflows/publish.yml using oven-sh/setup-bun@v2
- Placeholder README.md
- Empty examples/nestjs-api and examples/nextjs-app directories

Hard rules:
- Bun only (no npm/yarn/pnpm anywhere)
- TypeScript only (no .js in src/)
- NestJS and React as peerDependencies, never bundled
- "files": ["dist"] in both package.json files
- prepublishOnly scripts in both packages
- Frontend uses Vite Library Mode

After scaffolding, run `bun install` and `bun run build` to verify everything compiles cleanly.
```

---

### Task 1.2 — Backend Package Structure (Empty Shells)

**Goal:** Create the full directory structure inside `packages/backend/src/` with empty placeholder files for every module that RoomKit will need. This gives us the skeleton to fill in incrementally.

**Files created inside `packages/backend/src/`:**
```
src/
├── domain/
│   ├── location.service.ts
│   ├── room.service.ts
│   ├── booking.service.ts
│   ├── conflict.service.ts
│   ├── availability.service.ts
│   ├── recurrence.service.ts
│   ├── blackout.service.ts
│   ├── config.service.ts
│   ├── audit.service.ts
│   ├── priority.service.ts
│   ├── travel-time.service.ts
│   ├── exam.service.ts
│   └── bulk-operation.service.ts
├── interfaces/
│   ├── location.storage.ts
│   ├── room.storage.ts
│   ├── booking.storage.ts
│   ├── recurrence.storage.ts
│   ├── blackout.storage.ts
│   ├── conflict.storage.ts
│   ├── config.storage.ts
│   ├── audit.storage.ts
│   ├── priority.storage.ts
│   ├── exam.storage.ts
│   └── bulk-operation.storage.ts
├── adapters/
│   └── prisma/
│       ├── prisma-location.adapter.ts
│       ├── prisma-room.adapter.ts
│       ├── prisma-booking.adapter.ts
│       ├── prisma-recurrence.adapter.ts
│       ├── prisma-blackout.adapter.ts
│       ├── prisma-conflict.adapter.ts
│       ├── prisma-config.adapter.ts
│       ├── prisma-audit.adapter.ts
│       ├── prisma-priority.adapter.ts
│       ├── prisma-exam.adapter.ts
│       ├── prisma-bulk-operation.adapter.ts
│       └── prisma-roomkit.adapter.ts    # Composite adapter (PrismaRoomKitAdapter)
├── dto/
│   └── (empty, populated per-phase)
├── errors/
│   └── roomkit.error.ts                 # Base error class
├── events/
│   └── event-bus.ts
├── types/
│   ├── entities.ts                      # All entity type definitions
│   ├── enums.ts                         # BookingStatus, LocationType, etc.
│   └── prisma-delegates.ts             # Structural Prisma types
├── module.ts                            # RoomKitModule (DynamicModule)
└── index.ts                             # Barrel export
```

**Acceptance criteria:**
- Every file exists with a minimal placeholder (exported type/class stub)
- `bun run build` still compiles
- Barrel export in `index.ts` re-exports the module and key types

**Claude Code prompt:**
```
In the roomkit-monorepo/packages/backend directory, create the full internal directory structure for the RoomKit backend package. Reference /mnt/project/roomkit-final-plan.md for the complete list of storage interfaces, domain services, and entities.

Create placeholder files for:

1. **types/** — entities.ts with all entity type interfaces (LocationNode, Room, RoomEquipment, RoomAccessibility, RoomPartition, OperatingHours, Booking, BookingStateTransition, RecurrenceRule, BlackoutWindow, ConflictRecord, ConfigEntry, PriorityTier, ExamSession, BulkOperation). Also enums.ts (BookingStatus, LocationNodeType, RecurrenceFrequency, RecurrenceModType, BlackoutScope, BulkOperationType, BulkOperationStatus, ExamLayoutType, ConflictResolutionType). Also prisma-delegates.ts with structural PrismaDelegate types for each entity (NEVER import @prisma/client).

2. **interfaces/** — One abstract class per storage interface from Section 3 of the plan. Each file exports an abstract class with all method signatures but no implementation. Use the exact method signatures from the plan.

3. **domain/** — One @Injectable() service per domain service from Section 4. Each injects the relevant storage abstract class(es). Methods are stubs that throw 'Not implemented'.

4. **adapters/prisma/** — One adapter class per storage interface that implements the abstract class using structural Prisma delegate types. Methods are stubs. Also create prisma-roomkit.adapter.ts as the composite PrismaRoomKitAdapter that takes a single prisma-shaped object and creates all individual adapters.

5. **errors/roomkit.error.ts** — Base RoomKitError class + all error subclasses from Section 6 of the plan with their context payloads.

6. **events/event-bus.ts** — Simple synchronous EventBus with emit(), on(), off() and all event type definitions from Section 5.

7. **dto/** — Empty directory for now.

8. **module.ts** — RoomKitModule with static register() accepting the options shape from Section 8 (storage, priorities, travelTimeMatrix, features, events).

9. **index.ts** — Barrel export of all public API surface.

Every file must be .ts, use abstract classes for interfaces, and NEVER import @prisma/client. Verify it builds with `bun run build`.
```

---

## Phase 2: Location + Room Domain (Week 2)

### Task 2.1 — Entity Types & Enums (Full Implementation)

**Goal:** Replace the placeholder type stubs with fully fleshed-out TypeScript types for LocationNode, Room, RoomEquipment, RoomAccessibility, RoomPartition, and OperatingHours. All fields, all enums, all relationships expressed as types.

**Claude Code prompt:**
```
In roomkit-monorepo/packages/backend/src/types/, fully implement:

1. enums.ts — LocationNodeType (institution, campus, building, floor, wing, room), BookingStatus (requested, confirmed, in_progress, completed, cancelled), RecurrenceFrequency, RecurrenceModType, BlackoutScope, ExamLayoutType, ConflictResolutionType, BulkOperationType, BulkOperationStatus.

2. entities.ts — Full type definitions for ALL entities from the RoomKit plan Section 1. Key rules:
   - All IDs are `string`
   - All timestamps are `Date`
   - Booking.version is `number` (optimistic locking)
   - Booking.priority is `number` (0-100)
   - LocationNode.aliases is `string[]`
   - RecurrenceRule.daysOfWeek is `number[]`
   - RecurrenceRule.calendarWeeks is `number[] | null`
   - RecurrenceRule.exceptionDates is `Date[]`
   - BlackoutWindow.isRecurring is `boolean`
   - ConfigEntry.value is `string` (JSON serialized)
   - ConfigEntry.inheritFromParent is `boolean`
   - All optional foreign keys use `| null`

3. prisma-delegates.ts — Structural typing for each Prisma delegate the adapter will need. Define a PrismaClient-shaped type with delegates for each entity (locationNode, room, roomEquipment, roomAccessibility, roomPartition, operatingHours, booking, bookingStateTransition, recurrenceRule, blackoutWindow, conflictRecord, configEntry, priorityTier, examSession, bulkOperation). Each delegate has the standard create/findUnique/findMany/update/delete/count methods with structurally-typed args. Also include a $transaction method. NEVER import @prisma/client.

Verify with `bun run typecheck`.
```

### Task 2.2 — Location Storage Interface + Prisma Adapter

**Goal:** Fully implement `LocationStorage` abstract class and `PrismaLocationAdapter`.

**Claude Code prompt:**
```
Implement the Location domain layer in roomkit-monorepo/packages/backend:

1. src/interfaces/location.storage.ts — LocationStorage abstract class with methods:
   - createNode(data: Omit<LocationNode, 'id'>): Promise<LocationNode>
   - getById(id: string): Promise<LocationNode | null>
   - getByPath(path: string): Promise<LocationNode | null>
   - getChildren(parentId: string): Promise<LocationNode[]>
   - getAncestors(nodeId: string): Promise<LocationNode[]> (walk up via parentId)
   - queryByScope(scope: { type?: LocationNodeType; parentPath?: string; isActive?: boolean }): Promise<LocationNode[]>
   - resolveAlias(alias: string): Promise<LocationNode | null>
   - update(id: string, data: Partial<Omit<LocationNode, 'id'>>): Promise<LocationNode>
   - delete(id: string): Promise<void>

2. src/adapters/prisma/prisma-location.adapter.ts — Implements LocationStorage using structural Prisma delegate types. The getAncestors method should use materialized path: split the path and query for all nodes whose path is a prefix. No recursive queries needed.

3. src/dto/location.dto.ts — CreateLocationNodeDto and UpdateLocationNodeDto with validation logic (validate path format, required fields, type constraints).

4. src/domain/location.service.ts — Full implementation:
   - Injects LocationStorage
   - createNode(): validates DTO, ensures parent exists if parentId provided, auto-generates path from parent path + displayName slug, checks for path uniqueness
   - getTree(rootId?: string): builds a tree structure from flat nodes
   - resolveAlias(): delegates to storage
   - moveNode(id, newParentId): updates path for node and all descendants
   - All methods that mutate should validate and throw appropriate RoomKitErrors

Verify with `bun run typecheck`. Write the implementation, not stubs.
```

### Task 2.3 — Room Storage Interface + Prisma Adapter + Service

**Goal:** Fully implement Room, RoomEquipment, RoomAccessibility, RoomPartition, and OperatingHours domains.

**Claude Code prompt:**
```
Implement the Room domain layer in roomkit-monorepo/packages/backend:

1. src/interfaces/room.storage.ts — RoomStorage abstract class:
   - create(data: Omit<Room, 'id'>): Promise<Room>
   - findById(id: string): Promise<Room | null>
   - findByCompoundFilter(filter: { minCapacity?: number; capacityType?: 'seated' | 'exam' | 'standing'; equipment?: string[]; accessibility?: string[]; locationScope?: string; isActive?: boolean }): Promise<Room[]>
   - getPartitionTree(roomId: string): Promise<RoomPartition[]>
   - getWithEquipment(id: string): Promise<Room & { equipment: RoomEquipment[]; accessibility: RoomAccessibility[] } | null>
   - update(id: string, data: Partial<Room>): Promise<Room>
   - delete(id: string): Promise<void>
   - addEquipment(roomId: string, tag: string): Promise<RoomEquipment>
   - removeEquipment(roomId: string, tag: string): Promise<void>
   - addAccessibility(roomId: string, attribute: string): Promise<RoomAccessibility>
   - removeAccessibility(roomId: string, attribute: string): Promise<void>
   - createPartition(data: Omit<RoomPartition, 'id'>): Promise<RoomPartition>
   - deletePartition(id: string): Promise<void>
   - getOperatingHours(locationNodeId: string): Promise<OperatingHours[]>
   - setOperatingHours(locationNodeId: string, hours: Omit<OperatingHours, 'id' | 'locationNodeId'>[]): Promise<OperatingHours[]>

2. src/adapters/prisma/prisma-room.adapter.ts — Full Prisma adapter implementing RoomStorage. findByCompoundFilter should build a dynamic where clause. Use structural typing, no @prisma/client import.

3. src/dto/room.dto.ts — CreateRoomDto, UpdateRoomDto, RoomFilterDto with validation.

4. src/domain/room.service.ts — Full implementation:
   - Injects RoomStorage + LocationStorage
   - create(): validates that locationNodeId points to a location of type 'room', validates capacities are positive
   - findAvailableByFilter(): delegates to storage compound filter
   - getPartitionTree(): returns full tree, validates room exists
   - getEffectiveOperatingHours(roomId): walks up location hierarchy to find first defined operating hours (room -> floor -> building -> campus -> institution)
   - manageEquipment/Accessibility: add/remove with validation
   - createPartition(): validates parent and child rooms exist, no circular references

Verify with `bun run typecheck`.
```

### Task 2.4 — Unit Tests for Location + Room

**Goal:** Write comprehensive unit tests for LocationService and RoomService using in-memory mock storage implementations.

**Claude Code prompt:**
```
Create unit tests for the Location and Room domain in roomkit-monorepo/packages/backend:

1. First, add bun test configuration. Add "test": "bun test" to the backend package.json scripts.

2. Create src/__tests__/mocks/mock-location.storage.ts — An in-memory implementation of LocationStorage using a simple Map<string, LocationNode>. All methods fully implemented against the map.

3. Create src/__tests__/mocks/mock-room.storage.ts — Same pattern for RoomStorage with in-memory maps for rooms, equipment, accessibility, partitions, and operating hours.

4. Create src/__tests__/domain/location.service.test.ts:
   - Test createNode with valid data
   - Test createNode rejects invalid parent
   - Test createNode rejects duplicate paths
   - Test getTree builds correct hierarchy
   - Test resolveAlias finds correct node
   - Test moveNode updates path for node and descendants
   - Test getAncestors returns correct chain

5. Create src/__tests__/domain/room.service.test.ts:
   - Test create with valid data
   - Test create rejects non-room location type
   - Test findByCompoundFilter with various filter combinations
   - Test getPartitionTree returns correct tree
   - Test getEffectiveOperatingHours cascades up hierarchy
   - Test equipment add/remove
   - Test accessibility add/remove
   - Test partition creation rejects circular references

Run all tests with `bun test` and ensure they pass.
```

---

## Phase 3: Booking Core (Weeks 3–4)

### Task 3.1 — Booking State Machine

**Goal:** Implement the booking state machine as a standalone, thoroughly tested module.

**Claude Code prompt:**
```
Implement the booking state machine in roomkit-monorepo/packages/backend:

1. Create src/domain/state-machine.ts:
   - Define the state transition map: requested→confirmed, confirmed→in_progress, in_progress→completed, requested→cancelled, confirmed→cancelled, in_progress→cancelled
   - Export a BookingStateMachine class with:
     - canTransition(from: BookingStatus, to: BookingStatus): boolean
     - validateTransition(from: BookingStatus, to: BookingStatus): void (throws InvalidStateTransitionError)
     - getAllowedTransitions(from: BookingStatus): BookingStatus[]
     - isTerminal(status: BookingStatus): boolean
   - completed and cancelled are terminal states (no transitions out)

2. Create src/__tests__/domain/state-machine.test.ts:
   - Test every valid transition
   - Test every invalid transition throws InvalidStateTransitionError with correct context (currentStatus, attemptedStatus, allowedTransitions[])
   - Test terminal state detection
   - Test getAllowedTransitions returns correct set for each state

Run `bun test` and verify all pass.
```

### Task 3.2 — Booking Storage Interface + Prisma Adapter

**Goal:** Implement BookingStorage with the critical atomic conflict check and optimistic locking.

**Claude Code prompt:**
```
Implement BookingStorage in roomkit-monorepo/packages/backend:

1. src/interfaces/booking.storage.ts — BookingStorage abstract class:
   - createWithConflictCheck(booking: Omit<Booking, 'id' | 'version' | 'createdAt' | 'updatedAt'>, conflictScope: { checkPartitions: boolean; checkBuffers: boolean }): Promise<Booking> — MUST be atomic (documented in JSDoc)
   - findOverlapping(roomId: string, startsAt: Date, endsAt: Date, excludeBookingId?: string): Promise<Booking[]>
   - updateWithVersion(id: string, data: Partial<Booking>, expectedVersion: number): Promise<Booking> — throws StaleVersionError if version mismatch
   - findByIdempotencyKey(key: string): Promise<Booking | null>
   - transition(id: string, toStatus: BookingStatus, metadata: { triggeredBy: string; reason?: string }): Promise<{ booking: Booking; transition: BookingStateTransition }>
   - findByPerson(personId: string, timeRange: { startsAt: Date; endsAt: Date }, pagination?: { cursor?: string; limit: number }): Promise<{ items: Booking[]; nextCursor?: string }>
   - findByRoom(roomId: string, timeRange: { startsAt: Date; endsAt: Date }, pagination?: { cursor?: string; limit: number }): Promise<{ items: Booking[]; nextCursor?: string }>
   - findById(id: string): Promise<Booking | null>

2. src/adapters/prisma/prisma-booking.adapter.ts — Full implementation:
   - createWithConflictCheck MUST use $transaction with serializable isolation:
     a. Check for overlapping bookings on the target room
     b. If conflictScope.checkPartitions: walk the partition tree (query RoomPartition for ancestors and descendants of the target room), check overlaps on all related rooms
     c. If conflictScope.checkBuffers: extend the time range by room's setupBufferMinutes/teardownBufferMinutes
     d. If any overlaps found: throw BookingConflictError with conflicting booking ID
     e. If clear: insert the booking with version=1
   - updateWithVersion: WHERE id AND version = expectedVersion, throw StaleVersionError if 0 rows updated
   - transition: validate via state machine, insert BookingStateTransition record, update booking status, all in one transaction
   - Cursor-based pagination using createdAt + id as cursor

3. src/dto/booking.dto.ts — CreateBookingDto, UpdateBookingDto, TransitionBookingDto with validation. CreateBookingDto validates: startsAt < endsAt, both in future, priority 0-100, required fields.

Use structural Prisma delegate types. NEVER import @prisma/client. Verify with `bun run typecheck`.
```

### Task 3.3 — ConflictService

**Goal:** Implement partition-aware conflict detection with alternative room/time suggestions.

**Claude Code prompt:**
```
Implement ConflictService in roomkit-monorepo/packages/backend/src/domain/conflict.service.ts:

Injects: BookingStorage, RoomStorage, ConflictStorage

Methods:

1. checkConflicts(roomId: string, startsAt: Date, endsAt: Date, excludeBookingId?: string): Promise<ConflictCheckResult>
   - Finds direct overlaps on the target room
   - Walks partition tree: gets all ancestors and descendants of the room, checks overlaps on each
   - Returns { hasConflict: boolean, directConflicts: Booking[], partitionConflicts: { roomId: string, booking: Booking }[] }

2. suggestAlternatives(roomId: string, startsAt: Date, endsAt: Date, filter?: { minCapacity?: number; equipment?: string[] }): Promise<AlternativeSuggestion[]>
   - Finds rooms with similar capacity and equipment that are free during the requested time
   - Also suggests alternative time slots on the same room (next 3 available slots of the same duration)
   - Returns sorted by relevance (same room different time first, then similar rooms same time)

3. resolveByPriority(existingBooking: Booking, newBooking: { priority: number; requesterId: string }): ConflictResolution
   - Compares priorities: higher priority wins
   - Equal priority: first-come-first-served (existing wins)
   - Returns { winner: 'existing' | 'new', action: 'reject_new' | 'displace_existing', alternatives: AlternativeSuggestion[] }

4. recordResolution(data: Omit<ConflictRecord, 'id'>): Promise<ConflictRecord>
   - Delegates to ConflictStorage

Also create src/interfaces/conflict.storage.ts with:
   - record(data: Omit<ConflictRecord, 'id'>): Promise<ConflictRecord>
   - findByBooking(bookingId: string): Promise<ConflictRecord[]>

And the corresponding Prisma adapter.

Define proper result types (ConflictCheckResult, AlternativeSuggestion, ConflictResolution) in types/entities.ts.

Write full implementation, not stubs. Verify with `bun run typecheck`.
```

### Task 3.4 — BookingService (Full Implementation)

**Goal:** Wire together BookingStorage, ConflictService, state machine, EventBus, and PriorityService into the main BookingService.

**Claude Code prompt:**
```
Fully implement BookingService in roomkit-monorepo/packages/backend/src/domain/booking.service.ts:

Injects: BookingStorage, ConflictService, RoomStorage, PriorityService, EventBus, BookingStateMachine

Methods:

1. create(dto: CreateBookingDto): Promise<Booking>
   - Check idempotencyKey: if exists, return existing booking
   - Resolve priority from PriorityService (lookup by purposeType or use provided numeric)
   - Validate room exists, validate time is within operating hours
   - Delegate to BookingStorage.createWithConflictCheck()
   - Emit BookingRequested event
   - Return the created booking

2. confirm(id: string, triggeredBy: string): Promise<Booking>
   - Delegate to storage.transition(id, 'confirmed', { triggeredBy })
   - Emit BookingConfirmed event

3. checkIn(id: string, triggeredBy: string): Promise<Booking>
   - transition to in_progress
   - Emit BookingStarted event

4. complete(id: string, triggeredBy: string): Promise<Booking>
   - transition to completed
   - Emit BookingCompleted event

5. cancel(id: string, triggeredBy: string, reason?: string): Promise<Booking>
   - transition to cancelled
   - Emit BookingCancelled event

6. modify(id: string, changes: UpdateBookingDto, expectedVersion: number): Promise<Booking>
   - Load current booking, validate not terminal
   - If time or room changed: re-run conflict check via ConflictService
   - updateWithVersion (optimistic lock)
   - Emit BookingModified event

7. delegate(id: string, onBehalfOfId: string, triggeredBy: string): Promise<Booking>
   - Updates onBehalfOfId field
   - Emits BookingModified event

8. getByPerson(personId, timeRange, pagination): delegates to storage
9. getByRoom(roomId, timeRange, pagination): delegates to storage
10. getById(id): delegates to storage

Also implement PriorityService in src/domain/priority.service.ts:
   - Injects PriorityStorage
   - getAll(): returns all tiers
   - resolve(purposeType: string): number — maps purpose type to weight, falls back to OPEN weight
   - upsert(tier: Omit<PriorityTier, 'id'>): Promise<PriorityTier>
   - seedDefaults(): creates LECTURE=100, SEMINAR=75, STUDY_GROUP=50, OPEN=25 if not exist

And PriorityStorage interface + Prisma adapter.

Verify with `bun run typecheck`.
```

### Task 3.5 — Booking Core Unit Tests

**Goal:** Heavy unit test coverage for BookingService, ConflictService, and state machine integration.

**Claude Code prompt:**
```
Write comprehensive unit tests for the booking core in roomkit-monorepo/packages/backend:

1. Create src/__tests__/mocks/mock-booking.storage.ts — In-memory BookingStorage:
   - createWithConflictCheck: checks overlaps in memory, supports partition checking via a provided partition map
   - updateWithVersion: checks version match
   - findByIdempotencyKey: simple map lookup
   - transition: validates via state machine, creates transition record
   - Cursor-based pagination over in-memory arrays

2. Create src/__tests__/mocks/mock-conflict.storage.ts
3. Create src/__tests__/mocks/mock-priority.storage.ts

4. src/__tests__/domain/booking.service.test.ts — Test cases:
   - Create booking succeeds with valid data
   - Create booking with idempotency key returns existing on duplicate
   - Create booking fails when room has time conflict (BookingConflictError)
   - Create booking fails when partition parent is booked (PartitionConflictError)
   - Create booking fails when partition child is booked
   - Create booking respects buffer times
   - Confirm/checkIn/complete happy path transitions
   - Cancel from each valid state
   - Cancel from completed throws InvalidStateTransitionError
   - Modify with stale version throws StaleVersionError
   - Modify with time change re-checks conflicts
   - Modify to conflicting time fails cleanly (booking unchanged)
   - Priority resolution: higher priority displaces lower

5. src/__tests__/domain/conflict.service.test.ts:
   - Direct overlap detection
   - Partition tree conflict detection (ancestor blocks descendant and vice versa)
   - suggestAlternatives returns sorted results
   - resolveByPriority with different and equal priorities

Run `bun test` — all must pass. Aim for 90%+ line coverage on domain services.
```

---

## Phase 4: Recurrence (Week 5)

### Task 4.1 — RecurrenceStorage + RecurrenceService

**Claude Code prompt:**
```
Implement the recurrence domain in roomkit-monorepo/packages/backend:

1. src/interfaces/recurrence.storage.ts — RecurrenceStorage abstract class:
   - createRule(data: Omit<RecurrenceRule, 'id'>): Promise<RecurrenceRule>
   - getRuleById(id: string): Promise<RecurrenceRule | null>
   - updateRule(id: string, data: Partial<RecurrenceRule>): Promise<RecurrenceRule>
   - deleteRule(id: string): Promise<void>
   - getInstancesByRule(ruleId: string): Promise<Booking[]>
   - deleteInstancesByRule(ruleId: string, filter?: { after?: Date; modTypeFilter?: RecurrenceModType[] }): Promise<number>

2. src/adapters/prisma/prisma-recurrence.adapter.ts — Full Prisma adapter with structural typing.

3. src/domain/recurrence.service.ts — Full implementation. Injects RecurrenceStorage, BookingStorage, ConflictService.

   expandSeries(rule: RecurrenceRule): Date[]
   - Given a rule with frequency, daysOfWeek, calendarWeeks, seriesStartsAt, seriesEndsAt, exceptionDates
   - Returns array of concrete dates
   - weekly: every week on specified days
   - biweekly: every other week on specified days
   - custom: only on specified calendar weeks + days
   - Excludes exceptionDates

   createRecurringBooking(bookingTemplate: CreateBookingDto, rule: Omit<RecurrenceRule, 'id'>): Promise<{ rule: RecurrenceRule; bookings: Booking[]; conflicts: RecurrenceConflictError | null }>
   - Creates the rule
   - Expands to dates
   - Creates a Booking for each date (same room, time-of-day, requester, etc.)
   - Runs conflict detection on each instance
   - If ANY conflicts: returns RecurrenceConflictError with conflicting dates but still creates non-conflicting ones (partial success)
   - All bookings link to recurrenceRuleId, modType = 'original'

   modifySingle(bookingId: string, changes: UpdateBookingDto): Promise<Booking>
   - Sets recurrenceModType = 'modified'
   - Applies changes
   - Re-runs conflict check

   modifyThisAndFuture(bookingId: string, changes: UpdateBookingDto): Promise<{ newRule: RecurrenceRule; bookings: Booking[] }>
   - Splits rule: original gets seriesEndsAt = targetDate - 1 day
   - Creates new rule starting at targetDate with changes
   - Deletes future 'original' instances from old rule
   - Expands new rule into bookings
   - Batch conflict detection

   modifyAll(ruleId: string, changes: UpdateBookingDto): Promise<{ bookings: Booking[]; skipped: Booking[] }>
   - Deletes all 'original' instances (skip 'modified'/'detached')
   - Updates rule
   - Re-expands
   - Batch conflict detection
   - Returns both created bookings and skipped (modified) ones

Verify with `bun run typecheck`.
```

### Task 4.2 — Recurrence Unit Tests

**Claude Code prompt:**
```
Write comprehensive recurrence tests in roomkit-monorepo/packages/backend:

1. src/__tests__/mocks/mock-recurrence.storage.ts — In-memory implementation.

2. src/__tests__/domain/recurrence.service.test.ts:
   - expandSeries: weekly on Mon/Wed for 4 weeks → 8 dates
   - expandSeries: biweekly on Fri for 6 weeks → 3 dates
   - expandSeries: custom with specific calendar weeks
   - expandSeries: respects exception dates
   - createRecurringBooking: happy path creates all instances
   - createRecurringBooking: partial conflicts returns error with specific dates but creates non-conflicting
   - modifySingle: marks booking as modified, changes applied
   - modifySingle: conflict on single instance throws error
   - modifyThisAndFuture: splits series correctly, original rule shortened, new rule created
   - modifyThisAndFuture: future instances replaced, past untouched
   - modifyAll: re-expands series, skips 'modified' bookings
   - modifyAll: returns skipped list
   - Edge case: modifyAll after modifySingle — the single-edited instance is skipped

Run `bun test` — all must pass.
```

---

## Phase 5: Availability Engine (Week 6)

### Task 5.1 — AvailabilityService

**Claude Code prompt:**
```
Implement AvailabilityService in roomkit-monorepo/packages/backend/src/domain/availability.service.ts:

This is the hot path — it powers the "find me a room" search. Injects: RoomStorage, BookingStorage, BlackoutStorage, ConfigService.

Methods:

1. search(filters: AvailabilityFilter, pagination: { cursor?: string; limit: number }): Promise<AvailabilityResult>
   
   AvailabilityFilter:
   - timeRange: { startsAt: Date; endsAt: Date } (required)
   - minCapacity?: number
   - capacityType?: 'seated' | 'exam' | 'standing'
   - requiredEquipment?: string[]
   - requiredAccessibility?: string[]
   - locationScope?: string (materialized path prefix)
   - excludeRoomIds?: string[]

   Logic:
   a. Query rooms matching hard constraints (capacity, equipment, accessibility, location scope) via RoomStorage.findByCompoundFilter
   b. For each candidate room, check: is it free during the time range? (BookingStorage.findOverlapping)
   c. Check blackout windows for each room's location hierarchy
   d. Check operating hours via ConfigService cascade
   e. Score remaining rooms by soft constraints (exact capacity match scores higher than oversized, preferred equipment match, etc.)
   f. Return sorted by score, cursor-paginated

   AvailabilityResult:
   - items: { room: Room & { equipment: RoomEquipment[]; accessibility: RoomAccessibility[] }; score: number; availableSlots?: TimeSlot[] }[]
   - nextCursor?: string
   - totalMatching: number

2. findNextAvailable(roomId: string, after: Date, duration: number, limit: number): Promise<TimeSlot[]>
   - Finds the next N available time slots of the given duration for a specific room
   - Respects operating hours, blackouts, and existing bookings
   - Returns up to `limit` slots

Define AvailabilityFilter, AvailabilityResult, TimeSlot types in types/entities.ts.

Verify with `bun run typecheck`.
```

---

## Phase 6: Config + Blackouts + Events + Errors (Week 7)

### Task 6.1 — ConfigService with Cascade Resolution

**Claude Code prompt:**
```
Implement the config cascade system in roomkit-monorepo/packages/backend:

1. src/interfaces/config.storage.ts — ConfigStorage abstract class:
   - set(locationNodeId: string | null, key: string, value: string): Promise<ConfigEntry>
   - get(locationNodeId: string | null, key: string): Promise<ConfigEntry | null>
   - resolve(locationNodeId: string, key: string): Promise<ConfigEntry | null>
   - getAll(locationNodeId?: string | null): Promise<ConfigEntry[]>
   - delete(locationNodeId: string | null, key: string): Promise<void>

2. src/adapters/prisma/prisma-config.adapter.ts — resolve() must walk up the location hierarchy: given a room's locationNodeId, get the node's ancestors via LocationStorage, then query ConfigEntry for each ancestor from most-specific to least-specific, returning the first match. If a ConfigEntry has inheritFromParent=false, stop the walk.

3. src/domain/config.service.ts:
   - Injects ConfigStorage, LocationStorage
   - set(scope, key, value): validates key format, stores
   - resolve(locationNodeId, key): delegates to storage cascade
   - resolveMany(locationNodeId, keys: string[]): batch resolve
   - getEffectiveConfig(locationNodeId): returns all resolved config entries for a location

Also implement BlackoutService:

4. src/interfaces/blackout.storage.ts — BlackoutStorage:
   - create(data: Omit<BlackoutWindow, 'id'>): Promise<BlackoutWindow>
   - findActiveForScope(locationNodeId: string, timeRange: { startsAt: Date; endsAt: Date }): Promise<BlackoutWindow[]> — returns blackouts at room level + building + campus (cascade up)
   - findById(id: string): Promise<BlackoutWindow | null>
   - delete(id: string): Promise<void>

5. src/domain/blackout.service.ts:
   - create(): validates dates, optionally creates recurrence rule if isRecurring
   - getActiveBlackouts(locationNodeId, timeRange): gets cascaded blackouts
   - analyzeImpact(blackout: BlackoutWindow): Promise<Booking[]> — finds existing bookings that fall within the new blackout window across all affected rooms
   - Emits BlackoutCreated and BlackoutImpactDetected events

Also implement EventBus fully:

6. src/events/event-bus.ts:
   - Type-safe synchronous event emitter
   - Define event types as a discriminated union: { type: 'BookingRequested', payload: Booking, metadata: EventMetadata } | { type: 'BookingConfirmed', ... } | etc.
   - EventMetadata: { triggeredBy: string; correlationId?: string; timestamp: Date }
   - emit(event): void — calls all registered handlers synchronously
   - on(type, handler): () => void (returns unsubscribe fn)
   - off(type, handler): void

Verify with `bun run typecheck`.
```

### Task 6.2 — AuditStorage + AuditService

**Claude Code prompt:**
```
Implement the audit layer in roomkit-monorepo/packages/backend:

1. src/interfaces/audit.storage.ts — AuditStorage abstract class:
   - append(entry: Omit<BookingStateTransition, 'id'>): Promise<BookingStateTransition>
   - queryByBooking(bookingId: string): Promise<BookingStateTransition[]>
   - queryByTimeRange(range: { startsAt: Date; endsAt: Date }, pagination: { cursor?: string; limit: number }): Promise<{ items: BookingStateTransition[]; nextCursor?: string }>

2. src/adapters/prisma/prisma-audit.adapter.ts — Append-only writes (no update/delete methods). Read queries with cursor pagination.

3. src/domain/audit.service.ts:
   - Injects AuditStorage
   - getBookingHistory(bookingId): returns full transition history ordered by timestamp
   - queryAuditLog(timeRange, pagination): delegates with pagination
   - This service is read-only for consumers. Writes happen internally via BookingStorage.transition()

Verify with `bun run typecheck`.
```

---

## Phase 7: Exam Mode + Bulk Operations (Weeks 8–9)

### Task 7.1 — ExamService

**Claude Code prompt:**
```
Implement ExamService in roomkit-monorepo/packages/backend:

1. src/interfaces/exam.storage.ts — ExamStorage:
   - createSession(data: Omit<ExamSession, 'id'>): Promise<ExamSession>
   - findById(id: string): Promise<ExamSession | null>
   - findByBooking(bookingId: string): Promise<ExamSession | null>
   - findConflictingCohort(cohortId: string, timeRange: { startsAt: Date; endsAt: Date }): Promise<ExamSession[]>
   - delete(id: string): Promise<void>

2. src/adapters/prisma/prisma-exam.adapter.ts

3. src/domain/exam.service.ts — Injects ExamStorage, BookingService, RoomStorage:
   - createExamSession(dto): Promise<ExamSession>
     a. Validate cohort doesn't have overlapping exam session (throw ExamCohortOverlapError)
     b. Calculate effective capacity based on layoutType: 'every-other-seat' uses examCapacity, 'full' uses seatedCapacity
     c. Validate room has sufficient exam capacity (throw CapacityExceededError)
     d. Create booking via BookingService with exam buffers added to the time range
     e. Create ExamSession linked to booking
     f. Emit ExamSessionCreated event
   - findByFilters(filters): search with cohort, time range, room
   - calculateCapacity(roomId, layoutType): returns available capacity for exam layout

Verify with `bun run typecheck`.
```

### Task 7.2 — BulkOperationService

**Claude Code prompt:**
```
Implement BulkOperationService in roomkit-monorepo/packages/backend:

1. src/interfaces/bulk-operation.storage.ts — BulkOperationStorage:
   - create(data: Omit<BulkOperation, 'id' | 'createdAt'>): Promise<BulkOperation>
   - updateProgress(id: string, update: { processedItems: number; conflictsDetected: number; status?: BulkOperationStatus }): Promise<BulkOperation>
   - getResult(id: string): Promise<BulkOperation | null>

2. src/adapters/prisma/prisma-bulk-operation.adapter.ts

3. src/domain/bulk-operation.service.ts — Injects BulkOperationStorage, BookingService, RecurrenceService, EventBus:

   semesterImport(payload: SemesterImportPayload): Promise<BulkOperation>
   - SemesterImportPayload: { entries: { roomId, startsAt, endsAt, requesterId, purposeType, recurrence?: RecurrenceRule }[] }
   - Creates BulkOperation record with status='processing'
   - Iterates entries: for each, creates booking (or recurring booking)
   - On conflict: records conflict, continues to next entry
   - Emits BulkOperationProgress events periodically
   - On completion: updates BulkOperation with result summary
   - Returns BulkOperation with status='completed' or 'failed'

   dateShift(ruleFilter: { recurrenceRuleId?: string; roomId?: string; timeRange?: TimeRange }, shiftDays: number): Promise<BulkOperation>
   - Finds all matching bookings
   - Shifts each by N days
   - Re-checks conflicts for each shifted booking
   - Records conflicts, applies non-conflicting shifts

   batchCancel(filter: { roomId?: string; timeRange?: TimeRange; requesterId?: string }, reason: string, triggeredBy: string): Promise<BulkOperation>
   - Finds all matching bookings that are not terminal
   - Cancels each via BookingService.cancel()
   - Returns operation summary

Define SemesterImportPayload type. Handle partial failures gracefully: throw BulkOperationPartialError with succeeded/failed/conflicts counts.

Verify with `bun run typecheck`.
```

---

## Phase 8: Frontend Package (Weeks 10–11)

### Task 8.1 — Frontend Types + Provider + Core Hooks

**Claude Code prompt:**
```
Implement the frontend package foundation in roomkit-monorepo/packages/frontend:

1. src/types/index.ts — Mirror all entity types from the backend (LocationNode, Room, Booking, etc.) as plain TypeScript types (no NestJS decorators). Also define API response types with pagination.

2. src/context/RoomKitProvider.tsx:
   - RoomKitConfig: { apiUrl: string; fetchOptions?: RequestInit }
   - Creates context, provides useRoomKitConfig() hook
   - Exports RoomKitProvider component

3. src/lib/api-client.ts:
   - Internal fetch wrapper that reads apiUrl from context
   - Handles errors, JSON parsing, pagination params
   - Methods: get(path, params?), post(path, body), put(path, body), delete(path)

4. Core data-fetching hooks in src/hooks/:
   - useAvailability(filters, pagination) — GET /availability with debounced filter changes
   - useBooking(id) — GET /bookings/:id, returns { data, isLoading, error, refetch }
   - useBookings(filters, pagination) — GET /bookings with cursor pagination
   - useRoomDetail(id) — GET /rooms/:id with equipment/accessibility
   - useLocationTree(scope?) — GET /locations/tree

5. Core mutation hooks:
   - useCreateBooking() — POST /bookings, generates idempotency key (crypto.randomUUID), returns { mutate, isLoading, error }
   - useModifyBooking() — PUT /bookings/:id
   - useCancelBooking() — POST /bookings/:id/cancel

All hooks use plain fetch + React state (useState, useEffect, useCallback). No external dependencies required. Use AbortController for cleanup. Accept optional onSuccess/onError callbacks.

Do NOT import anything from Next.js. Do NOT use tanstack-query (keep it as optional peer if consumers want it).

6. src/index.ts — Barrel export of all hooks, types, provider, components.

Verify: `bun run build` produces dist/ with ESM + CJS outputs and .d.ts files.
```

### Task 8.2 — Frontend Components

**Claude Code prompt:**
```
Implement pre-built components in roomkit-monorepo/packages/frontend/src/components/:

All components accept className prop. No hard-coded CSS framework. Ship minimal inline styles as defaults. Use semantic HTML.

1. AvailabilitySearch.tsx — Compound filter form:
   - Capacity number input
   - Equipment checkboxes (configurable via props)
   - Accessibility checkboxes
   - Time range picker (date + time inputs)
   - Location scope selector (uses useLocationTree data)
   - Debounced onChange callback with filter object
   - Props: { onSearch, equipmentOptions, accessibilityOptions, className }

2. RoomCard.tsx — Room summary card:
   - Room name, location path
   - Capacity badges (seated, exam, standing)
   - Equipment tags
   - Accessibility icons
   - Props: { room, onClick?, className }

3. BookingTimeline.tsx — Week/day grid:
   - Renders bookings as blocks on a time grid
   - Day view or week view toggle
   - Color-coded by status
   - Click handler on empty slots and existing bookings
   - Props: { bookings, view: 'day' | 'week', date, onSlotClick?, onBookingClick?, className }

4. LocationBrowser.tsx — Collapsible tree:
   - Renders location hierarchy as expandable tree
   - Click to select a node
   - Shows node type icon
   - Props: { tree, onSelect, selectedId?, className }

5. BookingForm.tsx — Create/edit form:
   - Room selector, time inputs, purpose type, requester
   - Client-side validation matching backend DTO rules
   - Recurrence toggle with pattern options
   - Props: { onSubmit, initialData?, rooms?, className }

6. ConflictBanner.tsx — Conflict alert:
   - Shows conflict details: conflicting booking, room, time
   - Suggested alternatives as clickable options
   - Props: { conflict, alternatives, onSelectAlternative?, className }

7. BookingStatusBadge.tsx — Color-coded chip:
   - Props: { status: BookingStatus; className }

8. RecurrenceEditor.tsx — Series modification choice:
   - Three radio options: "This instance", "This and future", "Entire series"
   - Confirm button
   - Props: { onConfirm: (mode: 'single' | 'thisAndFuture' | 'all') => void; className }

Verify: `bun run build` succeeds. All components are exported from index.ts.
```

### Task 8.3 — Launch Second-Tier Frontend Components

**Claude Code prompt:**
```
Add launch second-tier components to roomkit-monorepo/packages/frontend:

1. src/hooks/useExamSessions.ts — GET /exams with filters (cohortId, timeRange, roomId)
2. src/hooks/useBulkOperationStatus.ts — GET /bulk-operations/:id, polls for progress updates

3. src/components/ExamScheduleView.tsx:
   - Grid showing exam sessions grouped by cohort
   - Time blocks with room assignment, capacity usage
   - Color-coded by layout type
   - Props: { sessions, onSessionClick?, className }

4. src/components/BulkImportProgress.tsx:
   - Progress bar (processedItems / totalItems)
   - Conflict summary list
   - Status indicator (pending/processing/completed/failed)
   - Auto-refreshes via useBulkOperationStatus
   - Props: { operationId, onComplete?, className }

Also add the remaining hooks:
5. src/hooks/useRecurrence.ts — GET /recurrence/:ruleId, returns series overview with instance count and modification count
6. src/hooks/useBlackouts.ts — GET /blackouts?locationScope=... with cascade

Update barrel export. Verify: `bun run build` succeeds.
```

---

## Phase 9: Travel Time (Week 11)

### Task 9.1 — TravelTimeService

**Claude Code prompt:**
```
Implement TravelTimeService in roomkit-monorepo/packages/backend/src/domain/travel-time.service.ts:

Injects: BookingStorage, LocationStorage

Constructor receives travelTimeMatrix: Record<string, number> where keys are 'campusA|campusB' and values are minutes.

Methods:

1. validatePersonSchedule(personId: string, proposedBooking: { roomId: string; startsAt: Date; endsAt: Date }): Promise<TravelTimeValidationResult>
   - Get all confirmed bookings for the person on the same day
   - For each adjacent pair (existing booking end → proposed booking start, and proposed booking end → next booking start):
     a. Resolve both rooms to their campus (walk up LocationNode tree to find campus ancestor)
     b. Look up travel time in matrix (try both 'a|b' and 'b|a')
     c. If gap between bookings < required travel time → violation
   - Return: { valid: boolean; violations: TravelTimeViolation[] }
   - TravelTimeViolation: { fromCampus, toCampus, requiredMinutes, availableMinutes, conflictingBookingId }

2. getTravelTime(fromLocationId: string, toLocationId: string): Promise<number | null>
   - Resolves both locations to campus level
   - Returns travel time from matrix, or null if not configured

Define TravelTimeValidationResult and TravelTimeViolation in types/entities.ts.

This is an on-demand service — the consuming app calls it explicitly. It does NOT auto-run on every booking creation (that's the consumer's choice via events).

Verify with `bun run typecheck`.
```

---

## Phase 10: Polish (Weeks 12–13)

### Task 10.1 — PrismaRoomKitAdapter (Composite)

**Claude Code prompt:**
```
Implement the composite PrismaRoomKitAdapter in roomkit-monorepo/packages/backend/src/adapters/prisma/prisma-roomkit.adapter.ts:

This is the single entry point for Prisma users. It takes a structurally-typed PrismaClient and creates all individual adapters.

export class PrismaRoomKitAdapter {
  readonly location: PrismaLocationAdapter;
  readonly room: PrismaRoomAdapter;
  readonly booking: PrismaBookingAdapter;
  readonly recurrence: PrismaRecurrenceAdapter;
  readonly blackout: PrismaBlackoutAdapter;
  readonly conflict: PrismaConflictAdapter;
  readonly config: PrismaConfigAdapter;
  readonly audit: PrismaAuditAdapter;
  readonly priority: PrismaPriorityAdapter;
  readonly exam: PrismaExamAdapter;
  readonly bulkOperation: PrismaBulkOperationAdapter;

  constructor(prisma: RoomKitPrismaClient) {
    // Initialize all adapters with the appropriate delegates
  }
}

Define RoomKitPrismaClient type (the structural type consumers' PrismaClient must satisfy) in types/prisma-delegates.ts.

Update module.ts — RoomKitModule.register() should accept either the composite adapter or individual storages:

interface RoomKitModuleOptions {
  storage: PrismaRoomKitAdapter | {
    location: LocationStorage;
    room: RoomStorage;
    booking: BookingStorage;
    recurrence: RecurrenceStorage;
    blackout: BlackoutStorage;
    conflict: ConflictStorage;
    config: ConfigStorage;
    audit: AuditStorage;
    priority: PriorityStorage;
    exam?: ExamStorage;
    bulkOperation?: BulkOperationStorage;
  };
  priorities?: { name: string; weight: number }[];
  travelTimeMatrix?: Record<string, number>;
  features?: { exams?: boolean; bulkOperations?: boolean };
  events?: Partial<Record<string, (event: any) => void>>;
}

The register() method should:
- Unwrap PrismaRoomKitAdapter into individual storage providers if used
- Only register exam/bulk services if features.exams/bulkOperations is true
- Wire event handlers to EventBus
- Seed default priority tiers if priorities provided
- Export all services

Verify with `bun run typecheck`.
```

### Task 10.2 — PRISMA_SCHEMA.md + Reference Migration

**Claude Code prompt:**
```
Create the Prisma schema reference in roomkit-monorepo:

1. PRISMA_SCHEMA.md at the monorepo root — a complete, copy-pasteable Prisma schema containing all RoomKit models:
   - LocationNode, Room, RoomEquipment, RoomAccessibility, RoomPartition, OperatingHours
   - Booking, BookingStateTransition, RecurrenceRule
   - BlackoutWindow, ConflictRecord, ConfigEntry, PriorityTier
   - ExamSession, BulkOperation
   - All relations defined correctly
   - All indexes from Section 10 of the plan:
     @@index([roomId, startsAt, endsAt]) on Booking
     @@index([requesterId, startsAt]) on Booking
     @@index([recurrenceRuleId]) on Booking
     @@unique([idempotencyKey]) on Booking (partial: where not null — note this as a comment since Prisma doesn't support partial unique natively)
     @@unique([path]) on LocationNode
     @@index([parentId]) on LocationNode
     @@unique([roomId, tag]) on RoomEquipment
     @@index([locationNodeId, startsAt, endsAt]) on BlackoutWindow
     @@index([cohortId]) on ExamSession
     @@unique([locationNodeId, key]) on ConfigEntry
   - Enums: BookingStatus, LocationNodeType, RecurrenceFrequency, RecurrenceModType, BlackoutScope, ExamLayoutType, ConflictResolutionType, BulkOperationType, BulkOperationStatus

2. prisma/reference-migration/ directory with a baseline SQL migration that consumers can use as a starting point (PostgreSQL dialect).

Include a note at the top: "Add these models to YOUR schema.prisma. RoomKit does not own your database."
```

### Task 10.3 — RoomKitSeeder

**Claude Code prompt:**
```
Create a seeder utility in roomkit-monorepo/packages/backend/src/seeder.ts:

Export a RoomKitSeeder class that populates a realistic campus setup:

1. Location hierarchy:
   - 1 institution: "University of Example"
   - 2 campuses: "North Campus", "South Campus"  
   - 4 buildings: 2 per campus (A, B on North; C, D on South)
   - 8 floors: 2 per building
   - ~50 rooms total spread across floors, with realistic names (A-201, B-105, etc.)

2. Room properties:
   - Mix of sizes: small (20 seated), medium (50), large (100), lecture hall (200)
   - Equipment: projector (80% of rooms), whiteboard (90%), av-system (40%), lab-fume-hood (5%)
   - Accessibility: wheelchair (60%), hearing-loop (30%), adjustable-desks (20%)
   - Some rooms with partitions (3 pairs)
   - Operating hours: 8am-10pm weekdays, 9am-5pm weekends

3. Bookings: ~100 bookings over a week
   - Mix of statuses
   - Some recurring (weekly lectures)
   - A few conflicts for testing

4. Priority tiers: LECTURE=100, SEMINAR=75, STUDY_GROUP=50, OPEN=25

5. A couple of blackout windows (maintenance)

6. Config entries: default booking duration, buffer times

The seeder takes storage interfaces as constructor args (not Prisma directly), so it works with any adapter.

Export: RoomKitSeeder class and seed() method.
Also export from the main barrel index.ts.
```

### Task 10.4 — README.md + Custom Adapter Guide

**Claude Code prompt:**
```
Write the full README.md for roomkit-monorepo following the Kit Library Scaffold template:

1. Overview — What RoomKit is: an open-source, framework-agnostic room booking library with NestJS + React packages
2. Features — Core features list: location hierarchy, conflict detection, partition-aware scheduling, recurrence, blackouts, exam mode, bulk operations, priority-based displacement, travel time validation
3. Prerequisites — Bun >= 1.0
4. Quick Start — bun add @hfu.digital/roomkit-nestjs @hfu.digital/roomkit-react
5. Prisma Schema Reference — Link to PRISMA_SCHEMA.md + inline snippet of the most important models
6. Backend Integration — Full code example of RoomKitModule.register() with PrismaRoomKitAdapter
7. Frontend Integration — Full code example of RoomKitProvider + useAvailability + BookingForm
8. Architecture Overview — Brief explanation of storage interface pattern, why abstract classes, how Prisma adapter works
9. Custom Adapter Guide — Step-by-step for implementing RoomStorage + BookingStorage with TypeORM, Drizzle, or Knex. Emphasize the atomic createWithConflictCheck contract and optimistic locking requirement.
10. API Reference — Table of all exported services, hooks, and components with brief description
11. Domain Events — List of all events with payload shapes
12. Error Types — Table of all error classes with context payloads
13. Development — bun install → bun run build → bun run dev → bun test
14. Contributing — Link to CONTRIBUTING.md
15. License — MIT

Also create CONTRIBUTING.md with PR guidelines, architecture overview, and test requirements.
```

### Task 10.5 — Example NestJS API

**Claude Code prompt:**
```
Create a fully runnable example NestJS API in roomkit-monorepo/examples/nestjs-api:

1. package.json with @nestjs/* deps, @hfu.digital/roomkit-nestjs (workspace:*), prisma, @prisma/client
2. prisma/schema.prisma — SQLite database with all RoomKit models from PRISMA_SCHEMA.md
3. src/app.module.ts — Imports RoomKitModule.register() with PrismaRoomKitAdapter
4. src/controllers/:
   - locations.controller.ts — CRUD + tree endpoints
   - rooms.controller.ts — CRUD + filter + equipment/accessibility management
   - bookings.controller.ts — Create, modify, cancel, transition, search by person/room
   - availability.controller.ts — Search endpoint
   - recurrence.controller.ts — Create recurring, modify single/thisAndFuture/all
   - blackouts.controller.ts — CRUD
   - exams.controller.ts — Create exam session, search
   - bulk-operations.controller.ts — Semester import, date shift, batch cancel
5. src/main.ts — Bootstrap with Swagger
6. Seed script: runs RoomKitSeeder on startup in dev mode
7. README in examples/nestjs-api explaining how to run: bun install → bunx prisma migrate dev → bun run start:dev

This should be a working API that someone can clone and run in 2 minutes.
```

### Task 10.6 — Example Next.js App

**Claude Code prompt:**
```
Create a minimal Next.js example app in roomkit-monorepo/examples/nextjs-app:

1. package.json with next, react, @hfu.digital/roomkit-react (workspace:*)
2. src/app/layout.tsx — Wraps children in RoomKitProvider pointing to localhost:3000/api
3. src/app/page.tsx — Main page with:
   - AvailabilitySearch component
   - Grid of RoomCard components showing results
   - Click on a room → shows BookingTimeline
4. src/app/book/page.tsx — BookingForm for creating a booking
5. src/app/locations/page.tsx — LocationBrowser component
6. Basic styling with Tailwind CSS
7. README explaining: bun install → bun run dev (requires the nestjs-api example running)

This is a demo app showing all frontend components wired together.
```

---

## Final Verification Checklist

### Task FINAL — Integration Test + Build Verification

**Claude Code prompt:**
```
Run the full verification checklist for roomkit-monorepo:

1. From root: `bun install` — must succeed
2. `bun run build` — both packages must compile with zero errors
3. `bun run typecheck` — zero type errors across all packages
4. `bun test` — all tests pass in packages/backend
5. Verify barrel exports: import { RoomKitModule, PrismaRoomKitAdapter, BookingService, ConflictService, AvailabilityService } from the built dist/index.js — all must resolve
6. Verify frontend build: dist/ contains index.js, index.es.js, index.d.ts
7. Verify no @prisma/client imports anywhere in packages/backend/src: grep -r "@prisma/client" packages/backend/src/ should return nothing
8. Verify no npm/npx/yarn/pnpm anywhere: grep -r "npm \|npx \|yarn \|pnpm " --include="*.json" --include="*.yml" --include="*.md" should only match documentation explaining what NOT to use
9. Verify all .ts/.tsx files in src/ (no .js): find packages/ -path "*/src/*.js" should return nothing
10. List all exports from packages/backend/src/index.ts and verify completeness against the plan

Report any failures with file paths and error messages.
```

---

## Task Dependency Graph

```
1.1 Monorepo Scaffold
 └── 1.2 Backend Structure (empty shells)
      ├── 2.1 Entity Types & Enums
      │    ├── 2.2 Location Storage + Service
      │    │    └── 2.4 Location + Room Tests
      │    └── 2.3 Room Storage + Service
      │         └── 2.4 Location + Room Tests
      │              ├── 3.1 State Machine
      │              │    └── 3.2 Booking Storage + Adapter
      │              │         └── 3.3 ConflictService
      │              │              └── 3.4 BookingService
      │              │                   └── 3.5 Booking Tests
      │              │                        ├── 4.1 RecurrenceService
      │              │                        │    └── 4.2 Recurrence Tests
      │              │                        ├── 5.1 AvailabilityService
      │              │                        ├── 6.1 Config + Blackout + Events
      │              │                        │    └── 6.2 Audit
      │              │                        ├── 7.1 ExamService
      │              │                        └── 7.2 BulkOperationService
      │              └── 9.1 TravelTimeService
      └── 8.1 Frontend Types + Provider + Hooks ──→ 8.2 Components ──→ 8.3 Launch Components
           
10.1 Composite Adapter ─┐
10.2 Prisma Schema      ├── 10.4 README + Docs
10.3 Seeder            ─┤
                        ├── 10.5 Example NestJS API
                        └── 10.6 Example Next.js App
                              └── FINAL Verification
```

---

## Estimated Token Budget per Task

| Task | Complexity | Estimated Output |
|------|-----------|-----------------|
| 1.1 | Low | ~2K lines (configs) |
| 1.2 | Medium | ~3K lines (stubs) |
| 2.1 | Medium | ~500 lines (types) |
| 2.2 | Medium | ~400 lines |
| 2.3 | High | ~600 lines |
| 2.4 | Medium | ~500 lines (tests) |
| 3.1 | Low | ~150 lines |
| 3.2 | High | ~500 lines |
| 3.3 | High | ~400 lines |
| 3.4 | High | ~500 lines |
| 3.5 | High | ~700 lines (tests) |
| 4.1 | High | ~500 lines |
| 4.2 | Medium | ~400 lines (tests) |
| 5.1 | High | ~350 lines |
| 6.1 | High | ~600 lines |
| 6.2 | Low | ~200 lines |
| 7.1 | Medium | ~300 lines |
| 7.2 | High | ~400 lines |
| 8.1 | High | ~600 lines |
| 8.2 | High | ~800 lines |
| 8.3 | Medium | ~400 lines |
| 9.1 | Medium | ~250 lines |
| 10.1 | Medium | ~300 lines |
| 10.2 | Medium | ~300 lines (schema) |
| 10.3 | Medium | ~400 lines |
| 10.4 | Medium | ~500 lines (docs) |
| 10.5 | High | ~800 lines |
| 10.6 | Medium | ~400 lines |

**Total: ~28 tasks, ~12,450 lines estimated**
