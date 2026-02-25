import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
    title: "RoomKit Demo",
    description: "Minimal Next.js example showcasing @hfu.digital/roomkit-react",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Providers>
                    <header
                        style={{
                            padding: "16px 24px",
                            borderBottom: "1px solid #e5e7eb",
                            background: "#fff",
                        }}
                    >
                        <div
                            style={{
                                maxWidth: "1200px",
                                margin: "0 auto",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <h1 style={{ fontSize: "20px", fontWeight: 600 }}>
                                RoomKit Demo
                            </h1>
                            <nav style={{ display: "flex", gap: "16px" }}>
                                <a href="/">Search</a>
                                <a href="/book">Book</a>
                                <a href="/locations">Locations</a>
                            </nav>
                        </div>
                    </header>
                    <main
                        style={{
                            padding: "24px",
                            maxWidth: "1200px",
                            margin: "0 auto",
                        }}
                    >
                        {children}
                    </main>
                </Providers>
            </body>
        </html>
    );
}
