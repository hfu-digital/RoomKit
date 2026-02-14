import { useState, useCallback } from "react";
import { useApiClient } from "../lib/api-client";
import type { Booking } from "../types";

export interface ModifyBookingInput {
    roomId?: string;
    title?: string;
    description?: string | null;
    startsAt?: string;
    endsAt?: string;
    priority?: number;
    purposeType?: string;
    onBehalfOfId?: string | null;
    metadata?: string | null;
}

export interface UseModifyBookingOptions {
    bookingId: string;
    onSuccess?: (data: Booking) => void;
    onError?: (error: Error) => void;
}

export function useModifyBooking(options: UseModifyBookingOptions) {
    const api = useApiClient();
    const [data, setData] = useState<Booking | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (input: ModifyBookingInput) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await api.put<Booking>(`/bookings/${options.bookingId}`, input);
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
    }, [api, options.bookingId, options.onSuccess, options.onError]);

    return { mutate, data, isLoading, error };
}
