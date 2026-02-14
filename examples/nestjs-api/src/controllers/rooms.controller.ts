import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Param,
    Body,
    Query,
    HttpCode,
    HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { RoomService, RoomStorage } from "@roomkit/nestjs";
import type { CreateRoomDto, UpdateRoomDto, RoomFilterDto } from "@roomkit/nestjs";

@ApiTags("Rooms")
@Controller("rooms")
export class RoomsController {
    constructor(
        private readonly roomService: RoomService,
        private readonly roomStorage: RoomStorage,
    ) {}

    @Post()
    @ApiOperation({ summary: "Create a room" })
    @ApiResponse({ status: 201, description: "Room created" })
    async create(@Body() dto: CreateRoomDto) {
        return this.roomService.create(dto);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a room by ID with equipment and accessibility" })
    @ApiResponse({ status: 200, description: "Room found" })
    @ApiResponse({ status: 404, description: "Room not found" })
    async getById(@Param("id") id: string) {
        return this.roomService.getWithEquipment(id);
    }

    @Get()
    @ApiOperation({ summary: "Search rooms with filters" })
    @ApiResponse({ status: 200, description: "Rooms matching filters" })
    @ApiQuery({ name: "minCapacity", required: false, type: Number })
    @ApiQuery({ name: "capacityType", required: false, enum: ["seated", "exam", "standing"] })
    @ApiQuery({ name: "equipment", required: false, type: String, description: "Comma-separated equipment tags" })
    @ApiQuery({ name: "accessibility", required: false, type: String, description: "Comma-separated accessibility attributes" })
    @ApiQuery({ name: "locationScope", required: false })
    @ApiQuery({ name: "isActive", required: false, type: Boolean })
    async search(
        @Query("minCapacity") minCapacity?: string,
        @Query("capacityType") capacityType?: "seated" | "exam" | "standing",
        @Query("equipment") equipment?: string,
        @Query("accessibility") accessibility?: string,
        @Query("locationScope") locationScope?: string,
        @Query("isActive") isActive?: string,
    ) {
        const filter: RoomFilterDto = {};
        if (minCapacity) filter.minCapacity = parseInt(minCapacity, 10);
        if (capacityType) filter.capacityType = capacityType;
        if (equipment) filter.equipment = equipment.split(",");
        if (accessibility) filter.accessibility = accessibility.split(",");
        if (locationScope) filter.locationScope = locationScope;
        if (isActive !== undefined) filter.isActive = isActive === "true";
        return this.roomService.findByFilter(filter);
    }

    @Put(":id")
    @ApiOperation({ summary: "Update a room" })
    @ApiResponse({ status: 200, description: "Room updated" })
    async update(
        @Param("id") id: string,
        @Body() dto: UpdateRoomDto,
    ) {
        return this.roomStorage.update(id, dto);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete a room" })
    @ApiResponse({ status: 204, description: "Room deleted" })
    async delete(@Param("id") id: string) {
        return this.roomStorage.delete(id);
    }

    @Post(":id/equipment")
    @ApiOperation({ summary: "Add equipment to a room" })
    @ApiResponse({ status: 201, description: "Equipment added" })
    async addEquipment(
        @Param("id") id: string,
        @Body("tag") tag: string,
    ) {
        return this.roomService.addEquipment(id, tag);
    }

    @Delete(":id/equipment/:tag")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Remove equipment from a room" })
    @ApiResponse({ status: 204, description: "Equipment removed" })
    async removeEquipment(
        @Param("id") id: string,
        @Param("tag") tag: string,
    ) {
        return this.roomService.removeEquipment(id, tag);
    }

    @Post(":id/accessibility")
    @ApiOperation({ summary: "Add an accessibility attribute to a room" })
    @ApiResponse({ status: 201, description: "Accessibility attribute added" })
    async addAccessibility(
        @Param("id") id: string,
        @Body("attribute") attribute: string,
    ) {
        return this.roomService.addAccessibility(id, attribute);
    }

    @Delete(":id/accessibility/:attribute")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Remove an accessibility attribute from a room" })
    @ApiResponse({ status: 204, description: "Accessibility attribute removed" })
    async removeAccessibility(
        @Param("id") id: string,
        @Param("attribute") attribute: string,
    ) {
        return this.roomService.removeAccessibility(id, attribute);
    }
}
