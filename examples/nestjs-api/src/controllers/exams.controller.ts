import { Controller, Post, Get, Body, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { ExamService } from "@hfu.digital/roomkit-nestjs";
import type { CreateBookingDto, ExamLayoutType } from "@hfu.digital/roomkit-nestjs";

@ApiTags("Exams")
@Controller("exams")
export class ExamsController {
    constructor(private readonly examService: ExamService) {}

    @Post()
    @ApiOperation({ summary: "Create an exam session" })
    @ApiResponse({ status: 201, description: "Exam session created" })
    async create(
        @Body()
        body: {
            bookingData: CreateBookingDto;
            cohortId: string;
            layoutType: ExamLayoutType;
            requiredCapacity: number;
            supervisorIds?: string[];
            metadata?: string | null;
        },
    ) {
        return this.examService.createExamSession({
            ...body,
            bookingData: {
                ...body.bookingData,
                startsAt: new Date(body.bookingData.startsAt),
                endsAt: new Date(body.bookingData.endsAt),
            },
        });
    }

    @Get()
    @ApiOperation({ summary: "Search exam sessions with filters" })
    @ApiResponse({ status: 200, description: "Exam sessions matching filters" })
    @ApiQuery({ name: "cohortId", required: false })
    @ApiQuery({ name: "roomId", required: false })
    @ApiQuery({ name: "startsAt", required: false, description: "ISO 8601 date string" })
    @ApiQuery({ name: "endsAt", required: false, description: "ISO 8601 date string" })
    async search(
        @Query("cohortId") cohortId?: string,
        @Query("roomId") roomId?: string,
        @Query("startsAt") startsAt?: string,
        @Query("endsAt") endsAt?: string,
    ) {
        const timeRange =
            startsAt && endsAt
                ? { startsAt: new Date(startsAt), endsAt: new Date(endsAt) }
                : undefined;

        return this.examService.findByFilters({
            cohortId,
            roomId,
            timeRange,
        });
    }
}
