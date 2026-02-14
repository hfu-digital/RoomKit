import React from "react";
import type { BulkOperation, BulkOperationStatus } from "../types";

export interface BulkImportProgressProps {
    className?: string;
    operation: BulkOperation;
    onDismiss?: () => void;
}

const containerStyle: React.CSSProperties = {
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "1rem",
    backgroundColor: "#fafafa",
};

const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.75rem",
};

const titleStyle: React.CSSProperties = {
    fontSize: "0.9375rem",
    fontWeight: 600,
    margin: 0,
};

const dismissButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    fontSize: "1.125rem",
    cursor: "pointer",
    color: "#666",
    padding: "0.125rem 0.375rem",
    lineHeight: 1,
};

const progressBarOuterStyle: React.CSSProperties = {
    width: "100%",
    height: "0.5rem",
    backgroundColor: "#e0e0e0",
    borderRadius: "9999px",
    overflow: "hidden",
    marginBottom: "0.75rem",
};

const statsRowStyle: React.CSSProperties = {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    fontSize: "0.8125rem",
};

const statStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
};

const statLabelStyle: React.CSSProperties = {
    color: "#666",
    fontSize: "0.6875rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: 600,
};

const statValueStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: "0.875rem",
};

const STATUS_DISPLAY: Record<BulkOperationStatus, { label: string; color: string }> = {
    pending: { label: "Pending", color: "#ffc107" },
    processing: { label: "Processing", color: "#007bff" },
    completed: { label: "Completed", color: "#28a745" },
    failed: { label: "Failed", color: "#dc3545" },
};

function getProgressBarColor(status: BulkOperationStatus): string {
    return STATUS_DISPLAY[status]?.color ?? "#007bff";
}

export function BulkImportProgress({
    className,
    operation,
    onDismiss,
}: BulkImportProgressProps) {
    const percent = operation.totalItems > 0
        ? Math.round((operation.processedItems / operation.totalItems) * 100)
        : 0;

    const statusInfo = STATUS_DISPLAY[operation.status];

    return (
        <div
            className={className}
            style={containerStyle}
            role="status"
            aria-label={`Bulk operation: ${statusInfo?.label ?? operation.status}`}
        >
            <header style={headerStyle}>
                <div>
                    <h4 style={titleStyle}>
                        Bulk {operation.type.replace(/_/g, " ")}
                    </h4>
                    <span
                        style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: statusInfo?.color ?? "#333",
                        }}
                    >
                        {statusInfo?.label ?? operation.status}
                    </span>
                </div>
                {onDismiss && (
                    <button
                        style={dismissButtonStyle}
                        onClick={onDismiss}
                        aria-label="Dismiss"
                        type="button"
                    >
                        &times;
                    </button>
                )}
            </header>

            {/* Progress bar */}
            <div style={progressBarOuterStyle}>
                <div
                    style={{
                        width: `${percent}%`,
                        height: "100%",
                        backgroundColor: getProgressBarColor(operation.status),
                        borderRadius: "9999px",
                        transition: "width 0.3s ease",
                    }}
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${percent}% complete`}
                />
            </div>

            {/* Stats */}
            <div style={statsRowStyle}>
                <div style={statStyle}>
                    <span style={statLabelStyle}>Progress</span>
                    <span style={statValueStyle}>
                        {operation.processedItems} / {operation.totalItems} ({percent}%)
                    </span>
                </div>
                <div style={statStyle}>
                    <span style={statLabelStyle}>Conflicts</span>
                    <span
                        style={{
                            ...statValueStyle,
                            color: operation.conflictsDetected > 0 ? "#dc3545" : "#28a745",
                        }}
                    >
                        {operation.conflictsDetected}
                    </span>
                </div>
                {operation.resultSummary && (
                    <div style={{ ...statStyle, flex: 1 }}>
                        <span style={statLabelStyle}>Summary</span>
                        <span style={{ fontSize: "0.8125rem" }}>{operation.resultSummary}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
