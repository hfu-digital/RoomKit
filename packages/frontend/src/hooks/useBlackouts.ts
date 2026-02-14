import { useState, useEffect, useCallback, useRef } from "react";
import { useApiClient } from "../lib/api-client";
import type { BlackoutWindow, PaginatedResult, Pagination } from "../types";

export interface UseBlackoutsFilters {
    locationScope?: string;
    startsAt?: Date;
    endsAt?: Date;
}

export interface UseBlackoutsOptions {
    filters?: UseBlackoutsFilters;
    pagination?: Pagination;
    enabled?: boolean;
    onSuccess?: (data: PaginatedResult<BlackoutWindow>) => void;
    onError?: (error: Error) => void;
}

export function useBlackouts(options: UseBlackoutsOptions = {}) {
    const api = useApiClient();
    const [data, setData] = useState<PaginatedResult<BlackoutWindow> | null>(null);
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
            if (options.filters?.locationScope) params.locationScope = options.filters.locationScope;
            if (options.filters?.startsAt) params.startsAt = options.filters.startsAt.toISOString();
            if (options.filters?.endsAt) params.endsAt = options.filters.endsAt.toISOString();
            if (options.pagination?.cursor) params.cursor = options.pagination.cursor;
            if (options.pagination?.limit) params.limit = String(options.pagination.limit);

            const result = await api.get<PaginatedResult<BlackoutWindow>>("/blackouts", params);
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
