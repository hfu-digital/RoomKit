# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-25

### Added

**@hfu.digital/roomkit-nestjs**
- Location hierarchy management (Institution > Campus > Building > Floor > Wing > Room) with materialized paths
- Room management with capacity types (seated, exam, standing), equipment, accessibility, and partition trees
- Booking lifecycle with state machine (REQUESTED > CONFIRMED > IN_PROGRESS > COMPLETED, CANCELLED from any non-terminal)
- Atomic conflict detection with partition-aware overlap checking
- Optimistic locking via version-based concurrent update protection
- Idempotency key support for duplicate booking prevention
- Recurrence engine (weekly, biweekly, custom calendar-week) with modify-single/this-and-future/all
- Blackout window management with location-scoped cascade and impact analysis
- Availability search with compound filtering, scoring, and pagination
- Priority-based displacement with configurable priority tiers
- Cascading configuration through the location hierarchy
- Append-only audit trail for booking state transitions
- Type-safe synchronous event bus with 12 domain events
- Exam session scheduling with layout-aware capacity (every-other-seat, full)
- Bulk operations (semester import, date shift, batch cancel) with progress tracking
- Travel time validation across campus locations
- Prisma adapter using structural typing (no `@prisma/client` import in library source)
- 15 typed domain error classes with machine-readable codes and structured context
- NestJS DynamicModule registration with optional feature flags

**@hfu.digital/roomkit-react**
- `RoomKitProvider` context for API URL and fetch options configuration
- 8 query hooks: `useAvailability`, `useBooking`, `useBookings`, `useRoomDetail`, `useLocationTree`, `useBlackouts`, `useExamSessions`, `useRecurrence`
- 3 mutation hooks: `useCreateBooking`, `useModifyBooking`, `useCancelBooking`
- 1 polling hook: `useBulkOperationStatus`
- 10 presentational components: `AvailabilitySearch`, `RoomCard`, `BookingTimeline`, `LocationBrowser`, `BookingForm`, `ConflictBanner`, `BookingStatusBadge`, `RecurrenceEditor`, `ExamScheduleView`, `BulkImportProgress`
- `ApiClient` class with typed request methods
- Full TypeScript type definitions mirroring backend entities
