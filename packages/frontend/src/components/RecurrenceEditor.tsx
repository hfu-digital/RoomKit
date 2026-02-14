import React, { useState, useCallback } from "react";

export type RecurrenceEditMode = "single" | "thisAndFuture" | "all";

export interface RecurrenceEditorProps {
    className?: string;
    defaultMode?: RecurrenceEditMode;
    onConfirm?: (mode: RecurrenceEditMode) => void;
    onCancel?: () => void;
    isSubmitting?: boolean;
}

const containerStyle: React.CSSProperties = {
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "1rem",
    backgroundColor: "#fafafa",
};

const titleStyle: React.CSSProperties = {
    fontSize: "0.9375rem",
    fontWeight: 600,
    margin: "0 0 0.75rem 0",
};

const radioGroupStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    margin: "0 0 1rem 0",
};

const radioLabelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.5rem",
    padding: "0.5rem",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.875rem",
    border: "1px solid transparent",
    transition: "background-color 0.15s ease",
};

const selectedRadioLabelStyle: React.CSSProperties = {
    ...radioLabelStyle,
    backgroundColor: "#e8f4fd",
    border: "1px solid #90caf9",
};

const descriptionStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    color: "#666",
    marginTop: "0.125rem",
};

const buttonRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.5rem",
};

const buttonStyle: React.CSSProperties = {
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
};

const OPTIONS: { value: RecurrenceEditMode; label: string; description: string }[] = [
    {
        value: "single",
        label: "This event only",
        description: "Modify only this single occurrence. Other occurrences remain unchanged.",
    },
    {
        value: "thisAndFuture",
        label: "This and future events",
        description: "Apply changes to this occurrence and all future occurrences in the series.",
    },
    {
        value: "all",
        label: "All events in the series",
        description: "Apply changes to every occurrence in the entire recurring series.",
    },
];

export function RecurrenceEditor({
    className,
    defaultMode = "single",
    onConfirm,
    onCancel,
    isSubmitting = false,
}: RecurrenceEditorProps) {
    const [selected, setSelected] = useState<RecurrenceEditMode>(defaultMode);

    const handleConfirm = useCallback(() => {
        onConfirm?.(selected);
    }, [onConfirm, selected]);

    return (
        <div
            className={className}
            style={containerStyle}
            role="dialog"
            aria-label="Edit recurring event"
        >
            <h4 style={titleStyle}>Edit Recurring Event</h4>

            <div style={radioGroupStyle} role="radiogroup" aria-label="Modification scope">
                {OPTIONS.map((option) => (
                    <label
                        key={option.value}
                        style={selected === option.value ? selectedRadioLabelStyle : radioLabelStyle}
                    >
                        <input
                            type="radio"
                            name="recurrence-edit-mode"
                            value={option.value}
                            checked={selected === option.value}
                            onChange={() => setSelected(option.value)}
                            style={{ marginTop: "0.125rem" }}
                        />
                        <div>
                            <div style={{ fontWeight: selected === option.value ? 600 : 400 }}>
                                {option.label}
                            </div>
                            <div style={descriptionStyle}>{option.description}</div>
                        </div>
                    </label>
                ))}
            </div>

            <div style={buttonRowStyle}>
                {onCancel && (
                    <button
                        type="button"
                        style={{ ...buttonStyle, backgroundColor: "#f0f0f0", color: "#333" }}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="button"
                    style={{
                        ...buttonStyle,
                        backgroundColor: "#1a73e8",
                        color: "#fff",
                        opacity: isSubmitting ? 0.7 : 1,
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                    }}
                    onClick={handleConfirm}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Applying..." : "Apply"}
                </button>
            </div>
        </div>
    );
}
