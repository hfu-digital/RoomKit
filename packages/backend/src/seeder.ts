import { LocationStorage } from "./interfaces/location.storage";
import { RoomStorage } from "./interfaces/room.storage";
import { BookingStorage } from "./interfaces/booking.storage";
import { BlackoutStorage } from "./interfaces/blackout.storage";
import { ConfigStorage } from "./interfaces/config.storage";
import { PriorityStorage } from "./interfaces/priority.storage";
import {
    LocationNodeType,
    BookingStatus,
    BlackoutScope,
} from "./types/enums";
import type { LocationNode, Room } from "./types/entities";

// ─── Storage Bag ───────────────────────────────────────────────

export interface SeederStorages {
    location: LocationStorage;
    room: RoomStorage;
    booking: BookingStorage;
    blackout: BlackoutStorage;
    config: ConfigStorage;
    priority: PriorityStorage;
}

// ─── Helpers ───────────────────────────────────────────────────

function uuid(): string {
    return crypto.randomUUID();
}

function pickRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function chance(pct: number): boolean {
    return Math.random() * 100 < pct;
}

function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // shift to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// ─── Room Templates ────────────────────────────────────────────

interface RoomTemplate {
    suffix: string;
    seated: number;
    exam: number;
    standing: number;
    kind: "small" | "medium" | "large" | "lecture_hall";
}

function roomTemplatesForFloor(
    buildingLetter: string,
    floorPrefix: string,
    floorIndex: number,
): RoomTemplate[] {
    const templates: RoomTemplate[] = [];
    const base = floorIndex === 0 ? "G" : String(floorIndex);

    // Every floor gets a mix of room sizes
    // Small rooms (20 seats) - 3 per floor
    for (let i = 1; i <= 3; i++) {
        templates.push({
            suffix: `${buildingLetter}-${base}${String(i).padStart(2, "0")}`,
            seated: 20,
            exam: 10,
            standing: 30,
            kind: "small",
        });
    }

    // Medium rooms (50 seats) - 2 per floor
    for (let i = 4; i <= 5; i++) {
        templates.push({
            suffix: `${buildingLetter}-${base}${String(i).padStart(2, "0")}`,
            seated: 50,
            exam: 25,
            standing: 70,
            kind: "medium",
        });
    }

    // Large room (100 seats) - 1 per floor
    templates.push({
        suffix: `${buildingLetter}-${base}06`,
        seated: 100,
        exam: 50,
        standing: 140,
        kind: "large",
    });

    // Lecture hall on ground floor only
    if (floorIndex === 0) {
        templates.push({
            suffix: `${buildingLetter}-${base}07`,
            seated: 200,
            exam: 100,
            standing: 250,
            kind: "lecture_hall",
        });
    }

    return templates;
}

// ─── Seeder Class ──────────────────────────────────────────────

export class RoomKitSeeder {
    private readonly storages: SeederStorages;

    constructor(storages: SeederStorages) {
        this.storages = storages;
    }

