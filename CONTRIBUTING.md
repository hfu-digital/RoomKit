# Contributing to RoomKit

Thank you for your interest in contributing to RoomKit!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/hfu/RoomKit.git
cd RoomKit

# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun run test
```

## Architecture Overview

RoomKit is a monorepo with two publishable packages:

- **`packages/backend`** (`@hfu.digital/roomkit-nestjs`) — NestJS module providing room booking domain logic
- **`packages/frontend`** (`@hfu.digital/roomkit-react`) — React hooks and components for booking UIs

### Backend Architecture

```
domain/         Business logic services (no database awareness)
interfaces/     Abstract storage classes (database contract)
adapters/       Concrete implementations (Prisma adapter)
dto/            Data transfer objects with validation
errors/         Domain error hierarchy
events/         Type-safe event bus
types/          Entity types, enums, Prisma structural types
```

The key pattern is **dependency inversion**: domain services depend on abstract storage interfaces, not concrete database implementations. This allows consumers to swap in custom adapters.

### Frontend Architecture

```
components/     Pre-built React components
hooks/          Data-fetching and mutation hooks
context/        RoomKitProvider (API URL configuration)
lib/            Internal API client
types/          Mirrored entity types from backend
```

## Code Style

- **4-space indentation** (enforced)
- **TypeScript strict mode**
- **Bun only** — never use npm, yarn, or pnpm
- Prefer editing existing files over creating new ones
- No `@prisma/client` imports in `packages/backend/src/`

## Pull Request Guidelines

1. Branch from `dev`
2. Keep PRs focused — one feature or fix per PR
3. Include tests for new domain logic
4. Ensure `bun run build` and `bun run test` pass
5. Update barrel exports in `index.ts` if adding new public API surface
6. Add JSDoc for public methods

## Test Requirements

- Unit tests for all domain services using in-memory mock storages
- Test happy paths and error cases
- Test state machine transitions exhaustively
- Mock storages live in `src/__tests__/mocks/`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
