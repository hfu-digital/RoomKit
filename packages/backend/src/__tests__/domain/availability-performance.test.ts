import { test, expect, spyOn } from 'bun:test';
import { AvailabilityService } from '../../domain/availability.service';
import { TravelTimeService } from '../../domain/travel-time.service';
import { MockRoomStorage } from '../mocks/mock-room.storage';
import { MockBookingStorage } from '../mocks/mock-booking.storage';
import { MockBlackoutStorage } from '../mocks/mock-blackout.storage';
import { MockLocationStorage } from '../mocks/mock-location.storage';
import { LocationNodeType, BlackoutScope } from '../../types/enums';

const after = new Date('2026-03-02T08:00:00Z');
async function room(storage: MockRoomStorage, locationNodeId = 'location') {
    return storage.create({ locationNodeId, seatedCapacity: 30, examCapacity: 15, standingCapacity: 45, setupBufferMinutes: 0, teardownBufferMinutes: 0, isActive: true, metadata: null });
}
test('14 day scan reads each range once and respects blackout boundaries', async () => {
    const rooms = new MockRoomStorage(), bookings = new MockBookingStorage(), blackouts = new MockBlackoutStorage();
    const r = await room(rooms);
    await blackouts.create({ locationNodeId: r.locationNodeId, startsAt: after, endsAt: new Date(after.getTime() + 13 * 86400000), reason: 'closed', scope: BlackoutScope.ROOM, title: 'Closed', isRecurring: false, recurrenceRuleId: null });
    const bookingRead = spyOn(bookings, 'findOverlapping'), blackoutRead = spyOn(blackouts, 'findActiveForScope');
    const service = new AvailabilityService(rooms, bookings, blackouts);
    const slots = await service.findNextAvailable(r.id, after, 60, 2);
    expect(slots).toHaveLength(2);
    expect(slots[0]!.startsAt.getTime()).toBe(after.getTime() + 13 * 86400000);
    expect(bookingRead).toHaveBeenCalledTimes(1);
    expect(blackoutRead).toHaveBeenCalledTimes(1);
    expect(bookingRead.mock.calls[0]![2].getTime()).toBe(after.getTime() + 14 * 86400000 + 3600000);
});
test('search batches 401 candidates and matches legacy scoring and pagination', async () => {
    const rooms = new MockRoomStorage(), bookings = new MockBookingStorage(), blackouts = new MockBlackoutStorage();
    for (let i = 0; i < 401; i++) await room(rooms);
    const filters = { timeRange: { startsAt: after, endsAt: new Date(after.getTime() + 3600000) } };
    const service = new AvailabilityService(rooms, bookings, blackouts);
    const legacy = await service.search(filters, { limit: 10 });
    let reads = 0;
    Object.assign(bookings, { findOverlappingBatch: async (ids: string[]) => { expect(ids.length).toBeLessThanOrEqual(200); reads++; return []; } });
    Object.assign(blackouts, { findActiveForScopes: async (ids: string[]) => Object.fromEntries(ids.map(id => [id, []])) });
    Object.assign(rooms, { getWithEquipmentBatch: async (ids: string[]) => Promise.all(ids.map(id => rooms.getWithEquipment(id))) });
    expect(await service.search(filters, { limit: 10 })).toEqual(legacy);
    expect(reads).toBe(3);
    const next = await service.search(filters, { limit: 10, cursor: legacy.nextCursor });
    expect(next.items[0]!.room.id).not.toBe(legacy.items[0]!.room.id);
});
test('travel checks use distinct room and location IDs and memoize repeated rooms', async () => {
    const rooms = new MockRoomStorage(), bookings = new MockBookingStorage(), locations = new MockLocationStorage();
    const campus = await locations.createNode({ parentId: null, type: LocationNodeType.CAMPUS, displayName: 'Campus', path: 'campus', aliases: [], isActive: true, metadata: null });
    const node = await locations.createNode({ parentId: campus.id, type: LocationNodeType.ROOM, displayName: 'Room', path: 'campus/room', aliases: [], isActive: true, metadata: null });
    const r = await room(rooms, node.id);
    const lookup = spyOn(locations, 'getById');
    const service = new TravelTimeService({}, bookings, locations, rooms);
    expect((await service.validatePersonSchedule('p', { roomId: r.id, startsAt: after, endsAt: new Date(after.getTime() + 3600000) })).valid).toBe(true);
    expect(lookup.mock.calls[0]![0]).toBe(node.id);
    expect(lookup.mock.calls.some(c => c[0] === r.id)).toBe(false);
});
test('travel checks all pages and resolve repeated rooms only once', async () => {
    const rooms = new MockRoomStorage(), bookings = new MockBookingStorage(), locations = new MockLocationStorage();
    const a = await locations.createNode({ parentId: null, type: LocationNodeType.CAMPUS, displayName: 'A', path: 'a', aliases: [], isActive: true, metadata: null });
    const b = await locations.createNode({ parentId: null, type: LocationNodeType.CAMPUS, displayName: 'B', path: 'b', aliases: [], isActive: true, metadata: null });
    const ra = await room(rooms, a.id), rb = await room(rooms, b.id);
    let pages = 0;
    bookings.findByPerson = async (_person, _range, pagination) => {
        pages++;
        const items = Array.from({ length: 10 }, (_, i) => ({ id: `${pages}-${i}`, roomId: i % 2 ? ra.id : rb.id, startsAt: new Date(after.getTime() + (pages * 10 + i) * 60000), endsAt: new Date(after.getTime() + (pages * 10 + i + 1) * 60000), status: 'confirmed' } as import('../../types/entities').Booking));
        return { items, nextCursor: pagination?.cursor ? undefined : 'next' };
    };
    const locationReads = spyOn(locations, 'getById'), roomReads = spyOn(rooms, 'findById');
    const service = new TravelTimeService({ [`${a.id}|${b.id}`]: 30 }, bookings, locations, rooms);
    const result = await service.validatePersonSchedule('p', { roomId: ra.id, startsAt: after, endsAt: new Date(after.getTime() + 60000) });
    expect(result.valid).toBe(false); expect(result.violations.length).toBeGreaterThan(0);
    expect(pages).toBe(2); expect(locationReads).toHaveBeenCalledTimes(2); expect(roomReads).toHaveBeenCalledTimes(2);
});
