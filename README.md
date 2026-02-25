# RoomKit

Open-source, framework-agnostic room booking library for universities and educational institutions. Ships as two packages: **@hfu.digital/roomkit-nestjs** (backend) and **@hfu.digital/roomkit-react** (frontend).

> **[Full Documentation](https://docs.hfu-digital.de/docs/roomkit)** — Getting started guide, API reference, architecture overview, and examples.

## Features

- **Location hierarchy** — Institution > Campus > Building > Floor > Wing > Room with materialized paths
- **Conflict detection** — Atomic booking creation with partition-aware overlap checking
- **Partition scheduling** — Parent/child room relationships (e.g., a lecture hall divisible into two seminar rooms)
- **Recurrence engine** — Weekly, biweekly, and custom calendar-week patterns with modify-single/this-and-future/all
- **Blackout windows** — Location-scoped maintenance and holiday blocks with cascade resolution
- **Exam mode** — Layout-aware capacity (every-other-seat vs full), cohort conflict checking
- **Bulk operations** — Semester import, date shift, batch cancel with progress tracking
- **Priority-based displacement** — Configurable priority tiers (Lecture > Seminar > Study Group > Open)
- **Travel time validation** — Cross-campus travel time matrix for person schedule validation
- **Optimistic locking** — Version-based concurrent update protection
- **Idempotency** — Duplicate booking prevention via idempotency keys
- **Audit trail** — Append-only booking state transition log
- **Cascading config** — Configuration inheritance through the location hierarchy
- **Event bus** — Type-safe synchronous event emitter for all booking lifecycle events

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- PostgreSQL (recommended) or any Prisma-supported database
- Node.js >= 18

## Quick Start

```bash
# Install packages
bun add @hfu.digital/roomkit-nestjs    # Backend
bun add @hfu.digital/roomkit-react     # Frontend
```

## Backend Integration

### 1. Add the Prisma schema

Copy the models from [PRISMA_SCHEMA.md](./PRISMA_SCHEMA.md) into your `schema.prisma`. Then run:

```bash
bunx prisma migrate dev --name add-roomkit
bunx prisma generate
```

### 2. Register the module

```typescript
import { Module } from "@nestjs/common";
import { RoomKitModule, PrismaRoomKitAdapter } from "@hfu.digital/roomkit-nestjs";
import { PrismaService } from "./prisma.service";

@Module({
    imports: [
        RoomKitModule.register({
            storage: new PrismaRoomKitAdapter(prismaClient),
            priorities: [
                { name: "LECTURE", weight: 100 },
                { name: "SEMINAR", weight: 75 },
                { name: "STUDY_GROUP", weight: 50 },
                { name: "OPEN", weight: 25 },
            ],
            travelTimeMatrix: {
                "north-campus|south-campus": 15,
            },
            features: {
                exams: true,
                bulkOperations: true,
            },
        }),
    ],
})
export class AppModule {}
```

### 3. Inject services

```typescript
import { Controller, Post, Body } from "@nestjs/common";
import { BookingService, AvailabilityService } from "@hfu.digital/roomkit-nestjs";

@Controller("bookings")
export class BookingsController {
    constructor(
        private readonly bookingService: BookingService,
        private readonly availabilityService: AvailabilityService,
    ) {}

    @Post()
    async create(@Body() dto: CreateBookingDto) {
        return this.bookingService.create(dto);
    }
}
```

## Frontend Integration

```tsx
import {
    RoomKitProvider,
    useAvailability,
    AvailabilitySearch,
    RoomCard,
    BookingForm,
} from "@hfu.digital/roomkit-react";

function App() {
    return (
        <RoomKitProvider config={{ apiUrl: "https://api.example.com" }}>
            <RoomBookingPage />
        </RoomKitProvider>
    );
}

function RoomBookingPage() {
    const { data, isLoading } = useAvailability({
        filters: {
            timeRange: { startsAt: new Date(), endsAt: new Date() },
            minCapacity: 30,
        },
    });

    return (
        <div>
            <AvailabilitySearch
                onSearch={(filters) => console.log(filters)}
                equipmentOptions={["projector", "whiteboard", "av-system"]}
                accessibilityOptions={["wheelchair", "hearing-loop"]}
            />
            {data?.items.map((item) => (
                <RoomCard key={item.room.id} room={item.room} />
            ))}
        </div>
    );
}
```

## Architecture

RoomKit uses a **storage interface pattern** — all database access goes through abstract classes (e.g., `BookingStorage`, `RoomStorage`). The bundled `PrismaRoomKitAdapter` implements these interfaces using structurally-typed Prisma delegates, meaning:

- **No `@prisma/client` import** anywhere in RoomKit source code
- Your PrismaClient just needs to match the expected shape
- You can write custom adapters for TypeORM, Drizzle, Knex, or any other ORM

### Custom Adapter Guide

To implement a custom storage adapter:

1. Extend the abstract storage classes (e.g., `BookingStorage`)
2. Implement all abstract methods
3. Pass your adapters to `RoomKitModule.register({ storage: { ... } })`

The critical contract to implement correctly:

- `BookingStorage.createWithConflictCheck()` — **must be atomic**. Check for overlapping bookings and create in a single transaction with serializable isolation.
- `BookingStorage.updateWithVersion()` — **must implement optimistic locking**. Only update if the version matches, otherwise throw `StaleVersionError`.

## API Reference

### Services (Backend)

| Service | Description |
|---------|-------------|
| `LocationService` | Location hierarchy CRUD, tree building, alias resolution |
| `RoomService` | Room CRUD, equipment/accessibility, partition management |
| `BookingService` | Booking lifecycle (create, confirm, check-in, complete, cancel) |
| `ConflictService` | Conflict detection, alternative suggestions, priority resolution |
| `AvailabilityService` | Room search with filtering, scoring, and pagination |
| `RecurrenceService` | Recurring booking creation and modification |
| `BlackoutService` | Blackout window management with impact analysis |
| `ConfigService` | Cascading configuration through location hierarchy |
| `AuditService` | Booking state transition audit log |
| `PriorityService` | Priority tier management and resolution |
| `TravelTimeService` | Cross-campus travel time validation |
| `ExamService` | Exam session scheduling with layout-aware capacity |
| `BulkOperationService` | Semester import, date shift, batch cancel |

### Hooks (Frontend)

| Hook | Description |
|------|-------------|
| `useAvailability` | Search available rooms with debounced filters |
| `useBooking` | Fetch a single booking by ID |
| `useBookings` | List bookings with cursor pagination |
| `useRoomDetail` | Room details with equipment and accessibility |
| `useLocationTree` | Location hierarchy tree |
| `useCreateBooking` | Create a booking with idempotency key |
| `useModifyBooking` | Modify an existing booking |
| `useCancelBooking` | Cancel a booking |
| `useExamSessions` | List exam sessions with filters |
| `useBulkOperationStatus` | Poll bulk operation progress |
| `useRecurrence` | Fetch recurrence rule details |
| `useBlackouts` | List blackouts by location scope |

### Components (Frontend)

| Component | Description |
|-----------|-------------|
| `AvailabilitySearch` | Filter form for room search |
| `RoomCard` | Room summary card with capacity and equipment |
| `BookingTimeline` | Day/week view booking grid |
| `LocationBrowser` | Collapsible location hierarchy tree |
| `BookingForm` | Create/edit booking form with recurrence |
| `ConflictBanner` | Conflict alert with alternatives |
| `BookingStatusBadge` | Color-coded status chip |
| `RecurrenceEditor` | Series modification mode selector |
| `ExamScheduleView` | Exam session grid grouped by cohort |
| `BulkImportProgress` | Bulk operation progress bar |

## Domain Events

| Event | Payload |
|-------|---------|
| `BookingRequested` | `Booking` |
| `BookingConfirmed` | `Booking` |
| `BookingStarted` | `Booking` |
| `BookingCompleted` | `Booking` |
| `BookingCancelled` | `Booking` |
| `BookingModified` | `Booking` |
| `ConflictDetected` | `ConflictRecord` |
| `BlackoutCreated` | `BlackoutWindow` |
| `BlackoutImpactDetected` | `{ blackout, impactedBookings }` |
| `ExamSessionCreated` | `ExamSession` |
| `BulkOperationProgress` | `BulkOperation` |
| `BulkOperationCompleted` | `BulkOperation` |

## Error Types

| Error | Code | Context |
|-------|------|---------|
| `LocationNotFoundError` | `LOCATION_NOT_FOUND` | `{ locationId }` |
| `LocationPathConflictError` | `LOCATION_PATH_CONFLICT` | `{ path }` |
| `RoomNotFoundError` | `ROOM_NOT_FOUND` | `{ roomId }` |
| `CapacityExceededError` | `CAPACITY_EXCEEDED` | `{ roomId, required, available }` |
| `BookingNotFoundError` | `BOOKING_NOT_FOUND` | `{ bookingId }` |
| `BookingConflictError` | `BOOKING_CONFLICT` | `{ roomId, startsAt, endsAt }` |
| `PartitionConflictError` | `PARTITION_CONFLICT` | `{ roomId, partitionRoomId }` |
| `InvalidStateTransitionError` | `INVALID_STATE_TRANSITION` | `{ currentStatus, attemptedStatus }` |
| `StaleVersionError` | `STALE_VERSION` | `{ bookingId, expectedVersion }` |
| `InvalidTimeRangeError` | `INVALID_TIME_RANGE` | `{ startsAt, endsAt }` |
| `RecurrenceConflictError` | `RECURRENCE_CONFLICT` | `{ ruleId, conflictingDates }` |
| `ExamCohortOverlapError` | `EXAM_COHORT_OVERLAP` | `{ cohortId }` |
| `BulkOperationPartialError` | `BULK_OPERATION_PARTIAL` | `{ succeeded, failed }` |

## Important Notes

### Authentication & Authorization

RoomKit is a **domain logic library** — it does **not** handle authentication or authorization. Fields like `requesterId` and `onBehalfOfId` are opaque strings with no verification. Your application must:

- Authenticate users before calling RoomKit services
- Implement authorization checks (e.g., who can book which rooms, who can cancel)
- Scope queries appropriately (e.g., only return a user's own bookings)
- Add NestJS guards or middleware as needed

### Timezone Handling

All `Date` objects in RoomKit use the server's local timezone. For consistent behavior across deployments:

- Run your server with `TZ=UTC` (e.g., `TZ=UTC bun run start`)
- Store and transmit dates as ISO 8601 strings in UTC
- Convert to local timezones only in the frontend presentation layer

### Error Handling

`RoomKitError` subclasses include a `context` object with structured details. When building API responses, **sanitize error context** before returning it to clients to avoid leaking internal IDs or database details:

```typescript
@Catch(RoomKitError)
export class RoomKitExceptionFilter implements ExceptionFilter {
    catch(error: RoomKitError, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse();
        response.status(this.mapStatus(error.code)).json({
            code: error.code,
            message: error.message,
            // Only expose safe context fields
        });
    }
}
```

### Bulk Operations

Bulk operations (semester import, date shift, batch cancel) use a **best-effort** strategy: individual item failures are counted but do not roll back previously succeeded items. Check the `conflictsDetected` field on the returned `BulkOperation` to identify partial failures.

## Development

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Type check
bun run typecheck

# Run tests
bun run test

# Development mode
bun run dev
```

## Project Structure

```
roomkit-monorepo/
├── packages/
│   ├── backend/          # @hfu.digital/roomkit-nestjs
│   │   └── src/
│   │       ├── domain/       # Business logic services
│   │       ├── interfaces/   # Storage abstract classes
│   │       ├── adapters/     # Prisma implementations
│   │       ├── dto/          # Data transfer objects
│   │       ├── errors/       # Error classes
│   │       ├── events/       # Event bus
│   │       ├── types/        # TypeScript types
│   │       ├── module.ts     # NestJS DynamicModule
│   │       └── seeder.ts     # Test data seeder
│   └── frontend/         # @hfu.digital/roomkit-react
│       └── src/
│           ├── components/   # React components
│           ├── hooks/        # React hooks
│           ├── context/      # RoomKitProvider
│           ├── lib/          # API client
│           └── types/        # TypeScript types
├── examples/
│   ├── nestjs-api/       # Example NestJS API
│   └── nextjs-app/       # Example Next.js app
├── PRISMA_SCHEMA.md      # Copy-pasteable Prisma schema
└── turbo.json            # Turborepo config
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT
