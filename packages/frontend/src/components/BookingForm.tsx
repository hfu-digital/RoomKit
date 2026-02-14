import React, { useState, useCallback } from "react";
import type { RecurrenceFrequency } from "../types";

export interface BookingFormValues {
    roomId: string;
    title: string;
    description: string;
    startsAt: string;
    endsAt: string;
    purposeType: string;
    onBehalfOfId: string;
    priority: number;
    recurrenceEnabled: boolean;
    recurrenceFrequency: RecurrenceFrequency | "";
    recurrenceDaysOfWeek: number[];
    recurrenceSeriesEndsAt: string;
}

export interface BookingFormProps {
    className?: string;
    initialValues?: Partial<BookingFormValues>;
    roomOptions?: { id: string; label: string }[];
    purposeTypeOptions?: string[];
    isEditing?: boolean;
    isSubmitting?: boolean;
    onSubmit?: (values: BookingFormValues) => void;
    onCancel?: () => void;
}

const defaultValues: BookingFormValues = {
    roomId: "",
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    purposeType: "",
    onBehalfOfId: "",
    priority: 0,
    recurrenceEnabled: false,
    recurrenceFrequency: "",
    recurrenceDaysOfWeek: [],
    recurrenceSeriesEndsAt: "",
};

const formStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
};

const fieldStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
};

const labelStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
    padding: "0.5rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "0.875rem",
};

const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "4rem",
    resize: "vertical",
};

const rowStyle: React.CSSProperties = {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
};

const buttonStyle: React.CSSProperties = {
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
};

const submitButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#1a73e8",
    color: "#fff",
};

const cancelButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#f0f0f0",
    color: "#333",
};

const checkboxLabelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    fontSize: "0.875rem",
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function BookingForm({
    className,
    initialValues,
    roomOptions = [],
    purposeTypeOptions = [],
    isEditing = false,
    isSubmitting = false,
    onSubmit,
    onCancel,
}: BookingFormProps) {
    const [values, setValues] = useState<BookingFormValues>({
        ...defaultValues,
        ...initialValues,
    });

    const updateField = useCallback(<K extends keyof BookingFormValues>(
        field: K,
        value: BookingFormValues[K],
    ) => {
        setValues((prev) => ({ ...prev, [field]: value }));
    }, []);

    const toggleDay = useCallback((day: number) => {
        setValues((prev) => {
            const days = prev.recurrenceDaysOfWeek;
            return {
                ...prev,
                recurrenceDaysOfWeek: days.includes(day)
                    ? days.filter((d) => d !== day)
                    : [...days, day].sort(),
            };
        });
    }, []);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        onSubmit?.(values);
    }, [onSubmit, values]);

    return (
        <form
            className={className}
            style={formStyle}
            onSubmit={handleSubmit}
            aria-label={isEditing ? "Edit booking" : "Create booking"}
        >
            {roomOptions.length > 0 && (
                <div style={fieldStyle}>
                    <label htmlFor="rk-bf-room" style={labelStyle}>Room</label>
                    <select
                        id="rk-bf-room"
                        value={values.roomId}
                        onChange={(e) => updateField("roomId", e.target.value)}
                        style={inputStyle}
                        required
                    >
                        <option value="">Select a room</option>
                        {roomOptions.map((r) => (
                            <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                    </select>
                </div>
            )}

            {roomOptions.length === 0 && (
                <div style={fieldStyle}>
                    <label htmlFor="rk-bf-room-id" style={labelStyle}>Room ID</label>
                    <input
                        id="rk-bf-room-id"
                        type="text"
                        value={values.roomId}
                        onChange={(e) => updateField("roomId", e.target.value)}
                        style={inputStyle}
                        required
                        placeholder="Enter room ID"
                    />
                </div>
            )}

            <div style={fieldStyle}>
                <label htmlFor="rk-bf-title" style={labelStyle}>Title</label>
                <input
                    id="rk-bf-title"
                    type="text"
                    value={values.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    style={inputStyle}
                    required
                    placeholder="Booking title"
                />
            </div>

            <div style={fieldStyle}>
                <label htmlFor="rk-bf-desc" style={labelStyle}>Description</label>
                <textarea
                    id="rk-bf-desc"
                    value={values.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    style={textareaStyle}
                    placeholder="Optional description"
                />
            </div>

            <div style={rowStyle}>
                <div style={{ ...fieldStyle, flex: 1 }}>
                    <label htmlFor="rk-bf-starts" style={labelStyle}>Starts At</label>
                    <input
                        id="rk-bf-starts"
                        type="datetime-local"
                        value={values.startsAt}
                        onChange={(e) => updateField("startsAt", e.target.value)}
                        style={inputStyle}
                        required
                    />
                </div>
                <div style={{ ...fieldStyle, flex: 1 }}>
                    <label htmlFor="rk-bf-ends" style={labelStyle}>Ends At</label>
                    <input
                        id="rk-bf-ends"
                        type="datetime-local"
                        value={values.endsAt}
                        onChange={(e) => updateField("endsAt", e.target.value)}
                        style={inputStyle}
                        required
                    />
                </div>
            </div>

            <div style={rowStyle}>
                <div style={{ ...fieldStyle, flex: 1 }}>
                    <label htmlFor="rk-bf-purpose" style={labelStyle}>Purpose Type</label>
                    {purposeTypeOptions.length > 0 ? (
                        <select
                            id="rk-bf-purpose"
                            value={values.purposeType}
                            onChange={(e) => updateField("purposeType", e.target.value)}
                            style={inputStyle}
                            required
                        >
                            <option value="">Select purpose</option>
                            {purposeTypeOptions.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            id="rk-bf-purpose"
                            type="text"
                            value={values.purposeType}
                            onChange={(e) => updateField("purposeType", e.target.value)}
                            style={inputStyle}
                            required
                            placeholder="e.g. lecture, seminar"
                        />
                    )}
                </div>
                <div style={{ ...fieldStyle, flex: 1 }}>
                    <label htmlFor="rk-bf-priority" style={labelStyle}>Priority (0-100)</label>
                    <input
                        id="rk-bf-priority"
                        type="number"
                        min="0"
                        max="100"
                        value={values.priority}
                        onChange={(e) => updateField("priority", Number(e.target.value))}
                        style={inputStyle}
                    />
                </div>
            </div>

            <div style={fieldStyle}>
                <label htmlFor="rk-bf-behalf" style={labelStyle}>On Behalf Of (optional)</label>
                <input
                    id="rk-bf-behalf"
                    type="text"
                    value={values.onBehalfOfId}
                    onChange={(e) => updateField("onBehalfOfId", e.target.value)}
                    style={inputStyle}
                    placeholder="User ID"
                />
            </div>

            {/* Recurrence toggle */}
            <fieldset style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "0.75rem" }}>
                <legend style={labelStyle}>Recurrence</legend>
                <label style={checkboxLabelStyle}>
                    <input
                        type="checkbox"
                        checked={values.recurrenceEnabled}
                        onChange={(e) => updateField("recurrenceEnabled", e.target.checked)}
                    />
                    Enable recurring booking
                </label>

                {values.recurrenceEnabled && (
                    <div style={{ ...formStyle, marginTop: "0.5rem" }}>
                        <div style={fieldStyle}>
                            <label htmlFor="rk-bf-rec-freq" style={labelStyle}>Frequency</label>
                            <select
                                id="rk-bf-rec-freq"
                                value={values.recurrenceFrequency}
                                onChange={(e) => updateField("recurrenceFrequency", e.target.value as RecurrenceFrequency | "")}
                                style={inputStyle}
                            >
                                <option value="">Select frequency</option>
                                <option value="weekly">Weekly</option>
                                <option value="biweekly">Biweekly</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>

                        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                            <legend style={{ ...labelStyle, marginBottom: "0.25rem" }}>Days of Week</legend>
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                {DAY_NAMES.map((name, index) => (
                                    <label key={name} style={checkboxLabelStyle}>
                                        <input
                                            type="checkbox"
                                            checked={values.recurrenceDaysOfWeek.includes(index + 1)}
                                            onChange={() => toggleDay(index + 1)}
                                        />
                                        {name}
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <div style={fieldStyle}>
                            <label htmlFor="rk-bf-rec-end" style={labelStyle}>Series Ends At</label>
                            <input
                                id="rk-bf-rec-end"
                                type="date"
                                value={values.recurrenceSeriesEndsAt}
                                onChange={(e) => updateField("recurrenceSeriesEndsAt", e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                )}
            </fieldset>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                {onCancel && (
                    <button
                        type="button"
                        style={cancelButtonStyle}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    style={{
                        ...submitButtonStyle,
                        opacity: isSubmitting ? 0.7 : 1,
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                    }}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Saving..." : isEditing ? "Update Booking" : "Create Booking"}
                </button>
            </div>
        </form>
    );
}
