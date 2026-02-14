import { Injectable } from '@nestjs/common';
import type {
    Booking,
    BlackoutWindow,
    BulkOperation,
    ExamSession,
    ConflictRecord,
    EventMetadata,
} from '../types/entities';

// ─── Event Discriminated Union ───────────────────────────────

export type RoomKitEvent =
    | { type: 'BookingRequested'; payload: Booking; metadata: EventMetadata }
    | { type: 'BookingConfirmed'; payload: Booking; metadata: EventMetadata }
    | { type: 'BookingStarted'; payload: Booking; metadata: EventMetadata }
    | { type: 'BookingCompleted'; payload: Booking; metadata: EventMetadata }
    | { type: 'BookingCancelled'; payload: Booking; metadata: EventMetadata }
    | { type: 'BookingModified'; payload: Booking; metadata: EventMetadata }
    | { type: 'ConflictDetected'; payload: ConflictRecord; metadata: EventMetadata }
    | { type: 'BlackoutCreated'; payload: BlackoutWindow; metadata: EventMetadata }
    | { type: 'BlackoutImpactDetected'; payload: { blackout: BlackoutWindow; impactedBookings: Booking[] }; metadata: EventMetadata }
    | { type: 'ExamSessionCreated'; payload: ExamSession; metadata: EventMetadata }
    | { type: 'BulkOperationProgress'; payload: BulkOperation; metadata: EventMetadata }
    | { type: 'BulkOperationCompleted'; payload: BulkOperation; metadata: EventMetadata };

// ─── Helper Types ────────────────────────────────────────────

export type RoomKitEventType = RoomKitEvent['type'];

export type EventPayload<T extends RoomKitEventType> = Extract<RoomKitEvent, { type: T }>['payload'];

// ─── Event Bus ───────────────────────────────────────────────

@Injectable()
export class EventBus {
    private listeners: Map<string, Set<(event: RoomKitEvent) => void>> = new Map();

    emit(event: RoomKitEvent): void {
        const handlers = this.listeners.get(event.type);
        if (!handlers) {
            return;
        }
        for (const handler of handlers) {
            handler(event);
        }
    }

    on<T extends RoomKitEventType>(
        type: T,
        handler: (event: Extract<RoomKitEvent, { type: T }>) => void,
    ): () => void {
        let handlers = this.listeners.get(type);
        if (!handlers) {
            handlers = new Set();
            this.listeners.set(type, handlers);
        }
        const wrappedHandler = handler as (event: RoomKitEvent) => void;
        handlers.add(wrappedHandler);

        return () => {
            handlers.delete(wrappedHandler);
            if (handlers.size === 0) {
                this.listeners.delete(type);
            }
        };
    }

    off<T extends RoomKitEventType>(
        type: T,
        handler: (event: Extract<RoomKitEvent, { type: T }>) => void,
    ): void {
        const handlers = this.listeners.get(type);
        if (!handlers) {
            return;
        }
        handlers.delete(handler as (event: RoomKitEvent) => void);
        if (handlers.size === 0) {
            this.listeners.delete(type);
        }
    }

    removeAllListeners(): void {
        this.listeners.clear();
    }
}
