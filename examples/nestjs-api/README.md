# RoomKit NestJS API Example

A fully runnable example NestJS API demonstrating how to integrate `@roomkit/nestjs` with Prisma and Fastify.

## Prerequisites

- [Bun](https://bun.sh/) installed
- A PostgreSQL database (or any Prisma-supported database)
- A `.env` file with `DATABASE_URL` set (e.g. `DATABASE_URL="postgresql://user:pass@localhost:5432/roomkit"`)

## Setup

```bash
# Install dependencies
bun install

# Generate Prisma client (requires a prisma/schema.prisma with the RoomKit models)
bunx prisma generate

# Push schema to database (creates tables)
bunx prisma db push

# Start in development mode (with hot reload)
bun run start:dev
```

## Available Endpoints

### Locations
- `POST /locations` -- Create a location node
- `GET /locations/:id` -- Get location by ID
- `GET /locations/tree` -- Get the location tree
- `PUT /locations/:id` -- Update a location node
- `DELETE /locations/:id` -- Delete a location node
- `POST /locations/:id/move` -- Move a node under a new parent

### Rooms
- `POST /rooms` -- Create a room
- `GET /rooms/:id` -- Get room by ID (with equipment and accessibility)
- `GET /rooms` -- Search rooms with query filters
- `PUT /rooms/:id` -- Update a room
- `DELETE /rooms/:id` -- Delete a room
- `POST /rooms/:id/equipment` -- Add equipment tag
- `DELETE /rooms/:id/equipment/:tag` -- Remove equipment tag
- `POST /rooms/:id/accessibility` -- Add accessibility attribute
- `DELETE /rooms/:id/accessibility/:attribute` -- Remove accessibility attribute

### Bookings
- `POST /bookings` -- Create a booking
- `GET /bookings/:id` -- Get booking by ID
- `PUT /bookings/:id` -- Modify a booking (requires `version` in body)
- `POST /bookings/:id/confirm` -- Confirm a booking
- `POST /bookings/:id/check-in` -- Check in
- `POST /bookings/:id/complete` -- Complete a booking
- `POST /bookings/:id/cancel` -- Cancel a booking
- `GET /bookings/person/:personId` -- List by person (query: `startsAt`, `endsAt`, `cursor`, `limit`)
- `GET /bookings/room/:roomId` -- List by room (query: `startsAt`, `endsAt`, `cursor`, `limit`)

### Availability
- `GET /availability` -- Search available rooms with filter query params

### Recurrence
- `POST /recurrence` -- Create a recurring booking series
- `PUT /recurrence/:bookingId/single` -- Modify a single instance
- `PUT /recurrence/:bookingId/this-and-future` -- Modify this and future instances
- `PUT /recurrence/:ruleId/all` -- Modify all instances

### Blackouts
- `POST /blackouts` -- Create a blackout window
- `GET /blackouts` -- List by location scope and time range
- `DELETE /blackouts/:id` -- Delete a blackout window

### Exams
- `POST /exams` -- Create an exam session
- `GET /exams` -- Search exam sessions with filters

### Bulk Operations
- `POST /bulk-operations/semester-import` -- Import a semester
- `POST /bulk-operations/date-shift` -- Shift bookings by N days
- `POST /bulk-operations/batch-cancel` -- Cancel bookings in bulk
- `GET /bulk-operations/:id` -- Get operation status

## Swagger Docs

Once the server is running, interactive API documentation is available at:

```
http://localhost:3000/docs
```
