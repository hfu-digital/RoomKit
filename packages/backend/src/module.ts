import {
    type DynamicModule,
    Inject,
    Injectable,
    Module,
    type OnApplicationBootstrap,
    type Provider,
} from "@nestjs/common";
import { LocationStorage } from "./interfaces/location.storage";
import { RoomStorage } from "./interfaces/room.storage";
import { BookingStorage } from "./interfaces/booking.storage";
import { RecurrenceStorage } from "./interfaces/recurrence.storage";
import { BlackoutStorage } from "./interfaces/blackout.storage";
import { ConflictStorage } from "./interfaces/conflict.storage";
import { ConfigStorage } from "./interfaces/config.storage";
import { AuditStorage } from "./interfaces/audit.storage";
import { PriorityStorage } from "./interfaces/priority.storage";
import { ExamStorage } from "./interfaces/exam.storage";
import { BulkOperationStorage } from "./interfaces/bulk-operation.storage";
import { LocationService } from "./domain/location.service";
import { RoomService } from "./domain/room.service";
import { BookingService } from "./domain/booking.service";
import { ConflictService } from "./domain/conflict.service";
import { AvailabilityService } from "./domain/availability.service";
import { RecurrenceService } from "./domain/recurrence.service";
import { BlackoutService } from "./domain/blackout.service";
import { ConfigService } from "./domain/config.service";
import { AuditService } from "./domain/audit.service";
import { PriorityService } from "./domain/priority.service";
import { TravelTimeService } from "./domain/travel-time.service";
import { ExamService } from "./domain/exam.service";
import { BulkOperationService } from "./domain/bulk-operation.service";
import { BookingStateMachine } from "./domain/state-machine";
import { EventBus } from "./events/event-bus";
import type { PrismaRoomKitAdapter } from "./adapters/prisma/prisma-roomkit.adapter";
import type { RoomKitEvent, RoomKitEventType } from "./events/event-bus";

// ─── Options Interface ──────────────────────────────────────

export interface RoomKitModuleOptions {
    storage:
        | PrismaRoomKitAdapter
        | {
              location: LocationStorage;
              room: RoomStorage;
              booking: BookingStorage;
              recurrence: RecurrenceStorage;
              blackout: BlackoutStorage;
              conflict: ConflictStorage;
              config: ConfigStorage;
              audit: AuditStorage;
              priority: PriorityStorage;
              exam?: ExamStorage;
              bulkOperation?: BulkOperationStorage;
          };
    priorities?: { name: string; weight: number }[];
    travelTimeMatrix?: Record<string, number>;
    features?: { exams?: boolean; bulkOperations?: boolean };
    events?: Partial<
        Record<RoomKitEventType, (event: RoomKitEvent) => void>
    >;
}

// ─── Injection Tokens ───────────────────────────────────────

export const ROOMKIT_OPTIONS = "ROOMKIT_OPTIONS";
export const TRAVEL_TIME_MATRIX = "TRAVEL_TIME_MATRIX";

// ─── Bootstrapper ───────────────────────────────────────────

/**
 * Internal service that runs once on application startup.
 * Wires event handlers from `options.events` to the EventBus
 * and seeds default priority tiers from `options.priorities`.
 */
@Injectable()
class RoomKitBootstrapper implements OnApplicationBootstrap {
    constructor(
        @Inject(ROOMKIT_OPTIONS)
        private readonly options: RoomKitModuleOptions,
        private readonly eventBus: EventBus,
        private readonly priorityService: PriorityService,
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        // Wire event handlers
        if (this.options.events) {
            for (const [eventType, handler] of Object.entries(
                this.options.events,
            )) {
                if (handler) {
                    this.eventBus.on(
                        eventType as RoomKitEventType,
                        handler as (event: RoomKitEvent) => void,
                    );
                }
            }
        }

        // Seed priority tiers
        if (
            this.options.priorities &&
            this.options.priorities.length > 0
        ) {
            for (const tier of this.options.priorities) {
                await this.priorityService.upsert(tier);
            }
        }
    }
}

