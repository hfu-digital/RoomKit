"use client";

import { RoomKitProvider } from "@hfu.digital/roomkit-react";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <RoomKitProvider config={{ apiUrl: "http://localhost:3000" }}>
            {children}
        </RoomKitProvider>
    );
}