    async seed(): Promise<{
        locationNodes: LocationNode[];
        rooms: Room[];
        bookingCount: number;
    }> {
        const allNodes: LocationNode[] = [];
        const allRooms: Room[] = [];

        // ── 1. Location Hierarchy ─────────────────────────────

        // Institution
        const institution = await this.storages.location.createNode({
            parentId: null,
            type: LocationNodeType.INSTITUTION,
            displayName: "University of Example",
            path: "/university-of-example",
            aliases: ["UoE", "UniExample"],
            isActive: true,
            metadata: null,
        });
        allNodes.push(institution);

        // Campuses
        const campusData = [
            { name: "North Campus", slug: "north" },
            { name: "South Campus", slug: "south" },
        ];
        const campuses: LocationNode[] = [];
        for (const c of campusData) {
            const campus = await this.storages.location.createNode({
                parentId: institution.id,
                type: LocationNodeType.CAMPUS,
                displayName: c.name,
                path: `${institution.path}/${c.slug}`,
                aliases: [],
                isActive: true,
                metadata: null,
            });
            campuses.push(campus);
            allNodes.push(campus);
        }

        // Buildings: A, B on North; C, D on South
        const buildingMap: { letter: string; campus: LocationNode }[] = [
            { letter: "A", campus: campuses[0] },
            { letter: "B", campus: campuses[0] },
            { letter: "C", campus: campuses[1] },
            { letter: "D", campus: campuses[1] },
        ];

        const buildings: LocationNode[] = [];
        for (const b of buildingMap) {
            const building = await this.storages.location.createNode({
                parentId: b.campus.id,
                type: LocationNodeType.BUILDING,
                displayName: `Building ${b.letter}`,
                path: `${b.campus.path}/building-${b.letter.toLowerCase()}`,
                aliases: [`Bldg ${b.letter}`],
                isActive: true,
                metadata: null,
            });
            buildings.push(building);
            allNodes.push(building);
        }

        // Floors: 2 per building (Ground Floor, First Floor)
        const floorNames = ["Ground Floor", "First Floor"];
        const floors: { node: LocationNode; buildingLetter: string; floorIndex: number }[] = [];

        for (let bi = 0; bi < buildings.length; bi++) {
            const building = buildings[bi];
            const letter = buildingMap[bi].letter;

            for (let fi = 0; fi < floorNames.length; fi++) {
                const floorSlug = fi === 0 ? "ground" : `floor-${fi}`;
                const floor = await this.storages.location.createNode({
                    parentId: building.id,
                    type: LocationNodeType.FLOOR,
                    displayName: floorNames[fi],
                    path: `${building.path}/${floorSlug}`,
                    aliases: [],
                    isActive: true,
                    metadata: null,
                });
                floors.push({
                    node: floor,
                    buildingLetter: letter,
                    floorIndex: fi,
                });
                allNodes.push(floor);
            }
        }

        // ── 2. Rooms ──────────────────────────────────────────

        const allEquipmentTags = ["projector", "whiteboard", "av-system", "lab-fume-hood"];
        const allAccessibilityAttrs = ["wheelchair", "hearing-loop", "adjustable-desks"];

        for (const floorInfo of floors) {
            const templates = roomTemplatesForFloor(
                floorInfo.buildingLetter,
                "",
                floorInfo.floorIndex,
            );

            for (const tpl of templates) {
                // Create room location node
                const roomNode = await this.storages.location.createNode({
                    parentId: floorInfo.node.id,
                    type: LocationNodeType.ROOM,
                    displayName: tpl.suffix,
                    path: `${floorInfo.node.path}/${tpl.suffix.toLowerCase()}`,
                    aliases: [],
                    isActive: true,
                    metadata: null,
                });
                allNodes.push(roomNode);

                // Create room entity
                const setupBuffer = tpl.kind === "lecture_hall" ? 15 : tpl.kind === "large" ? 10 : 5;
                const teardownBuffer = tpl.kind === "lecture_hall" ? 15 : tpl.kind === "large" ? 10 : 5;

                const room = await this.storages.room.create({
                    locationNodeId: roomNode.id,
                    seatedCapacity: tpl.seated,
                    examCapacity: tpl.exam,
                    standingCapacity: tpl.standing,
                    setupBufferMinutes: setupBuffer,
                    teardownBufferMinutes: teardownBuffer,
                    isActive: true,
                    metadata: null,
                });
                allRooms.push(room);

                // Equipment (probabilistic)
                if (chance(80)) {
                    await this.storages.room.addEquipment(room.id, "projector");
                }
                if (chance(90)) {
                    await this.storages.room.addEquipment(room.id, "whiteboard");
                }
                if (chance(40)) {
                    await this.storages.room.addEquipment(room.id, "av-system");
                }
                if (chance(5)) {
                    await this.storages.room.addEquipment(room.id, "lab-fume-hood");
                }

                // Accessibility (probabilistic)
                if (chance(60)) {
                    await this.storages.room.addAccessibility(room.id, "wheelchair");
                }
                if (chance(30)) {
                    await this.storages.room.addAccessibility(room.id, "hearing-loop");
                }
                if (chance(20)) {
                    await this.storages.room.addAccessibility(room.id, "adjustable-desks");
                }
            }
        }

        // ── 3. Partitions (3 pairs) ──────────────────────────

        // Pick the first 3 large/lecture-hall rooms as parents, pair with small rooms
        const largeRooms = allRooms.filter((r) => r.seatedCapacity >= 100);
        const smallRooms = allRooms.filter((r) => r.seatedCapacity === 20);

        const partitionCount = Math.min(3, largeRooms.length, smallRooms.length);
        for (let i = 0; i < partitionCount; i++) {
            await this.storages.room.createPartition({
                parentRoomId: largeRooms[i].id,
                childRoomId: smallRooms[i].id,
            });
        }

        // ── 4. Operating Hours ────────────────────────────────

        // Set operating hours on each building node (inherited by floors/rooms)
        for (const building of buildings) {
            const weekdayHours = [];
            for (let day = 1; day <= 5; day++) {
                // Monday=1 .. Friday=5
                weekdayHours.push({
                    dayOfWeek: day,
                    opensAt: "08:00",
                    closesAt: "22:00",
                });
            }
            // Weekend
            weekdayHours.push({
                dayOfWeek: 0, // Sunday
                opensAt: "09:00",
                closesAt: "17:00",
            });
            weekdayHours.push({
                dayOfWeek: 6, // Saturday
                opensAt: "09:00",
                closesAt: "17:00",
            });

            await this.storages.room.setOperatingHours(building.id, weekdayHours);
        }

        // ── 5. Priority Tiers ─────────────────────────────────

        const tiers = [
            { name: "LECTURE", weight: 100 },
            { name: "SEMINAR", weight: 75 },
            { name: "STUDY_GROUP", weight: 50 },
            { name: "OPEN", weight: 25 },
        ];
        for (const tier of tiers) {
            await this.storages.priority.upsert(tier);
        }

        // ── 6. Bookings (~100 over a week) ────────────────────

        const purposeTypes = ["lecture", "seminar", "study_group", "open"];
        const priorityByPurpose: Record<string, number> = {
            lecture: 100,
            seminar: 75,
            study_group: 50,
            open: 25,
        };
        const statuses: BookingStatus[] = [
            BookingStatus.REQUESTED,
            BookingStatus.CONFIRMED,
            BookingStatus.IN_PROGRESS,
            BookingStatus.COMPLETED,
            BookingStatus.CANCELLED,
        ];
        // Distribution weights: mostly confirmed, some completed, a few others
        const statusWeights = [
            { status: BookingStatus.CONFIRMED, weight: 40 },
            { status: BookingStatus.COMPLETED, weight: 25 },
            { status: BookingStatus.REQUESTED, weight: 15 },
            { status: BookingStatus.IN_PROGRESS, weight: 10 },
            { status: BookingStatus.CANCELLED, weight: 10 },
        ];

        function weightedStatus(): BookingStatus {
            const total = statusWeights.reduce((s, w) => s + w.weight, 0);
            let r = Math.random() * total;
            for (const sw of statusWeights) {
                r -= sw.weight;
                if (r <= 0) return sw.status;
            }
            return BookingStatus.CONFIRMED;
        }

        const weekStart = startOfWeek(new Date());
        const requesterIds = Array.from({ length: 20 }, () => uuid());
        let bookingCount = 0;

        for (let i = 0; i < 100; i++) {
            const room = pickRandom(allRooms);
            const dayOffset = Math.floor(Math.random() * 7); // 0-6 days into the week
            const hourOffset = 8 + Math.floor(Math.random() * 12); // 8am - 7pm start
            const durationHours = pickRandom([1, 1.5, 2, 3]);
            const purpose = pickRandom(purposeTypes);

            const startsAt = addHours(addDays(weekStart, dayOffset), hourOffset);
            const endsAt = addHours(startsAt, durationHours);

            const requesterId = pickRandom(requesterIds);

            try {
                await this.storages.booking.createWithConflictCheck(
                    {
                        roomId: room.id,
                        requesterId,
                        onBehalfOfId: chance(20) ? uuid() : null,
                        title: `${purpose.charAt(0).toUpperCase() + purpose.slice(1).replace("_", " ")} - Room ${room.id.slice(0, 8)}`,
                        description: chance(60)
                            ? `Scheduled ${purpose.replace("_", " ")} session`
                            : null,
                        startsAt,
                        endsAt,
                        status: weightedStatus(),
                        priority: priorityByPurpose[purpose],
                        purposeType: purpose,
                        idempotencyKey: null,
                        recurrenceRuleId: null,
                        recurrenceModType: null,
                        metadata: null,
                    },
                    {
                        checkPartitions: false,
                        checkBuffers: false,
                    },
                );
                bookingCount++;
            } catch {
                // Skip conflicting bookings silently — this is seed data
            }
        }

        // ── 7. Blackout Windows ───────────────────────────────

        // Holiday blackout across the entire institution
        const holidayStart = addDays(weekStart, 5); // Saturday of seed week
        await this.storages.blackout.create({
            locationNodeId: institution.id,
            scope: BlackoutScope.INSTITUTION,
            title: "Public Holiday",
            reason: "National holiday - all facilities closed",
            startsAt: holidayStart,
            endsAt: addHours(holidayStart, 24),
            isRecurring: false,
            recurrenceRuleId: null,
        });

        // Maintenance window for Building A
        const maintenanceStart = addDays(weekStart, 3); // Thursday
        maintenanceStart.setHours(18, 0, 0, 0);
        await this.storages.blackout.create({
            locationNodeId: buildings[0].id,
            scope: BlackoutScope.BUILDING,
            title: "Scheduled Maintenance",
            reason: "HVAC system maintenance - Building A",
            startsAt: maintenanceStart,
            endsAt: addHours(maintenanceStart, 4),
            isRecurring: false,
            recurrenceRuleId: null,
        });

        // ── 8. Config Entries ─────────────────────────────────

        // Global defaults
        await this.storages.config.set(
            null,
            "default_booking_duration_minutes",
            "90",
        );
        await this.storages.config.set(
            null,
            "max_booking_duration_minutes",
            "480",
        );
        await this.storages.config.set(
            null,
            "default_setup_buffer_minutes",
            "5",
        );
        await this.storages.config.set(
            null,
            "default_teardown_buffer_minutes",
            "5",
        );
        await this.storages.config.set(
            null,
            "max_advance_booking_days",
            "90",
        );

        // Campus-specific override: North Campus has longer buffers
        await this.storages.config.set(
            campuses[0].id,
            "default_setup_buffer_minutes",
            "10",
        );
        await this.storages.config.set(
            campuses[0].id,
            "default_teardown_buffer_minutes",
            "10",
        );

        return {
            locationNodes: allNodes,
            rooms: allRooms,
            bookingCount,
        };
    }
}

// ─── Convenience Function ──────────────────────────────────────

export async function seedRoomKit(storages: SeederStorages): Promise<{
    locationNodes: LocationNode[];
    rooms: Room[];
    bookingCount: number;
}> {
    const seeder = new RoomKitSeeder(storages);
    return seeder.seed();
}
