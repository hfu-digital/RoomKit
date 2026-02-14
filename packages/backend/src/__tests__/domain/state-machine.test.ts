import { describe, test, expect } from "bun:test";
import { BookingStateMachine } from "../../domain/state-machine";
import { BookingStatus } from "../../types/enums";
import { InvalidStateTransitionError } from "../../errors/roomkit.error";

const sm = new BookingStateMachine();

// ─── Valid Transitions ─────────────────────────────────────────────

describe("BookingStateMachine – valid transitions", () => {
    test("requested -> confirmed", () => {
        expect(sm.canTransition(BookingStatus.REQUESTED, BookingStatus.CONFIRMED)).toBe(true);
        expect(() => sm.validateTransition(BookingStatus.REQUESTED, BookingStatus.CONFIRMED)).not.toThrow();
    });

    test("confirmed -> in_progress", () => {
        expect(sm.canTransition(BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS)).toBe(true);
        expect(() => sm.validateTransition(BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS)).not.toThrow();
    });

    test("in_progress -> completed", () => {
        expect(sm.canTransition(BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED)).toBe(true);
        expect(() => sm.validateTransition(BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED)).not.toThrow();
    });

    test("requested -> cancelled", () => {
        expect(sm.canTransition(BookingStatus.REQUESTED, BookingStatus.CANCELLED)).toBe(true);
        expect(() => sm.validateTransition(BookingStatus.REQUESTED, BookingStatus.CANCELLED)).not.toThrow();
    });

    test("confirmed -> cancelled", () => {
        expect(sm.canTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED)).toBe(true);
        expect(() => sm.validateTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED)).not.toThrow();
    });

    test("in_progress -> cancelled", () => {
        expect(sm.canTransition(BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED)).toBe(true);
        expect(() => sm.validateTransition(BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED)).not.toThrow();
    });
});

// ─── Invalid Transitions ───────────────────────────────────────────

describe("BookingStateMachine – invalid transitions", () => {
    const invalidTransitions: [BookingStatus, BookingStatus][] = [
        // From REQUESTED: cannot go to IN_PROGRESS or COMPLETED
        [BookingStatus.REQUESTED, BookingStatus.IN_PROGRESS],
        [BookingStatus.REQUESTED, BookingStatus.COMPLETED],

        // From CONFIRMED: cannot go to REQUESTED or COMPLETED
        [BookingStatus.CONFIRMED, BookingStatus.REQUESTED],
        [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],

        // From IN_PROGRESS: cannot go to REQUESTED or CONFIRMED
        [BookingStatus.IN_PROGRESS, BookingStatus.REQUESTED],
        [BookingStatus.IN_PROGRESS, BookingStatus.CONFIRMED],

        // From COMPLETED: cannot go anywhere
        [BookingStatus.COMPLETED, BookingStatus.REQUESTED],
        [BookingStatus.COMPLETED, BookingStatus.CONFIRMED],
        [BookingStatus.COMPLETED, BookingStatus.IN_PROGRESS],
        [BookingStatus.COMPLETED, BookingStatus.CANCELLED],

        // From CANCELLED: cannot go anywhere
        [BookingStatus.CANCELLED, BookingStatus.REQUESTED],
        [BookingStatus.CANCELLED, BookingStatus.CONFIRMED],
        [BookingStatus.CANCELLED, BookingStatus.IN_PROGRESS],
        [BookingStatus.CANCELLED, BookingStatus.COMPLETED],
    ];

    for (const [from, to] of invalidTransitions) {
        test(`${from} -> ${to} should be rejected`, () => {
            expect(sm.canTransition(from, to)).toBe(false);
            expect(() => sm.validateTransition(from, to)).toThrow(InvalidStateTransitionError);
        });
    }

    test("validateTransition throws with correct context", () => {
        try {
            sm.validateTransition(BookingStatus.COMPLETED, BookingStatus.IN_PROGRESS);
            // Should not reach here
            expect(true).toBe(false);
        } catch (err) {
            expect(err).toBeInstanceOf(InvalidStateTransitionError);
            const error = err as InvalidStateTransitionError;
            expect(error.code).toBe("INVALID_STATE_TRANSITION");
            expect(error.context.currentStatus).toBe(BookingStatus.COMPLETED);
            expect(error.context.attemptedStatus).toBe(BookingStatus.IN_PROGRESS);
            expect(error.context.allowedTransitions).toEqual([]);
        }
    });
});

// ─── Terminal State Detection ──────────────────────────────────────

describe("BookingStateMachine – terminal state detection", () => {
    test("completed is terminal", () => {
        expect(sm.isTerminal(BookingStatus.COMPLETED)).toBe(true);
    });

    test("cancelled is terminal", () => {
        expect(sm.isTerminal(BookingStatus.CANCELLED)).toBe(true);
    });

    test("requested is NOT terminal", () => {
        expect(sm.isTerminal(BookingStatus.REQUESTED)).toBe(false);
    });

    test("confirmed is NOT terminal", () => {
        expect(sm.isTerminal(BookingStatus.CONFIRMED)).toBe(false);
    });

    test("in_progress is NOT terminal", () => {
        expect(sm.isTerminal(BookingStatus.IN_PROGRESS)).toBe(false);
    });
});

// ─── getAllowedTransitions ─────────────────────────────────────────

describe("BookingStateMachine – getAllowedTransitions", () => {
    test("requested allows confirmed and cancelled", () => {
        const allowed = sm.getAllowedTransitions(BookingStatus.REQUESTED);
        expect(allowed).toContain(BookingStatus.CONFIRMED);
        expect(allowed).toContain(BookingStatus.CANCELLED);
        expect(allowed).toHaveLength(2);
    });

    test("confirmed allows in_progress and cancelled", () => {
        const allowed = sm.getAllowedTransitions(BookingStatus.CONFIRMED);
        expect(allowed).toContain(BookingStatus.IN_PROGRESS);
        expect(allowed).toContain(BookingStatus.CANCELLED);
        expect(allowed).toHaveLength(2);
    });

    test("in_progress allows completed and cancelled", () => {
        const allowed = sm.getAllowedTransitions(BookingStatus.IN_PROGRESS);
        expect(allowed).toContain(BookingStatus.COMPLETED);
        expect(allowed).toContain(BookingStatus.CANCELLED);
        expect(allowed).toHaveLength(2);
    });

    test("completed allows nothing", () => {
        const allowed = sm.getAllowedTransitions(BookingStatus.COMPLETED);
        expect(allowed).toEqual([]);
    });

    test("cancelled allows nothing", () => {
        const allowed = sm.getAllowedTransitions(BookingStatus.CANCELLED);
        expect(allowed).toEqual([]);
    });
});