// ─── Module ─────────────────────────────────────────────────

@Module({})
export class RoomKitModule {
    static register(options: RoomKitModuleOptions): DynamicModule {
        const storageProviders: Provider[] = [];

        // Determine if it's the composite adapter or individual storages
        const storage = options.storage;

        if ("location" in storage) {
            // Could be PrismaRoomKitAdapter or individual storages.
            // For individual storages the properties are typed storage
            // instances; for the Prisma adapter the same property names
            // expose sub-adapters that implement the abstract classes.
            const s = storage as Record<string, unknown>;

            storageProviders.push(
                { provide: LocationStorage, useValue: s.location ?? s },
                { provide: RoomStorage, useValue: s.room ?? s },
                { provide: BookingStorage, useValue: s.booking ?? s },
                {
                    provide: RecurrenceStorage,
                    useValue: s.recurrence ?? s,
                },
                {
                    provide: BlackoutStorage,
                    useValue: s.blackout ?? s,
                },
                {
                    provide: ConflictStorage,
                    useValue: s.conflict ?? s,
                },
                { provide: ConfigStorage, useValue: s.config ?? s },
                { provide: AuditStorage, useValue: s.audit ?? s },
                {
                    provide: PriorityStorage,
                    useValue: s.priority ?? s,
                },
            );

            if (s.exam) {
                storageProviders.push({
                    provide: ExamStorage,
                    useValue: s.exam,
                });
            }
            if (s.bulkOperation) {
                storageProviders.push({
                    provide: BulkOperationStorage,
                    useValue: s.bulkOperation,
                });
            }
        }

        // Options token — makes the raw options injectable
        const optionsProvider: Provider = {
            provide: ROOMKIT_OPTIONS,
            useValue: options,
        };

        // Core services (always registered)
        const coreServices: Provider[] = [
            EventBus,
            BookingStateMachine,
            LocationService,
            RoomService,
            BookingService,
            ConflictService,
            AvailabilityService,
            RecurrenceService,
            BlackoutService,
            ConfigService,
            AuditService,
            PriorityService,
        ];

        // Optional services
        const optionalServices: Provider[] = [];

        if (options.travelTimeMatrix) {
            optionalServices.push(
                {
                    provide: TRAVEL_TIME_MATRIX,
                    useValue: options.travelTimeMatrix,
                },
                TravelTimeService,
            );
        }

        if (options.features?.exams) {
            optionalServices.push(ExamService);
        }

        if (options.features?.bulkOperations) {
            optionalServices.push(BulkOperationService);
        }

        // Bootstrapper wires events + seeds priorities on startup
        const bootstrapProvider: Provider = RoomKitBootstrapper;

        const allProviders: Provider[] = [
            optionsProvider,
            ...storageProviders,
            ...coreServices,
            ...optionalServices,
            bootstrapProvider,
        ];

        // Core exports (services + storage interfaces for advanced usage)
        const coreExports = [
            EventBus,
            BookingStateMachine,
            LocationService,
            RoomService,
            BookingService,
            ConflictService,
            AvailabilityService,
            RecurrenceService,
            BlackoutService,
            ConfigService,
            AuditService,
            PriorityService,
            LocationStorage,
            RoomStorage,
            BookingStorage,
            RecurrenceStorage,
            BlackoutStorage,
            ConflictStorage,
            ConfigStorage,
            AuditStorage,
            PriorityStorage,
        ];

        const optionalExports: Array<Provider | Function> = [];
        if (options.travelTimeMatrix) {
            optionalExports.push(TravelTimeService);
        }
        if (options.features?.exams) {
            optionalExports.push(ExamService, ExamStorage);
        }
        if (options.features?.bulkOperations) {
            optionalExports.push(BulkOperationService, BulkOperationStorage);
        }

        return {
            module: RoomKitModule,
            providers: allProviders,
            exports: [...coreExports, ...optionalExports],
            global: false,
        };
    }
}
