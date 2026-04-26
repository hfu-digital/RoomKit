# CLAUDE.md

> For project vision, cross-project architecture, and global code style rules, see the root [CLAUDE.md](../CLAUDE.md).

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is RoomKit

Open-source, framework-agnostic room booking library for universities. Ships as two packages in a Turborepo monorepo: **@hfu.digital/roomkit-nestjs** (backend) and **@hfu.digital/roomkit-react** (frontend).

## Commands

```bash
# Monorepo root (all via Turborepo)
bun run build        # Build all packages
bun run typecheck    # Type-check all packages
bun run test         # Run all tests
bun run dev          # Dev mode (persistent)
bun run clean        # Clean dist directories

# Backend package (packages/backend)
bun test                               # Run all backend tests (bun test runner)
bun test src/__tests__/domain/booking.service.test.ts   # Single test file
bun run build                          # Build via tsup (CJS + ESM + .d.ts)
bun run typecheck                      # tsc --noEmit

# Frontend package (packages/frontend)
bun run build                          # Build via Vite (CJS + ESM + .d.ts)
bun run typecheck                      # tsc --noEmit

# Example NestJS API (examples/nestjs-api)
bun run start:dev                      # NestJS dev server with watch

# Example Next.js App (examples/nextjs-app)
bun run dev                            # Next.js dev server
```

## Architecture

### Monorepo Layout

```
packages/backend/    → @hfu.digital/roomkit-nestjs   (tsup build)
packages/frontend/   → @hfu.digital/roomkit-react    (Vite lib build)
examples/nestjs-api/ → Example NestJS integration
examples/nextjs-app/ → Example Next.js integration
```

Bun workspaces (`packages/*`, `examples/*`). Turborepo orchestrates build/test/typecheck with dependency ordering.

### Backend — Dependency Inversion

The core architectural pattern is **storage interface abstraction**. Domain services depend on abstract classes (not concrete implementations):

```
domain/       → Business logic services (injected via NestJS DI)
interfaces/   → 11 abstract storage classes (BookingStorage, RoomStorage, etc.)
adapters/     → PrismaRoomKitAdapter (implements all 11 interfaces)
dto/          → Validation functions (not class-validator decorators)
errors/       → RoomKitError hierarchy with machine-readable codes + context
events/       → Synchronous EventBus with typed discriminated union events
types/        → Entity interfaces, enums, Prisma structural types
```

**Key invariant**: No `@prisma/client` import anywhere in `packages/backend/src/`. The Prisma adapter uses structural typing (`prisma-delegates.ts`) so consumers can pass any PrismaClient that matches the expected shape.

### Backend — Critical Domain Patterns

- **Atomic conflict checking**: `BookingStorage.createWithConflictCheck()` must check overlaps + partition conflicts + buffer expansion in a single serializable transaction.
- **Optimistic locking**: `updateWithVersion()` only updates when `version` matches, throws `StaleVersionError` on mismatch.
- **Booking state machine**: `REQUESTED → CONFIRMED → IN_PROGRESS → COMPLETED`, with `CANCELLED` reachable from any non-terminal state. Defined in `domain/state-machine.ts`.
- **Partition tree conflicts**: Booking a room also checks parent/child partition rooms for overlaps.
- **Recurrence materialization**: Recurrence rules are stored, but instances are materialized as individual `Booking` records tagged with `recurrenceModType` (ORIGINAL/MODIFIED/DETACHED). Series modifications use split-at-date strategy.
- **Feature-flagged services**: `TravelTimeService`, `ExamService`, `BulkOperationService` are only registered when their config options are provided.
- **Configuration inheritance**: `ConfigStorage.resolve()` walks the location ancestor chain (room → floor → building → campus → institution).

### Backend — Module Registration

`RoomKitModule.register(options)` is a NestJS DynamicModule. It accepts either a composite `PrismaRoomKitAdapter` or individual storage implementations. A `RoomKitBootstrapper` (OnApplicationBootstrap) wires event handlers and seeds priority tiers at startup.

### Frontend — Hooks + Components

```
context/      → RoomKitProvider (React Context with apiUrl config)
lib/          → ApiClient class (native Fetch, JSON, AbortController)
hooks/        → 8 query hooks + 3 mutation hooks + 1 polling hook
components/   → 10 presentational components (inline styles, no CSS deps)
types/        → Mirrors backend entity types as TypeScript interfaces
```

- All hooks use `useApiClient()` which reads config from `RoomKitProvider` context.
- Query hooks: auto-fetch on mount/deps change, return `{ data, isLoading, error, refetch }`.
- Mutation hooks: return `{ mutate, data, isLoading, error }` with idempotency key generation.
- Components are stateless/presentational with inline `React.CSSProperties` — no external CSS framework.

### Testing

Backend tests use in-memory mock storage implementations in `src/__tests__/mocks/`. Each mock extends the corresponding abstract storage class. Tests cover domain services, state machine transitions, and conflict detection.

## Code Style

- **4-space indentation**
- **Bun only** — never npm/yarn/pnpm
- **TypeScript strict mode** with `noUncheckedIndexedAccess`
- Storage interfaces are **abstract classes** (not TS interfaces) for NestJS DI compatibility
- All IDs are UUIDs (strings)
- Barrel exports in each package's `index.ts` — update when adding public API surface
- Branch from `dev` for PRs
