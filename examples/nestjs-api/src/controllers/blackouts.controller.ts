import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Body,
    Query,
    HttpCode,
    HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { BlackoutService } from "@roomkit/nestjs";
import type { BlackoutScope } from "@roomkit/nestjs";

@ApiTags("Blackouts")
@Controller("blackouts")
export class BlackoutsController {
    constructor(private readonly blackoutService: BlackoutService) {}

    @Post()
    @ApiOperation({ summary: "Create a blackout window" })
    @ApiResponse({ status: 201, description: "Blackout window created" })
    async create(
        @Body()
        body: {
            locationNodeId: string;
            scope: BlackoutScope;
            title: string;
            reason?: string | null;
            startsAt: string;
            endsAt: string;
            isRecurring?: boolean;
            recurrenceRuleId?: string | null;
        },
    ) {
        return this.blackoutService.create({
            locationNodeId: body.locationNodeId,
            scope: body.scope,
            title: body.title,
            reason: body.reason ?? null,
            startsAt: new Date(body.startsAt),
            endsAt: new Date(body.endsAt),
            isRecurring: body.isRecurring ?? false,
            recurrenceRuleId: body.recurrenceRuleId ?? null,
        });
    }

    @Get()
    @ApiOperation({ summary: "List blackout windows by location scope" })
    @ApiResponse({ status: 200, description: "Blackout windows for scope" })
    @ApiQuery({ name: "locationNodeId", required: true })
    @ApiQuery({ name: "startsAt", required: true, description: "ISO 8601 date string" })
    @ApiQuery({ name: "endsAt", required: true, description: "ISO 8601 date string" })
    async list(
        @Query("locationNodeId") locationNodeId: string,
        @Query("startsAt") startsAt: string,
        @Query("endsAt") endsAt: string,
    ) {
        return this.blackoutService.getActiveBlackouts(locationNodeId, {
            startsAt: new Date(startsAt),
            endsAt: new Date(endsAt),
        });
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete a blackout window" })
    @ApiResponse({ status: 204, description: "Blackout window deleted" })
    async delete(@Param("id") id: string) {
        return this.blackoutService.delete(id);
    }
}
