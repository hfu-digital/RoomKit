import { useState, useEffect, useCallback, useRef } from "react";
import { useApiClient } from "../lib/api-client";
import type { LocationNode } from "../types";

export interface LocationTreeNode extends LocationNode {
    children: LocationTreeNode[];
}

export interface UseLocationTreeOptions {
    scope?: string;
    enabled?: boolean;
    onSuccess?: (data: LocationTreeNode[]) => void;
    onError?: (error: Error) => void;
}

export function useLocationTree(options: UseLocationTreeOptions = {}) {
    const api = useApiClient();
    const [data, setData] = useState<LocationTreeNode[] | null>(null);
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
            if (options.scope) params.scope = options.scope;

            const result = await api.get<LocationTreeNode[]>("/locations/tree", params);
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
    }, [api, options.scope, options.enabled]);

    useEffect(() => {
        fetch();
        return () => {
            abortRef.current?.abort();
        };
    }, [fetch]);

    return { data, isLoading, error, refetch: fetch };
}
