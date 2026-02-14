import React from "react";
import type { AlternativeSuggestion, Booking, ConflictCheckResult } from "../types";

export interface ConflictBannerProps {
    className?: string;
    conflicts: ConflictCheckResult;
    alternatives?: AlternativeSuggestion[];
    onAlternativeSelect?: (suggestion: AlternativeSuggestion) => void;
    onDismiss?: () => void;
}

const bannerStyle: React.CSSProperties = {
    border: "1px solid #f5c6cb",
    borderRadius: "8px",
    backgroundColor: "#fff3f3",
    padding: "1rem",
};

const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem",
};

const titleStyle: React.CSSProperties = {
    fontSize: "0.9375rem",
    fontWeight: 600,
    color: "#721c24",
    margin: 0,
};

const dismissButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    fontSize: "1.125rem",
    cursor: "pointer",
    color: "#721c24",
    padding: "0.125rem 0.375rem",
    lineHeight: 1,
};

const conflictListStyle: React.CSSProperties = {
    listStyle: "none",
    padding: 0,
    margin: "0.5rem 0",
    fontSize: "0.8125rem",
};

const conflictItemStyle: React.CSSProperties = {
    padding: "0.375rem 0",
    borderBottom: "1px solid #f5c6cb",
    color: "#856404",
};

const alternativesSectionStyle: React.CSSProperties = {
    marginTop: "0.75rem",
    paddingTop: "0.75rem",
    borderTop: "1px solid #f5c6cb",
};

const alternativeTitleStyle: React.CSSProperties = {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "#155724",
    margin: "0 0 0.375rem 0",
};

const alternativeButtonStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "0.5rem",
    marginBottom: "0.25rem",
    border: "1px solid #c3e6cb",
    borderRadius: "4px",
    backgroundColor: "#f0fff4",
    cursor: "pointer",
    fontSize: "0.8125rem",
    color: "#155724",
};

function formatBookingConflict(booking: Booking): string {
    const start = new Date(booking.startsAt).toLocaleString();
    const end = new Date(booking.endsAt).toLocaleTimeString();
    return `"${booking.title}" (${start} - ${end})`;
}

function formatAlternative(suggestion: AlternativeSuggestion): string {
    const start = new Date(suggestion.startsAt).toLocaleString();
    const end = new Date(suggestion.endsAt).toLocaleTimeString();
    if (suggestion.type === "same_room_different_time") {
        return `Same room, different time: ${start} - ${end}`;
    }
    return `Different room${suggestion.room ? ` (${suggestion.room.id})` : ""}: ${start} - ${end}`;
}

export function ConflictBanner({
    className,
    conflicts,
    alternatives = [],
    onAlternativeSelect,
    onDismiss,
}: ConflictBannerProps) {
    if (!conflicts.hasConflict) return null;

    const totalConflicts = conflicts.directConflicts.length + conflicts.partitionConflicts.length;

    return (
        <aside
            className={className}
            style={bannerStyle}
            role="alert"
            aria-label="Booking conflict detected"
        >
            <header style={headerStyle}>
                <h4 style={titleStyle}>
                    {totalConflicts} Conflict{totalConflicts !== 1 ? "s" : ""} Detected
                </h4>
                {onDismiss && (
                    <button
                        style={dismissButtonStyle}
                        onClick={onDismiss}
                        aria-label="Dismiss conflict alert"
                        type="button"
                    >
                        &times;
                    </button>
                )}
            </header>

            {conflicts.directConflicts.length > 0 && (
                <div>
                    <strong style={{ fontSize: "0.8125rem" }}>Direct conflicts:</strong>
                    <ul style={conflictListStyle}>
                        {conflicts.directConflicts.map((booking) => (
                            <li key={booking.id} style={conflictItemStyle}>
                                {formatBookingConflict(booking)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {conflicts.partitionConflicts.length > 0 && (
                <div>
                    <strong style={{ fontSize: "0.8125rem" }}>Partition conflicts:</strong>
                    <ul style={conflictListStyle}>
                        {conflicts.partitionConflicts.map((pc) => (
                            <li key={pc.booking.id} style={conflictItemStyle}>
                                Room {pc.roomId}: {formatBookingConflict(pc.booking)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {alternatives.length > 0 && (
                <div style={alternativesSectionStyle}>
                    <h5 style={alternativeTitleStyle}>Available Alternatives</h5>
                    {alternatives.map((suggestion, index) => (
                        <button
                            key={index}
                            style={alternativeButtonStyle}
                            onClick={() => onAlternativeSelect?.(suggestion)}
                            type="button"
                        >
                            {formatAlternative(suggestion)}
                            <span style={{ float: "right", fontSize: "0.75rem", color: "#999" }}>
                                Score: {suggestion.score.toFixed(2)}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </aside>
    );
}
