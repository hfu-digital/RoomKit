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
import { LocationService, LocationStorage } from "@hfu.digital/roomkit-nestjs";
import type { CreateLocationNodeDto, UpdateLocationNodeDto } from "@hfu.digital/roomkit-nestjs";

@ApiTags("Locations")
@Controller("locations")
export class LocationsController {
    constructor(
        private readonly locationService: LocationService,
        private readonly locationStorage: LocationStorage,
    ) {}

    @Post()
    @ApiOperation({ summary: "Create a location node" })
    @ApiResponse({ status: 201, description: "Location node created" })
    async create(@Body() dto: CreateLocationNodeDto) {
        return this.locationService.createNode(dto);
    }

    @Get("tree")
    @ApiOperation({ summary: "Get the location tree" })
    @ApiResponse({ status: 200, description: "Location tree returned" })
    @ApiQuery({ name: "rootId", required: false, description: "Root node ID to start the tree from" })
    async getTree(@Query("rootId") rootId?: string) {
        return this.locationService.getTree(rootId);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a location node by ID" })
    @ApiResponse({ status: 200, description: "Location node found" })
    @ApiResponse({ status: 404, description: "Location node not found" })
    async getById(@Param("id") id: string) {
        return this.locationService.getById(id);
    }

    @Put(":id")
    @ApiOperation({ summary: "Update a location node" })
    @ApiResponse({ status: 200, description: "Location node updated" })
    async update(
        @Param("id") id: string,
        @Body() dto: UpdateLocationNodeDto,
    ) {
        return this.locationStorage.update(id, dto);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete a location node" })
    @ApiResponse({ status: 204, description: "Location node deleted" })
    async delete(@Param("id") id: string) {
        return this.locationStorage.delete(id);
    }

    @Post(":id/move")
    @ApiOperation({ summary: "Move a location node under a new parent" })
    @ApiResponse({ status: 200, description: "Location node moved" })
    async move(
        @Param("id") id: string,
        @Body("newParentId") newParentId: string,
    ) {
        return this.locationService.moveNode(id, newParentId);
    }
}
