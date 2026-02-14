import React, { useMemo } from "react";
import type { Booking, BookingStatus } from "../types";

export interface BookingTimelineProps {
    className?: string;
    bookings: Booking[];
    viewMode?: "day" | "week";
    startDate: Date;
    hourStart?: number;
    hourEnd?: number;
    onBookingClick?: (booking: Booking) => void;
    onSlotClick?: (date: Date, hour: number) => void;
}

const STATUS_COLORS: Record<BookingStatus, string> = {
    requested: "#fff3cd",
    confirmed: "#d4edda",
    in_progress: "#cce5ff",
    completed: "#e2e3e5",
    cancelled: "#f8d7da",
};

const STATUS_BORDER_COLORS: Record<BookingStatus, string> = {
    requested: "#ffc107",
    confirmed: "#28a745",
    in_progress: "#007bff",
    completed: "#6c757d",
    cancelled: "#dc3545",
};

const containerStyle: React.CSSProperties = {
    display: "grid",
    position: "relative",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    overflow: "hidden",
    fontSize: "0.8125rem",
};

const headerCellStyle: React.CSSProperties = {
    padding: "0.5rem",
    textAlign: "center",
    fontWeight: 600,
    borderBottom: "1px solid #e0e0e0",
    backgroundColor: "#f8f9fa",
};

const hourLabelStyle: React.CSSProperties = {
    padding: "0.25rem 0.5rem",
    textAlign: "right",
    fontSize: "0.75rem",
    color: "#666",
    borderRight: "1px solid #e0e0e0",
    minWidth: "3.5rem",
};

const cellStyle: React.CSSProperties = {
    position: "relative",
    borderBottom: "1px solid #f0f0f0",
    borderRight: "1px solid #f0f0f0",
    minHeight: "2.5rem",
    cursor: "pointer",
};

const bookingBlockStyle: React.CSSProperties = {
    position: "absolute",
    left: "2px",
    right: "2px",
    borderRadius: "4px",
    padding: "0.125rem 0.375rem",
    fontSize: "0.6875rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    cursor: "pointer",
    borderLeft: "3px solid",
    zIndex: 1,
};

function formatHour(hour: number): string {
    const h = hour % 24;
    const period = h >= 12 ? "PM" : "AM";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display} ${period}`;
}

function getDayLabel(date: Date): string {
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function getWeekDays(startDate: Date): Date[] {
    const days: Date[] = [];
    const start = new Date(startDate);
    const dayOfWeek = start.getDay();
    const monday = new Date(start);
    monday.setDate(start.getDate() - ((dayOfWeek + 6) % 7));

    for (let i = 0; i < 7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        days.push(day);
    }
    return days;
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

export function BookingTimeline({
    className,
    bookings,
    viewMode = "week",
    startDate,
    hourStart = 7,
    hourEnd = 22,
    onBookingClick,
    onSlotClick,
}: BookingTimelineProps) {
    const days = useMemo(() => {
        if (viewMode === "day") return [new Date(startDate)];
        return getWeekDays(startDate);
    }, [viewMode, startDate]);

    const hours = useMemo(() => {
        const result: number[] = [];
        for (let h = hourStart; h < hourEnd; h++) {
            result.push(h);
        }
        return result;
    }, [hourStart, hourEnd]);

    const totalHours = hourEnd - hourStart;

    const bookingsByDay = useMemo(() => {
        const map = new Map<string, Booking[]>();
        for (const day of days) {
            const key = day.toISOString().slice(0, 10);
            map.set(key, []);
        }
        for (const booking of bookings) {
            const bookingStart = new Date(booking.startsAt);
            for (const day of days) {
                if (isSameDay(bookingStart, day)) {
                    const key = day.toISOString().slice(0, 10);
                    map.get(key)?.push(booking);
                }
            }
        }
        return map;
    }, [bookings, days]);

    const colCount = days.length;

    return (
        <div
            className={className}
            style={{
                ...containerStyle,
                gridTemplateColumns: `auto repeat(${colCount}, 1fr)`,
            }}
            role="grid"
            aria-label="Booking timeline"
        >
            {/* Header row */}
            <div style={headerCellStyle} role="columnheader" />
            {days.map((day) => (
                <div key={day.toISOString()} style={headerCellStyle} role="columnheader">
                    {getDayLabel(day)}
                </div>
            ))}

            {/* Time rows */}
            {hours.map((hour) => (
                <React.Fragment key={hour}>
                    <div style={hourLabelStyle}>{formatHour(hour)}</div>
                    {days.map((day) => {
                        const dayKey = day.toISOString().slice(0, 10);
                        const dayBookings = bookingsByDay.get(dayKey) || [];
                        const hourBookings = dayBookings.filter((b) => {
                            const start = new Date(b.startsAt);
                            return start.getHours() === hour;
                        });

                        return (
                            <div
                                key={`${dayKey}-${hour}`}
                                style={cellStyle}
                                role="gridcell"
                                onClick={() => {
                                    const clickDate = new Date(day);
                                    clickDate.setHours(hour, 0, 0, 0);
                                    onSlotClick?.(clickDate, hour);
                                }}
                            >
                                {hourBookings.map((booking) => {
                                    const bStart = new Date(booking.startsAt);
                                    const bEnd = new Date(booking.endsAt);
                                    const startMinFraction = bStart.getMinutes() / 60;
                                    const durationHours = (bEnd.getTime() - bStart.getTime()) / (1000 * 60 * 60);
                                    const cellHeightPercent = Math.min(durationHours, totalHours) * 100;

                                    return (
                                        <div
                                            key={booking.id}
                                            style={{
                                                ...bookingBlockStyle,
                                                top: `${startMinFraction * 100}%`,
                                                height: `${cellHeightPercent}%`,
                                                minHeight: "1.25rem",
                                                backgroundColor: STATUS_COLORS[booking.status],
                                                borderLeftColor: STATUS_BORDER_COLORS[booking.status],
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onBookingClick?.(booking);
                                            }}
                                            title={`${booking.title} (${booking.status})`}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onBookingClick?.(booking);
                                                }
                                            }}
                                        >
                                            {booking.title}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </React.Fragment>
            ))}
        </div>
    );
}
