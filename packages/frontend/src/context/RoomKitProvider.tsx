import React, { createContext, useContext, useMemo } from "react";

export interface RoomKitConfig {
    apiUrl: string;
    fetchOptions?: RequestInit;
}

const RoomKitContext = createContext<RoomKitConfig | null>(null);

export function useRoomKitConfig(): RoomKitConfig {
    const config = useContext(RoomKitContext);
    if (!config) {
        throw new Error("useRoomKitConfig must be used within a RoomKitProvider");
    }
    return config;
}

export interface RoomKitProviderProps {
    config: RoomKitConfig;
    children: React.ReactNode;
}

export function RoomKitProvider({ config, children }: RoomKitProviderProps) {
    const value = useMemo(() => config, [config.apiUrl]);
    return <RoomKitContext.Provider value={value}>{children}</RoomKitContext.Provider>;
}
