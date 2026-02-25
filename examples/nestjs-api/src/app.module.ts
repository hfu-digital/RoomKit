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

@Module({
    imports: [
        RoomKitModule.register({
            storage: new PrismaRoomKitAdapter(prisma),
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
