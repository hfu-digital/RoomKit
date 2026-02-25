import { Controller, Post, Put, Param, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { RecurrenceService } from "@hfu.digital/roomkit-nestjs";
import type { CreateBookingDto, UpdateBookingDto, RecurrenceRule } from "@hfu.digital/roomkit-nestjs";

@ApiTags("Recurrence")
@Controller("recurrence")
export class RecurrenceController {
    constructor(private readonly recurrenceService: RecurrenceService) {}

    @Post()
    @ApiOperation({ summary: "Create a recurring booking series" })
    @ApiResponse({ status: 201, description: "Recurring booking series created" })
    async create(
        @Body()
        body: {
            bookingTemplate: CreateBookingDto;
            rule: Omit<RecurrenceRule, "id" | "createdAt" | "updatedAt">;
        },
    ) {
        const template = {
            ...body.bookingTemplate,
            startsAt: new Date(body.bookingTemplate.startsAt),
            endsAt: new Date(body.bookingTemplate.endsAt),
        };
        const rule = {
            ...body.rule,
            seriesStartsAt: new Date(body.rule.seriesStartsAt),
            seriesEndsAt: new Date(body.rule.seriesEndsAt),
            exceptionDates: (body.rule.exceptionDates ?? []).map(
                (d: string | Date) => new Date(d),
            ),
        };
        return this.recurrenceService.createRecurringBooking(template, rule);
    }

    @Put(":bookingId/single")
    @ApiOperation({ summary: "Modify a single recurrence instance" })
    @ApiResponse({ status: 200, description: "Single instance modified" })
    async modifySingle(
        @Param("bookingId") bookingId: string,
        @Body() body: UpdateBookingDto & { version: number },
    ) {
        const { version, ...changes } = body;
        if (changes.startsAt) changes.startsAt = new Date(changes.startsAt);
        if (changes.endsAt) changes.endsAt = new Date(changes.endsAt);
        return this.recurrenceService.modifySingle(bookingId, changes, version);
    }

    @Put(":bookingId/this-and-future")
    @ApiOperation({ summary: "Modify this and all future recurrence instances" })
    @ApiResponse({ status: 200, description: "This and future instances modified" })
    async modifyThisAndFuture(
        @Param("bookingId") bookingId: string,
        @Body() changes: UpdateBookingDto,
    ) {
        if (changes.startsAt) changes.startsAt = new Date(changes.startsAt);
        if (changes.endsAt) changes.endsAt = new Date(changes.endsAt);
        return this.recurrenceService.modifyThisAndFuture(bookingId, changes);
    }

    @Put(":ruleId/all")
    @ApiOperation({ summary: "Modify all instances of a recurrence rule" })
    @ApiResponse({ status: 200, description: "All instances modified" })
    async modifyAll(
        @Param("ruleId") ruleId: string,
        @Body() changes: UpdateBookingDto,
    ) {
        if (changes.startsAt) changes.startsAt = new Date(changes.startsAt);
        if (changes.endsAt) changes.endsAt = new Date(changes.endsAt);
        return this.recurrenceService.modifyAll(ruleId, changes);
    }
}
