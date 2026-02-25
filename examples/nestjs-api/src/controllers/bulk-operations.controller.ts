import { Controller, Post, Get, Param, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { BulkOperationService, BulkOperationStorage } from "@hfu.digital/roomkit-nestjs";
import type { SemesterImportPayload } from "@hfu.digital/roomkit-nestjs";

@ApiTags("Bulk Operations")
@Controller("bulk-operations")
export class BulkOperationsController {
    constructor(
        private readonly bulkOperationService: BulkOperationService,
        private readonly bulkOperationStorage: BulkOperationStorage,
    ) {}

    @Post("semester-import")
    @ApiOperation({ summary: "Import a semester's worth of bookings" })
    @ApiResponse({ status: 201, description: "Semester import started" })
    async semesterImport(
        @Body()
        body: {
            payload: SemesterImportPayload;
            triggeredBy: string;
        },
    ) {
        const payload: SemesterImportPayload = {
            entries: body.payload.entries.map((entry) => ({
                ...entry,
                startsAt: new Date(entry.startsAt),
                endsAt: new Date(entry.endsAt),
                recurrence: entry.recurrence
                    ? {
                          ...entry.recurrence,
                          seriesStartsAt: new Date(entry.recurrence.seriesStartsAt),
                          seriesEndsAt: new Date(entry.recurrence.seriesEndsAt),
                          exceptionDates: (entry.recurrence.exceptionDates ?? []).map(
                              (d: string | Date) => new Date(d),
                          ),
                      }
                    : undefined,
            })),
        };
        return this.bulkOperationService.semesterImport(
            payload,
            body.triggeredBy,
        );
    }

    @Post("date-shift")
    @ApiOperation({ summary: "Shift bookings by a number of days" })
    @ApiResponse({ status: 201, description: "Date shift operation started" })
    async dateShift(
        @Body()
        body: {
            filter: {
                recurrenceRuleId?: string;
                roomId?: string;
                timeRange?: { startsAt: string; endsAt: string };
            };
            shiftDays: number;
            triggeredBy: string;
        },
    ) {
        const filter = {
            ...body.filter,
            timeRange: body.filter.timeRange
                ? {
                      startsAt: new Date(body.filter.timeRange.startsAt),
                      endsAt: new Date(body.filter.timeRange.endsAt),
                  }
                : undefined,
        };
        return this.bulkOperationService.dateShift(
            filter,
            body.shiftDays,
            body.triggeredBy,
        );
    }

    @Post("batch-cancel")
    @ApiOperation({ summary: "Cancel multiple bookings matching a filter" })
    @ApiResponse({ status: 201, description: "Batch cancel operation started" })
    async batchCancel(
        @Body()
        body: {
            filter: {
                roomId?: string;
                timeRange?: { startsAt: string; endsAt: string };
                requesterId?: string;
            };
            reason: string;
            triggeredBy: string;
        },
    ) {
        const filter = {
            ...body.filter,
            timeRange: body.filter.timeRange
                ? {
                      startsAt: new Date(body.filter.timeRange.startsAt),
                      endsAt: new Date(body.filter.timeRange.endsAt),
                  }
                : undefined,
        };
        return this.bulkOperationService.batchCancel(
            filter,
            body.reason,
            body.triggeredBy,
        );
    }

    @Get(":id")
    @ApiOperation({ summary: "Get bulk operation status" })
    @ApiResponse({ status: 200, description: "Bulk operation status" })
    @ApiResponse({ status: 404, description: "Bulk operation not found" })
    async getStatus(@Param("id") id: string) {
        return this.bulkOperationStorage.getResult(id);
    }
}
