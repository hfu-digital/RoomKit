import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { AvailabilityService } from "@hfu.digital/roomkit-nestjs";
import type { AvailabilityFilter, Pagination } from "@hfu.digital/roomkit-nestjs";

@ApiTags("Availability")
@Controller("availability")
export class AvailabilityController {
    constructor(private readonly availabilityService: AvailabilityService) {}

    @Get()
    @ApiOperation({ summary: "Search available rooms" })
    @ApiResponse({ status: 200, description: "Available rooms matching filters" })
    @ApiQuery({ name: "startsAt", required: true, description: "ISO 8601 date string" })
    @ApiQuery({ name: "endsAt", required: true, description: "ISO 8601 date string" })
    @ApiQuery({ name: "minCapacity", required: false, type: Number })
    @ApiQuery({ name: "capacityType", required: false, enum: ["seated", "exam", "standing"] })
    @ApiQuery({ name: "requiredEquipment", required: false, type: String, description: "Comma-separated equipment tags" })
    @ApiQuery({ name: "requiredAccessibility", required: false, type: String, description: "Comma-separated accessibility attributes" })
    @ApiQuery({ name: "locationScope", required: false })
    @ApiQuery({ name: "excludeRoomIds", required: false, type: String, description: "Comma-separated room IDs to exclude" })
    @ApiQuery({ name: "cursor", required: false })
    @ApiQuery({ name: "limit", required: false, type: Number })
    async search(
        @Query("startsAt") startsAt: string,
        @Query("endsAt") endsAt: string,
        @Query("minCapacity") minCapacity?: string,
        @Query("capacityType") capacityType?: "seated" | "exam" | "standing",
        @Query("requiredEquipment") requiredEquipment?: string,
        @Query("requiredAccessibility") requiredAccessibility?: string,
        @Query("locationScope") locationScope?: string,
        @Query("excludeRoomIds") excludeRoomIds?: string,
        @Query("cursor") cursor?: string,
        @Query("limit") limit?: string,
    ) {
        const filters: AvailabilityFilter = {
            timeRange: {
                startsAt: new Date(startsAt),
                endsAt: new Date(endsAt),
            },
        };

        if (minCapacity) filters.minCapacity = parseInt(minCapacity, 10);
        if (capacityType) filters.capacityType = capacityType;
        if (requiredEquipment) filters.requiredEquipment = requiredEquipment.split(",");
        if (requiredAccessibility) filters.requiredAccessibility = requiredAccessibility.split(",");
        if (locationScope) filters.locationScope = locationScope;
        if (excludeRoomIds) filters.excludeRoomIds = excludeRoomIds.split(",");

        const pagination: Pagination = {
            cursor,
            limit: limit ? parseInt(limit, 10) : 20,
        };

        return this.availabilityService.search(filters, pagination);
    }
}
