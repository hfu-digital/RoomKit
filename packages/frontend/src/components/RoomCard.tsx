import React from "react";
import type { Room, RoomEquipment, RoomAccessibility } from "../types";

export interface RoomCardProps {
    className?: string;
    room: Room;
    locationName?: string;
    equipment?: RoomEquipment[];
    accessibility?: RoomAccessibility[];
    onClick?: (room: Room) => void;
}

const cardStyle: React.CSSProperties = {
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "1rem",
    cursor: "pointer",
    transition: "box-shadow 0.2s ease",
};

const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.5rem",
};

const titleStyle: React.CSSProperties = {
    fontSize: "1rem",
    fontWeight: 600,
    margin: 0,
};

const locationStyle: React.CSSProperties = {
    fontSize: "0.8125rem",
    color: "#666",
    margin: "0.125rem 0 0 0",
};

const badgeContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: "0.375rem",
    flexWrap: "wrap",
};

const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.125rem 0.5rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 500,
    backgroundColor: "#f0f0f0",
    color: "#333",
};

const tagContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: "0.25rem",
    flexWrap: "wrap",
    marginTop: "0.5rem",
};

const tagStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.125rem 0.375rem",
    borderRadius: "4px",
    fontSize: "0.6875rem",
    backgroundColor: "#e8f4fd",
    color: "#1a73e8",
};

const accessibilityTagStyle: React.CSSProperties = {
    ...tagStyle,
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
};

export function RoomCard({
    className,
    room,
    locationName,
    equipment = [],
    accessibility = [],
    onClick,
}: RoomCardProps) {
    return (
        <article
            className={className}
            style={cardStyle}
            onClick={() => onClick?.(room)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick?.(room);
                }
            }}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={`Room: ${room.metadata || room.id}`}
        >
            <header style={headerStyle}>
                <div>
                    <h3 style={titleStyle}>{room.id}</h3>
                    {locationName && <p style={locationStyle}>{locationName}</p>}
                </div>
                {!room.isActive && (
                    <span style={{ ...badgeStyle, backgroundColor: "#fee", color: "#c00" }}>
                        Inactive
                    </span>
                )}
            </header>

            <div style={badgeContainerStyle}>
                <span style={badgeStyle} title="Seated capacity">
                    Seated: {room.seatedCapacity}
                </span>
                <span style={badgeStyle} title="Exam capacity">
                    Exam: {room.examCapacity}
                </span>
                <span style={badgeStyle} title="Standing capacity">
                    Standing: {room.standingCapacity}
                </span>
            </div>

            {equipment.length > 0 && (
                <div style={tagContainerStyle}>
                    {equipment.map((eq) => (
                        <span key={eq.id} style={tagStyle}>
                            {eq.tag}
                        </span>
                    ))}
                </div>
            )}

            {accessibility.length > 0 && (
                <div style={tagContainerStyle}>
                    {accessibility.map((acc) => (
                        <span key={acc.id} style={accessibilityTagStyle}>
                            {acc.attribute}
                        </span>
                    ))}
                </div>
            )}
        </article>
    );
}
