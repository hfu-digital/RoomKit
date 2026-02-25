"use client";

import { useState, useMemo } from "react";
import { useAvailability, useBookings } from "@hfu.digital/roomkit-react";
import type { AvailabilityResultItem } from "@hfu.digital/roomkit-react";

/** Helper: round a Date to the nearest hour. */
function roundToHour(date: Date): Date {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    return d;
}

/** Format an ISO date string to a readable time like "14:00". */
function fmtTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function HomePage() {
    /* ------------------------------------------------------------------ */
    /*  Search filter state                                                */
    /* ------------------------------------------------------------------ */
    const now = roundToHour(new Date());
    const defaultEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const [startsAt, setStartsAt] = useState<string>(
        now.toISOString().slice(0, 16),
    );
    const [endsAt, setEndsAt] = useState<string>(
        defaultEnd.toISOString().slice(0, 16),
    );
    const [minCapacity, setMinCapacity] = useState<number>(0);
    const [selectedRoom, setSelectedRoom] =
        useState<AvailabilityResultItem | null>(null);

    /* ------------------------------------------------------------------ */
    /*  Availability query                                                 */
    /* ------------------------------------------------------------------ */
    const filters = useMemo(
        () => ({
            timeRange: {
                startsAt: new Date(startsAt),
                endsAt: new Date(endsAt),
            },
            minCapacity: minCapacity > 0 ? minCapacity : undefined,
        }),
        [startsAt, endsAt, minCapacity],
    );

    const {
        data: availability,
        isLoading,
        error,
    } = useAvailability({ filters, debounceMs: 500 });

    /* ------------------------------------------------------------------ */
    /*  Bookings for the selected room (timeline)                          */
    /* ------------------------------------------------------------------ */
    const {
        data: roomBookings,
        isLoading: bookingsLoading,
    } = useBookings({
        filters: selectedRoom
            ? {
                  roomId: selectedRoom.room.id,
                  startsAt: new Date(startsAt),
                  endsAt: new Date(endsAt),
              }
            : undefined,
        enabled: !!selectedRoom,
    });

    /* ------------------------------------------------------------------ */
    /*  Render                                                             */
    /* ------------------------------------------------------------------ */
    return (
        <div>
            <h2 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: 600 }}>
                Availability Search
            </h2>

            {/* -- Filter form ----------------------------------------- */}
            <div
                style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginBottom: "24px",
                    padding: "16px",
                    background: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                }}
            >
                <label style={labelStyle}>
                    From
                    <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                        style={inputStyle}
                    />
                </label>

                <label style={labelStyle}>
                    To
                    <input
                        type="datetime-local"
                        value={endsAt}
                        onChange={(e) => setEndsAt(e.target.value)}
                        style={inputStyle}
                    />
                </label>

                <label style={labelStyle}>
                    Min. seats
                    <input
                        type="number"
                        min={0}
                        value={minCapacity}
                        onChange={(e) =>
                            setMinCapacity(Number(e.target.value))
                        }
                        style={{ ...inputStyle, width: "100px" }}
                    />
                </label>
            </div>

            {/* -- Status / errors ------------------------------------- */}
            {isLoading && <p style={{ color: "#6b7280" }}>Searching...</p>}
            {error && (
                <p style={{ color: "#dc2626" }}>
                    Error: {error.message}
                </p>
            )}

            {/* -- Results grid ---------------------------------------- */}
            {availability && (
                <p style={{ marginBottom: "12px", color: "#6b7280", fontSize: "14px" }}>
                    {availability.totalMatching} room(s) found
                </p>
            )}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: "16px",
                }}
            >
                {availability?.items.map((item) => (
                    <RoomCard
                        key={item.room.id}
                        item={item}
                        isSelected={selectedRoom?.room.id === item.room.id}
                        onSelect={() =>
                            setSelectedRoom(
                                selectedRoom?.room.id === item.room.id
                                    ? null
                                    : item,
                            )
                        }
                    />
                ))}
            </div>

            {/* -- Timeline panel for selected room -------------------- */}
            {selectedRoom && (
                <div
                    style={{
                        marginTop: "24px",
                        padding: "16px",
                        background: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px",
                        }}
                    >
                        <h3 style={{ fontSize: "16px", fontWeight: 600 }}>
                            Bookings for room{" "}
                            {selectedRoom.room.id.slice(0, 8)}...
                        </h3>
                        <button
                            onClick={() => setSelectedRoom(null)}
                            style={closeBtnStyle}
                        >
                            Close
                        </button>
                    </div>

                    {bookingsLoading && (
                        <p style={{ color: "#6b7280" }}>
                            Loading timeline...
                        </p>
                    )}

                    {roomBookings && roomBookings.items.length === 0 && (
                        <p style={{ color: "#6b7280" }}>
                            No bookings in this time range.
                        </p>
                    )}

                    {roomBookings && roomBookings.items.length > 0 && (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    {["Title", "Status", "From", "To"].map(
                                        (h) => (
                                            <th key={h} style={thStyle}>
                                                {h}
                                            </th>
                                        ),
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {roomBookings.items.map((b) => (
                                    <tr key={b.id}>
                                        <td style={tdStyle}>{b.title}</td>
                                        <td style={tdStyle}>
                                            <StatusBadge status={b.status} />
                                        </td>
                                        <td style={tdStyle}>
                                            {fmtTime(b.startsAt)}
                                        </td>
                                        <td style={tdStyle}>
                                            {fmtTime(b.endsAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <div style={{ marginTop: "12px" }}>
                        <a
                            href={`/book?roomId=${selectedRoom.room.id}`}
                            style={bookBtnStyle}
                        >
                            Book this room
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ====================================================================== */
/*  Sub-components                                                         */
/* ====================================================================== */

function RoomCard({
    item,
    isSelected,
    onSelect,
}: {
    item: AvailabilityResultItem;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const { room, score } = item;
    return (
        <button
            onClick={onSelect}
            style={{
                textAlign: "left",
                padding: "16px",
                background: isSelected ? "#eff6ff" : "#fff",
                border: isSelected
                    ? "2px solid #2563eb"
                    : "1px solid #e5e7eb",
                borderRadius: "8px",
                transition: "border-color 0.15s, background 0.15s",
            }}
        >
            <div
                style={{
                    fontWeight: 600,
                    fontSize: "14px",
                    marginBottom: "8px",
                }}
            >
                Room {room.id.slice(0, 8)}...
            </div>

            <div style={{ fontSize: "13px", color: "#6b7280" }}>
                <div>Seats: {room.seatedCapacity}</div>
                <div>Exam seats: {room.examCapacity}</div>
                {room.setupBufferMinutes > 0 && (
                    <div>Setup buffer: {room.setupBufferMinutes} min</div>
                )}
            </div>

            {item.room.equipment.length > 0 && (
                <div
                    style={{
                        marginTop: "8px",
                        display: "flex",
                        gap: "4px",
                        flexWrap: "wrap",
                    }}
                >
                    {item.room.equipment.map((eq) => (
                        <span key={eq.id} style={tagStyle}>
                            {eq.tag}
                        </span>
                    ))}
                </div>
            )}

            <div
                style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    color: "#9ca3af",
                }}
            >
                Score: {score.toFixed(2)}
            </div>
        </button>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, { bg: string; fg: string }> = {
        confirmed: { bg: "#dcfce7", fg: "#166534" },
        requested: { bg: "#fef9c3", fg: "#854d0e" },
        in_progress: { bg: "#dbeafe", fg: "#1e40af" },
        completed: { bg: "#f3f4f6", fg: "#374151" },
        cancelled: { bg: "#fee2e2", fg: "#991b1b" },
    };
    const c = colors[status] ?? { bg: "#f3f4f6", fg: "#374151" };
    return (
        <span
            style={{
                padding: "2px 8px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 500,
                background: c.bg,
                color: c.fg,
            }}
        >
            {status}
        </span>
    );
}

/* ====================================================================== */
/*  Inline styles                                                          */
/* ====================================================================== */

const labelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#374151",
};

const inputStyle: React.CSSProperties = {
    padding: "6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
};

const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#6b7280",
    borderBottom: "1px solid #e5e7eb",
};

const tdStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: "14px",
    borderBottom: "1px solid #f3f4f6",
};

const tagStyle: React.CSSProperties = {
    padding: "1px 6px",
    borderRadius: "4px",
    fontSize: "11px",
    background: "#f3f4f6",
    color: "#374151",
};

const closeBtnStyle: React.CSSProperties = {
    padding: "4px 12px",
    fontSize: "13px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    background: "#fff",
};

const bookBtnStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#fff",
    background: "#2563eb",
    borderRadius: "6px",
    textDecoration: "none",
};
