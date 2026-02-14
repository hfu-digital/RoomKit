import { useState, useEffect, useCallback, useRef } from "react";
import { useApiClient } from "../lib/api-client";
import type { Booking, PaginatedResult, Pagination } from "../types";

export interface UseBookingsFilters {
    personId?: string;
    roomId?: string;
    startsAt?: Date;
    endsAt?: Date;
    status?: string;
}

export interface UseBookingsOptions {
    filters?: UseBookingsFilters;
    pagination?: Pagination;
    enabled?: boolean;
    onSuccess?: (data: PaginatedResult<Booking>) => void;
    onError?: (error: Error) => void;
}

export function useBookings(options: UseBookingsOptions = {}) {
    const api = useApiClient();
    const [data, setData] = useState<PaginatedResult<Booking> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fetch = useCallback(async () => {
        if (options.enabled === false) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        setError(null);

        try {
            const params: Record<string, string> = {};
            if (options.filters?.personId) params.personId = options.filters.personId;
            if (options.filters?.roomId) params.roomId = options.filters.roomId;
            if (options.filters?.startsAt) params.startsAt = options.filters.startsAt.toISOString();
            if (options.filters?.endsAt) params.endsAt = options.filters.endsAt.toISOString();
            if (options.filters?.status) params.status = options.filters.status;
            if (options.pagination?.cursor) params.cursor = options.pagination.cursor;
            if (options.pagination?.limit) params.limit = String(options.pagination.limit);

            const result = await api.get<PaginatedResult<Booking>>("/bookings", params);
            if (!controller.signal.aborted) {
                setData(result);
                options.onSuccess?.(result);
            }
        } catch (err) {
            if (!controller.signal.aborted) {
                const e = err instanceof Error ? err : new Error(String(err));
                setError(e);
                options.onError?.(e);
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
            }
        }
    }, [api, JSON.stringify(options.filters), JSON.stringify(options.pagination), options.enabled]);

    useEffect(() => {
        fetch();
        return () => {
            abortRef.current?.abort();
        };
    }, [fetch]);

    return { data, isLoading, error, refetch: fetch };
}
