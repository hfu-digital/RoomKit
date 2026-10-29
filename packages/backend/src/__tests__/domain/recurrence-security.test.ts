import { describe, expect, it } from 'bun:test';
import { RecurrenceService } from '../../domain/recurrence.service';
import { RecurrenceFrequency } from '../../types/enums';
const service = new RecurrenceService(null as any, null as any, null as any);
const base = {frequency:RecurrenceFrequency.WEEKLY, daysOfWeek:[1], calendarWeeks:null, exceptionDates:[], seriesStartsAt:new Date('2026-01-01'),seriesEndsAt:new Date('2026-02-01')};
describe('bounded recurrence expansion', () => {
 it('preserves weekly output', () => expect(service.expandSeries(base)).toHaveLength(4));
 it('rejects invalid or extreme ranges before iterating', () => {
  for(const seriesEndsAt of [new Date('invalid'),new Date('2025-01-01'),new Date('9999-01-01')]) expect(() => service.expandSeries({...base,seriesEndsAt})).toThrow();
 });
 it('rejects duplicate/out-of-range days and oversized exception input', () => {
  for(const daysOfWeek of [[1,1],[7],Array(1000).fill(1)]) expect(() => service.expandSeries({...base,daysOfWeek})).toThrow();
  expect(() => service.expandSeries({...base,exceptionDates:Array(10001).fill(new Date())})).toThrow();
 });
});
