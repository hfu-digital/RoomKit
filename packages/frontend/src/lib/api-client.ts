import { useRoomKitConfig } from "../context/RoomKitProvider";

export class ApiClient {
    constructor(
        private baseUrl: string,
        private fetchOptions?: RequestInit,
    ) {}

    private async request<T>(method: string, path: string, body?: unknown, params?: Record<string, string>): Promise<T> {
        const url = new URL(path, this.baseUrl);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.set(key, value);
                }
            });
        }

        const response = await fetch(url.toString(), {
            method,
            headers: {
                "Content-Type": "application/json",
                ...this.fetchOptions?.headers,
            },
            body: body ? JSON.stringify(body) : undefined,
            ...this.fetchOptions,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error((error as any).message || `Request failed: ${response.status}`);
        }

        return response.json() as Promise<T>;
    }

    get<T>(path: string, params?: Record<string, string>): Promise<T> {
        return this.request<T>("GET", path, undefined, params);
    }

    post<T>(path: string, body?: unknown): Promise<T> {
        return this.request<T>("POST", path, body);
    }

    put<T>(path: string, body?: unknown): Promise<T> {
        return this.request<T>("PUT", path, body);
    }

    delete<T>(path: string): Promise<T> {
        return this.request<T>("DELETE", path);
    }
}

export function useApiClient(): ApiClient {
    const config = useRoomKitConfig();
    return new ApiClient(config.apiUrl, config.fetchOptions);
}
