import type { RoomKitPrismaClient } from "@hfu.digital/roomkit-nestjs";
import { Module } from "@nestjs/common";
import { RoomKitModule, PrismaRoomKitAdapter } from "@hfu.digital/roomkit-nestjs";
import { PrismaService } from "./prisma.service";
import { LocationsController } from "./controllers/locations.controller";
import { RoomsController } from "./controllers/rooms.controller";
import { BookingsController } from "./controllers/bookings.controller";
import { AvailabilityController } from "./controllers/availability.controller";
import { RecurrenceController } from "./controllers/recurrence.controller";
import { BlackoutsController } from "./controllers/blackouts.controller";
import { ExamsController } from "./controllers/exams.controller";
import { BulkOperationsController } from "./controllers/bulk-operations.controller";

// Create a shared PrismaService instance used by both the RoomKit adapter
// and any other providers that need database access.
const prisma = new PrismaService();

// The library accepts dynamic filters; generated Prisma delegates instead
// require model-specific unique selectors. Keep that adaptation at this boundary
// while checking that schema generation supplies every required delegate.
function asRoomKitClient(client: PrismaService): RoomKitPrismaClient {
    const delegates = {
        locationNode: client.locationNode, room: client.room,
        roomEquipment: client.roomEquipment, roomAccessibility: client.roomAccessibility,
        roomPartition: client.roomPartition, operatingHours: client.operatingHours,
        booking: client.booking, bookingStateTransition: client.bookingStateTransition,
        recurrenceRule: client.recurrenceRule, blackoutWindow: client.blackoutWindow,
        conflictRecord: client.conflictRecord, configEntry: client.configEntry,
        priorityTier: client.priorityTier, examSession: client.examSession,
        bulkOperation: client.bulkOperation,
    } satisfies Record<Exclude<keyof RoomKitPrismaClient, "$transaction">, { findMany: unknown }>;
    void delegates;
    return client as unknown as RoomKitPrismaClient;
}

@Module({
    imports: [
        RoomKitModule.register({
            storage: new PrismaRoomKitAdapter(asRoomKitClient(prisma)),
            features: {
                exams: true,
                bulkOperations: true,
            },
        }),
    ],
    controllers: [
        LocationsController,
        RoomsController,
        BookingsController,
        AvailabilityController,
        RecurrenceController,
        BlackoutsController,
        ExamsController,
        BulkOperationsController,
    ],
    providers: [
        {
            provide: PrismaService,
            useValue: prisma,
        },
    ],
})
export class AppModule {}
