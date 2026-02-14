import React from "react";
import type { BookingStatus } from "../types";

export interface BookingStatusBadgeProps {
    className?: string;
    status: BookingStatus;
    size?: "sm" | "md" | "lg";
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; bg: string; color: string; border: string }> = {
    requested: {
        label: "Requested",
        bg: "#fff3cd",
        color: "#856404",
        border: "#ffc107",
    },
    confirmed: {
        label: "Confirmed",
        bg: "#d4edda",
        color: "#155724",
        border: "#28a745",
    },
    in_progress: {
        label: "In Progress",
        bg: "#cce5ff",
        color: "#004085",
        border: "#007bff",
    },
    completed: {
        label: "Completed",
        bg: "#e2e3e5",
        color: "#383d41",
        border: "#6c757d",
    },
    cancelled: {
        label: "Cancelled",
        bg: "#f8d7da",
        color: "#721c24",
        border: "#dc3545",
    },
};

const SIZE_STYLES: Record<string, React.CSSProperties> = {
    sm: {
        fontSize: "0.6875rem",
        padding: "0.0625rem 0.375rem",
    },
    md: {
        fontSize: "0.75rem",
        padding: "0.125rem 0.5rem",
    },
    lg: {
        fontSize: "0.875rem",
        padding: "0.25rem 0.625rem",
    },
};

export function BookingStatusBadge({
    className,
    status,
    size = "md",
}: BookingStatusBadgeProps) {
    const config = STATUS_CONFIG[status];
    const sizeStyle = SIZE_STYLES[size];

    if (!config) {
        return (
            <span className={className} style={{ ...sizeStyle, fontStyle: "italic" }}>
                {status}
            </span>
        );
    }

    return (
        <span
            className={className}
            style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "9999px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                backgroundColor: config.bg,
                color: config.color,
                border: `1px solid ${config.border}`,
                ...sizeStyle,
            }}
            role="status"
            aria-label={`Booking status: ${config.label}`}
        >
            {config.label}
        </span>
    );
}
