import {
    Controller,
    Post,
    Get,
    Put,
    Param,
    Body,
    Query,
    HttpCode,
    HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { BookingService } from "@roomkit/nestjs";
import type { CreateBookingDto, UpdateBookingDto } from "@roomkit/nestjs";

@ApiTags("Bookings")
@Controller("bookings")
export class BookingsController {
    constructor(private readonly bookingService: BookingService) {}

    @Post()
    @ApiOperation({ summary: "Create a booking" })
    @ApiResponse({ status: 201, description: "Booking created" })
    async create(@Body() dto: CreateBookingDto) {
        return this.bookingService.create({
            ...dto,
            startsAt: new Date(dto.startsAt),
            endsAt: new Date(dto.endsAt),
        });
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a booking by ID" })
    @ApiResponse({ status: 200, description: "Booking found" })
    @ApiResponse({ status: 404, description: "Booking not found" })
    async getById(@Param("id") id: string) {
        return this.bookingService.getById(id);
    }

    @Put(":id")
    @ApiOperation({ summary: "Modify a booking (requires version in body for optimistic concurrency)" })
    @ApiResponse({ status: 200, description: "Booking modified" })
    async modify(
        @Param("id") id: string,
        @Body() body: UpdateBookingDto & { version: number },
    ) {
        const { version, ...changes } = body;
        if (changes.startsAt) changes.startsAt = new Date(changes.startsAt);
        if (changes.endsAt) changes.endsAt = new Date(changes.endsAt);
        return this.bookingService.modify(id, changes, version);
    }

    @Post(":id/confirm")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Confirm a booking" })
    @ApiResponse({ status: 200, description: "Booking confirmed" })
    async confirm(
        @Param("id") id: string,
        @Body("triggeredBy") triggeredBy: string,
    ) {
        return this.bookingService.confirm(id, triggeredBy);
    }

    @Post(":id/check-in")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Check in to a booking" })
    @ApiResponse({ status: 200, description: "Checked in" })
    async checkIn(
        @Param("id") id: string,
        @Body("triggeredBy") triggeredBy: string,
    ) {
        return this.bookingService.checkIn(id, triggeredBy);
    }

    @Post(":id/complete")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Complete a booking" })
    @ApiResponse({ status: 200, description: "Booking completed" })
    async complete(
        @Param("id") id: string,
        @Body("triggeredBy") triggeredBy: string,
    ) {
        return this.bookingService.complete(id, triggeredBy);
    }

    @Post(":id/cancel")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Cancel a booking" })
    @ApiResponse({ status: 200, description: "Booking cancelled" })
    async cancel(
        @Param("id") id: string,
        @Body() body: { triggeredBy: string; reason?: string },
    ) {
        return this.bookingService.cancel(id, body.triggeredBy, body.reason);
    }

    @Get("person/:personId")
    @ApiOperation({ summary: "List bookings by person" })
    @ApiResponse({ status: 200, description: "Bookings for person" })
    @ApiQuery({ name: "startsAt", required: true, description: "ISO 8601 date string" })
    @ApiQuery({ name: "endsAt", required: true, description: "ISO 8601 date string" })
    @ApiQuery({ name: "cursor", required: false })
    @ApiQuery({ name: "limit", required: false, type: Number })
    async getByPerson(
        @Param("personId") personId: string,
        @Query("startsAt") startsAt: string,
        @Query("endsAt") endsAt: string,
        @Query("cursor") cursor?: string,
        @Query("limit") limit?: string,
    ) {
        return this.bookingService.getByPerson(
            personId,
            {
                startsAt: new Date(startsAt),
                endsAt: new Date(endsAt),
            },
            {
                cursor,
                limit: limit ? parseInt(limit, 10) : 20,
            },
        );
    }

    @Get("room/:roomId")
    @ApiOperation({ summary: "List bookings by room" })
    @ApiResponse({ status: 200, description: "Bookings for room" })
    @ApiQuery({ name: "startsAt", required: true, description: "ISO 8601 date string" })
    @ApiQuery({ name: "endsAt", required: true, description: "ISO 8601 date string" })
    @ApiQuery({ name: "cursor", required: false })
    @ApiQuery({ name: "limit", required: false, type: Number })
    async getByRoom(
        @Param("roomId") roomId: string,
        @Query("startsAt") startsAt: string,
        @Query("endsAt") endsAt: string,
        @Query("cursor") cursor?: string,
        @Query("limit") limit?: string,
    ) {
        return this.bookingService.getByRoom(
            roomId,
            {
                startsAt: new Date(startsAt),
                endsAt: new Date(endsAt),
            },
            {
                cursor,
                limit: limit ? parseInt(limit, 10) : 20,
            },
        );
    }
}
