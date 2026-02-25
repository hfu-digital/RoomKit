# RoomKit Next.js Example

Minimal Next.js 15 app demonstrating `@hfu.digital/roomkit-react` hooks and provider.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Availability search with room cards and booking timeline |
| `/book` | Booking creation form using `useCreateBooking` |
| `/locations` | Hierarchical location browser using `useLocationTree` |

## Prerequisites

The **nestjs-api** example (or any RoomKit-compatible API) must be running on
`http://localhost:3000`. The Next.js dev server runs on port 3001 by default.

## Running

```bash
# From the monorepo root
bun install

# Start the API first (in another terminal)
cd examples/nestjs-api
bun run start:dev

# Start the Next.js app
cd examples/nextjs-app
bun run dev
```

The app opens at [http://localhost:3001](http://localhost:3001).

## What it demonstrates

- **`RoomKitProvider`** — wraps the app with the API base URL
- **`useAvailability`** — debounced room search with capacity filters
- **`useBookings`** — fetching bookings for a selected room
- **`useCreateBooking`** — mutation hook for creating a new booking
- **`useLocationTree`** — rendering a collapsible location hierarchy
