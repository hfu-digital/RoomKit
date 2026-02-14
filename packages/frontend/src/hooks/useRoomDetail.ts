import { useState, useEffect, useCallback, useRef } from "react";
import { useApiClient } from "../lib/api-client";
import type { Room, RoomEquipment, RoomAccessibility } from "../types";

export interface RoomDetail extends Room {
    equipment: RoomEquipment[];
    accessibility: RoomAccessibility[];
}

export interface UseRoomDetailOptions {
    roomId: string;
    enabled?: boolean;
    onSuccess?: (data: RoomDetail) => void;
    onError?: (error: Error) => void;
}

export function useRoomDetail(options: UseRoomDetailOptions) {
    const api = useApiClient();
    const [data, setData] = useState<RoomDetail | null>(null);
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
            const result = await api.get<RoomDetail>(`/rooms/${options.roomId}`);
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
    }, [api, options.roomId, options.enabled]);

    useEffect(() => {
        fetch();
        return () => {
            abortRef.current?.abort();
        };
    }, [fetch]);

    return { data, isLoading, error, refetch: fetch };
}
