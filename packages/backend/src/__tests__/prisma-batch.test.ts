import { test, expect, mock } from 'bun:test';
import { PrismaBlackoutAdapter } from '../adapters/prisma/prisma-blackout.adapter';
import { PrismaLocationAdapter } from '../adapters/prisma/prisma-location.adapter';
import { PrismaRoomAdapter } from '../adapters/prisma/prisma-room.adapter';
import { PrismaBookingAdapter } from '../adapters/prisma/prisma-booking.adapter';
import { BookingStateMachine } from '../domain/state-machine';
import type { RoomKitPrismaClient } from '../types/prisma-delegates';

test('blackout batches read ancestors once and do not leak sibling scope', async () => {
    const nodes = [{ id: 'a', path: 'campus/a' }, { id: 'b', path: 'campus/b' }];
    const findNodes = mock(async (args: { where: { id?: unknown } }) => args.where.id ? nodes : [{ id: 'campus', path: 'campus' }, ...nodes]);
    const findBlackouts = mock(async () => [{ id: 'global', locationNodeId: 'campus' }, { id: 'private', locationNodeId: 'a' }]);
    const prisma = { locationNode: { findMany: findNodes }, blackoutWindow: { findMany: findBlackouts } } as unknown as RoomKitPrismaClient;
    const adapter = new PrismaBlackoutAdapter(prisma);
    const result = await adapter.findActiveForScopes(['a', 'b', 'missing'], { startsAt: new Date(0), endsAt: new Date(10) });
    expect(result.a!.map(r => r.id)).toEqual(['global', 'private']);
    expect(result.b!.map(r => r.id)).toEqual(['global']);
    expect(result.missing).toEqual([]);
    expect(findNodes).toHaveBeenCalledTimes(2); expect(findBlackouts).toHaveBeenCalledTimes(1);
});
test('scope and all equipment/accessibility predicates execute in storage', async () => {
    const findMany = mock(async () => []);
    const prisma = { locationNode: { findMany }, room: { findMany } } as unknown as RoomKitPrismaClient;
    await new PrismaLocationAdapter(prisma).queryByScope({ parentPath: 'a', isActive: true });
    expect(findMany).toHaveBeenLastCalledWith({ where: { isActive: true, OR: [{ path: 'a' }, { path: { startsWith: 'a/' } }] } });
    await new PrismaRoomAdapter(prisma).findByCompoundFilter({ equipment: ['a', 'b'], accessibility: ['lift'], locationScope: 'campus' });
    expect(findMany).toHaveBeenLastCalledWith({ where: { AND: [{ equipment: { some: { tag: 'a' } } }, { equipment: { some: { tag: 'b' } } }, { accessibility: { some: { attribute: 'lift' } } }], locationNode: { OR: [{ path: 'campus' }, { path: { startsWith: 'campus/' } }] } } });
    expect(findMany).toHaveBeenCalledTimes(2);
});
test('pagination cursor is the last returned booking, not the look-ahead row', async () => {
    const findMany = mock(async () => [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const prisma = { booking: { findMany } } as unknown as RoomKitPrismaClient;
    const adapter = new PrismaBookingAdapter(prisma, new BookingStateMachine());
    const page = await adapter.findByPerson('p', { startsAt: new Date(0), endsAt: new Date(10) }, { limit: 2 });
    expect(page.items.map(r => r.id)).toEqual(['a', 'b']); expect(page.nextCursor).toBe('b');
});
