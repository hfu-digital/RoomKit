import React, { useMemo } from "react";
import type { ExamSession, Booking } from "../types";

export interface ExamScheduleEntry {
    exam: ExamSession;
    booking?: Booking;
    roomLabel?: string;
}

export interface ExamScheduleViewProps {
    className?: string;
    entries: ExamScheduleEntry[];
    onExamClick?: (entry: ExamScheduleEntry) => void;
}

const containerStyle: React.CSSProperties = {
    fontSize: "0.875rem",
};

const cohortHeaderStyle: React.CSSProperties = {
    fontSize: "1rem",
    fontWeight: 600,
    margin: "1rem 0 0.5rem 0",
    padding: "0.375rem 0",
    borderBottom: "2px solid #e0e0e0",
};

const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "1rem",
};

const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "0.5rem",
    borderBottom: "1px solid #e0e0e0",
    fontWeight: 600,
    fontSize: "0.8125rem",
    color: "#666",
    backgroundColor: "#f8f9fa",
};

const tdStyle: React.CSSProperties = {
    padding: "0.5rem",
    borderBottom: "1px solid #f0f0f0",
    verticalAlign: "top",
};

const clickableTdStyle: React.CSSProperties = {
    ...tdStyle,
    cursor: "pointer",
};

const layoutBadgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.0625rem 0.375rem",
    borderRadius: "4px",
    fontSize: "0.6875rem",
    fontWeight: 600,
};

function getLayoutBadge(layoutType: string): React.CSSProperties {
    if (layoutType === "every-other-seat") {
        return { ...layoutBadgeStyle, backgroundColor: "#fff3cd", color: "#856404" };
    }
    return { ...layoutBadgeStyle, backgroundColor: "#d4edda", color: "#155724" };
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function ExamScheduleView({
    className,
    entries,
    onExamClick,
}: ExamScheduleViewProps) {
    const groupedByCohort = useMemo(() => {
        const groups = new Map<string, ExamScheduleEntry[]>();
        for (const entry of entries) {
            const cohort = entry.exam.cohortId;
            const group = groups.get(cohort) || [];
            group.push(entry);
            groups.set(cohort, group);
        }
        // Sort entries within each group by booking start time
        for (const [, group] of groups) {
            group.sort((a, b) => {
                const aTime = a.booking ? new Date(a.booking.startsAt).getTime() : 0;
                const bTime = b.booking ? new Date(b.booking.startsAt).getTime() : 0;
                return aTime - bTime;
            });
        }
        return groups;
    }, [entries]);

    if (entries.length === 0) {
        return (
            <div className={className} style={containerStyle}>
                <p style={{ color: "#666", fontStyle: "italic" }}>No exam sessions scheduled.</p>
            </div>
        );
    }

    return (
        <div className={className} style={containerStyle} role="region" aria-label="Exam schedule">
            {Array.from(groupedByCohort.entries()).map(([cohortId, cohortEntries]) => (
                <section key={cohortId}>
                    <h3 style={cohortHeaderStyle}>Cohort: {cohortId}</h3>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Time</th>
                                <th style={thStyle}>Room</th>
                                <th style={thStyle}>Title</th>
                                <th style={thStyle}>Layout</th>
                                <th style={thStyle}>Capacity</th>
                                <th style={thStyle}>Supervisors</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cohortEntries.map((entry) => {
                                const td = onExamClick ? clickableTdStyle : tdStyle;
                                return (
                                    <tr
                                        key={entry.exam.id}
                                        onClick={() => onExamClick?.(entry)}
                                        style={onExamClick ? { cursor: "pointer" } : undefined}
                                    >
                                        <td style={td}>
                                            {entry.booking ? formatDate(entry.booking.startsAt) : "-"}
                                        </td>
                                        <td style={td}>
                                            {entry.booking
                                                ? `${formatTime(entry.booking.startsAt)} - ${formatTime(entry.booking.endsAt)}`
                                                : "-"
                                            }
                                        </td>
                                        <td style={td}>
                                            {entry.roomLabel || (entry.booking ? entry.booking.roomId : "-")}
                                        </td>
                                        <td style={td}>
                                            {entry.booking ? entry.booking.title : "-"}
                                        </td>
                                        <td style={td}>
                                            <span style={getLayoutBadge(entry.exam.layoutType)}>
                                                {entry.exam.layoutType === "every-other-seat" ? "Spaced" : "Full"}
                                            </span>
                                        </td>
                                        <td style={td}>{entry.exam.requiredCapacity}</td>
                                        <td style={td}>{entry.exam.supervisorIds.length}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
            ))}
        </div>
    );
}
