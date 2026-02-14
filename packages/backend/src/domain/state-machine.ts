import { Injectable } from "@nestjs/common";
import { BookingStatus } from "../types/enums";
import { InvalidStateTransitionError } from "../errors/roomkit.error";

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
    [BookingStatus.REQUESTED]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
    [BookingStatus.CONFIRMED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
    [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
    [BookingStatus.COMPLETED]: [],
    [BookingStatus.CANCELLED]: [],
};

@Injectable()
export class BookingStateMachine {
    canTransition(from: BookingStatus, to: BookingStatus): boolean {
        return TRANSITIONS[from]?.includes(to) ?? false;
    }

    validateTransition(from: BookingStatus, to: BookingStatus): void {
        if (!this.canTransition(from, to)) {
            throw new InvalidStateTransitionError({
                bookingId: "",
                currentStatus: from,
                attemptedStatus: to,
                allowedTransitions: this.getAllowedTransitions(from),
            });
        }
    }

    getAllowedTransitions(from: BookingStatus): BookingStatus[] {
        return TRANSITIONS[from] ?? [];
    }

    isTerminal(status: BookingStatus): boolean {
        return (TRANSITIONS[status]?.length ?? 0) === 0;
    }
}
