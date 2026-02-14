import { useState, useCallback } from "react";
import { useApiClient } from "../lib/api-client";
import type { Booking } from "../types";

export interface CancelBookingInput {
    reason?: string;
}

export interface UseCancelBookingOptions {
    bookingId: string;
    onSuccess?: (data: Booking) => void;
    onError?: (error: Error) => void;
}

export function useCancelBooking(options: UseCancelBookingOptions) {
    const api = useApiClient();
    const [data, setData] = useState<Booking | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (input: CancelBookingInput = {}) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await api.post<Booking>(`/bookings/${options.bookingId}/cancel`, input);
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
