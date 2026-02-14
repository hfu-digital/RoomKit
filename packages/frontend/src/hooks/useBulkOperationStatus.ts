import { useState, useEffect, useCallback, useRef } from "react";
import { useApiClient } from "../lib/api-client";
import type { BulkOperation, BulkOperationStatus } from "../types";

export interface UseBulkOperationStatusOptions {
    operationId: string;
    pollIntervalMs?: number;
    enabled?: boolean;
    onSuccess?: (data: BulkOperation) => void;
    onError?: (error: Error) => void;
    onComplete?: (data: BulkOperation) => void;
}

const TERMINAL_STATUSES: BulkOperationStatus[] = [
    "completed" as BulkOperationStatus,
    "failed" as BulkOperationStatus,
];

export function useBulkOperationStatus(options: UseBulkOperationStatusOptions) {
    const api = useApiClient();
    const [data, setData] = useState<BulkOperation | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetch = useCallback(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        setError(null);

        try {
            const result = await api.get<BulkOperation>(`/bulk-operations/${options.operationId}`);
            if (!controller.signal.aborted) {
                setData(result);
                options.onSuccess?.(result);

                if (TERMINAL_STATUSES.includes(result.status)) {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    options.onComplete?.(result);
                }
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
    }, [api, options.operationId]);

    useEffect(() => {
        if (options.enabled === false) return;

        fetch();

        const pollInterval = options.pollIntervalMs ?? 2000;
        intervalRef.current = setInterval(fetch, pollInterval);

        return () => {
            abortRef.current?.abort();
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [fetch, options.enabled, options.pollIntervalMs]);

    return { data, isLoading, error, refetch: fetch };
}
