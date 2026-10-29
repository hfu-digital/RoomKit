import { PollLoop } from '../lib/poll-loop';
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
    const callbacks = useRef(options);
    callbacks.current = options;
    const loopRef = useRef<PollLoop | null>(null);
    const fetch = useCallback(async (signal: AbortSignal) => {
        setIsLoading(true);
        setError(null);
        let terminal = false;
        try {
            const result = await api.get<BulkOperation>(`/bulk-operations/${options.operationId}`, undefined, signal);
            if (signal.aborted) return true;
            setData(result);
            terminal = TERMINAL_STATUSES.includes(result.status);
            callbacks.current.onSuccess?.(result);
            if (terminal) callbacks.current.onComplete?.(result);
        } catch (err) {
            if (!signal.aborted) {
                const e = err instanceof Error ? err : new Error(String(err));
                setError(e);
                callbacks.current.onError?.(e);
            }
        } finally {
            if (!signal.aborted) {
                setIsLoading(false);
            }
        }
        return terminal;
    }, [api, options.operationId]);

    useEffect(() => {
        const loop = new PollLoop(fetch, options.pollIntervalMs ?? 2000);
        loopRef.current = loop;
        setData(null);
        setIsLoading(false);
        if (options.enabled !== false) void loop.start();
        return () => { loop.stop(); loopRef.current = null; };
    }, [fetch, options.enabled, options.pollIntervalMs]);

    const refetch = useCallback(async () => { await loopRef.current?.refresh(); }, []);
    return { data, isLoading, error, refetch };
}
