import { useState, useEffect, useCallback, useRef } from "react";
import { useApiClient } from "../lib/api-client";
import type { AvailabilityFilter, AvailabilityResult, Pagination } from "../types";

export interface UseAvailabilityOptions {
    filters: AvailabilityFilter;
    pagination?: Pagination;
    debounceMs?: number;
    onSuccess?: (data: AvailabilityResult) => void;
    onError?: (error: Error) => void;
}

export function useAvailability(options: UseAvailabilityOptions) {
    const api = useApiClient();
    const [data, setData] = useState<AvailabilityResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fetch = useCallback(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        setError(null);

        try {
            const params: Record<string, string> = {};
            if (options.filters.timeRange) {
                params.startsAt = options.filters.timeRange.startsAt.toISOString();
                params.endsAt = options.filters.timeRange.endsAt.toISOString();
            }
            if (options.filters.minCapacity) params.minCapacity = String(options.filters.minCapacity);
            if (options.filters.capacityType) params.capacityType = options.filters.capacityType;
            if (options.filters.requiredEquipment?.length) params.requiredEquipment = options.filters.requiredEquipment.join(",");
            if (options.filters.requiredAccessibility?.length) params.requiredAccessibility = options.filters.requiredAccessibility.join(",");
            if (options.filters.locationScope) params.locationScope = options.filters.locationScope;
            if (options.pagination?.cursor) params.cursor = options.pagination.cursor;
            if (options.pagination?.limit) params.limit = String(options.pagination.limit);

            const result = await api.get<AvailabilityResult>("/availability", params);
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
    }, [api, JSON.stringify(options.filters), JSON.stringify(options.pagination)]);

    useEffect(() => {
        const timer = setTimeout(fetch, options.debounceMs ?? 300);
        return () => {
            clearTimeout(timer);
            abortRef.current?.abort();
        };
    }, [fetch, options.debounceMs]);

    return { data, isLoading, error, refetch: fetch };
}
