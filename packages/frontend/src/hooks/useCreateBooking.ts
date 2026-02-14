import { useState, useCallback } from "react";
import { useApiClient } from "../lib/api-client";
import type { Booking, RecurrenceModType } from "../types";

export interface CreateBookingInput {
    roomId: string;
    requesterId: string;
    onBehalfOfId?: string | null;
    title: string;
    description?: string | null;
    startsAt: string;
    endsAt: string;
    priority?: number;
    purposeType: string;
    recurrenceRuleId?: string | null;
    recurrenceModType?: RecurrenceModType | null;
    metadata?: string | null;
}

export interface UseCreateBookingOptions {
    onSuccess?: (data: Booking) => void;
    onError?: (error: Error) => void;
}

export function useCreateBooking(options: UseCreateBookingOptions = {}) {
    const api = useApiClient();
    const [data, setData] = useState<Booking | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (input: CreateBookingInput) => {
        setIsLoading(true);
        setError(null);

        try {
            const idempotencyKey = crypto.randomUUID();
            const result = await api.post<Booking>("/bookings", {
                ...input,
                idempotencyKey,
            });
            setData(result);
            options.onSuccess?.(result);
            return result;
        } catch (err) {
            const e = err instanceof Error ? err : new Error(String(err));
            setError(e);
            options.onError?.(e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, [api, options.onSuccess, options.onError]);

    return { mutate, data, isLoading, error };
}
