import type { RoomKitPrismaClient } from "../../types/prisma-delegates";
import { BookingStateMachine } from "../../domain/state-machine";
import { PrismaLocationAdapter } from "./prisma-location.adapter";
import { PrismaRoomAdapter } from "./prisma-room.adapter";
import { PrismaBookingAdapter } from "./prisma-booking.adapter";
import { PrismaRecurrenceAdapter } from "./prisma-recurrence.adapter";
import { PrismaBlackoutAdapter } from "./prisma-blackout.adapter";
import { PrismaConflictAdapter } from "./prisma-conflict.adapter";
import { PrismaConfigAdapter } from "./prisma-config.adapter";
import { PrismaAuditAdapter } from "./prisma-audit.adapter";
import { PrismaPriorityAdapter } from "./prisma-priority.adapter";
import { PrismaExamAdapter } from "./prisma-exam.adapter";
import { PrismaBulkOperationAdapter } from "./prisma-bulk-operation.adapter";

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
        const stateMachine = new BookingStateMachine();

        this.location = new PrismaLocationAdapter(prisma);
        this.room = new PrismaRoomAdapter(prisma);
        this.booking = new PrismaBookingAdapter(prisma, stateMachine);
        this.recurrence = new PrismaRecurrenceAdapter(prisma);
        this.blackout = new PrismaBlackoutAdapter(prisma);
        this.conflict = new PrismaConflictAdapter(prisma);
        this.config = new PrismaConfigAdapter(prisma, this.location);
        this.audit = new PrismaAuditAdapter(prisma);
        this.priority = new PrismaPriorityAdapter(prisma);
        this.exam = new PrismaExamAdapter(prisma);
        this.bulkOperation = new PrismaBulkOperationAdapter(prisma);
    }
}
