import React, { useState, useCallback, useEffect, useRef } from "react";
import type { AvailabilityFilter } from "../types";

export interface AvailabilitySearchProps {
    className?: string;
    equipmentOptions?: string[];
    accessibilityOptions?: string[];
    locationOptions?: { id: string; displayName: string }[];
    debounceMs?: number;
    onChange?: (filters: AvailabilityFilter) => void;
}

const defaultStyle: React.CSSProperties = {
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

const checkboxGroupStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
};

const checkboxLabelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    fontSize: "0.875rem",
};

export function AvailabilitySearch({
    className,
    equipmentOptions = [],
    accessibilityOptions = [],
    locationOptions = [],
    debounceMs = 300,
    onChange,
}: AvailabilitySearchProps) {
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");
    const [minCapacity, setMinCapacity] = useState("");
    const [capacityType, setCapacityType] = useState<"seated" | "exam" | "standing">("seated");
    const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
    const [selectedAccessibility, setSelectedAccessibility] = useState<string[]>([]);
    const [locationScope, setLocationScope] = useState("");
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const buildFilters = useCallback((): AvailabilityFilter | null => {
        if (!startsAt || !endsAt) return null;
        return {
            timeRange: {
                startsAt: new Date(startsAt),
                endsAt: new Date(endsAt),
            },
            minCapacity: minCapacity ? Number(minCapacity) : undefined,
            capacityType,
            requiredEquipment: selectedEquipment.length > 0 ? selectedEquipment : undefined,
            requiredAccessibility: selectedAccessibility.length > 0 ? selectedAccessibility : undefined,
            locationScope: locationScope || undefined,
        };
    }, [startsAt, endsAt, minCapacity, capacityType, selectedEquipment, selectedAccessibility, locationScope]);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const filters = buildFilters();
            if (filters && onChange) {
                onChange(filters);
            }
        }, debounceMs);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [buildFilters, debounceMs, onChange]);

    const toggleEquipment = useCallback((tag: string) => {
        setSelectedEquipment((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        );
    }, []);

    const toggleAccessibility = useCallback((attr: string) => {
        setSelectedAccessibility((prev) =>
            prev.includes(attr) ? prev.filter((a) => a !== attr) : [...prev, attr],
        );
    }, []);

    return (
        <form
            className={className}
            style={defaultStyle}
            onSubmit={(e) => e.preventDefault()}
            role="search"
            aria-label="Room availability search"
        >
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                <legend style={{ ...labelStyle, marginBottom: "0.5rem" }}>Time Range</legend>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <div style={fieldStyle}>
                        <label htmlFor="rk-avail-starts" style={labelStyle}>
                            From
                        </label>
                        <input
                            id="rk-avail-starts"
                            type="datetime-local"
                            value={startsAt}
                            onChange={(e) => setStartsAt(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={fieldStyle}>
                        <label htmlFor="rk-avail-ends" style={labelStyle}>
                            To
                        </label>
                        <input
                            id="rk-avail-ends"
                            type="datetime-local"
                            value={endsAt}
                            onChange={(e) => setEndsAt(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
            </fieldset>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <div style={fieldStyle}>
                    <label htmlFor="rk-avail-capacity" style={labelStyle}>
                        Min Capacity
                    </label>
                    <input
                        id="rk-avail-capacity"
                        type="number"
                        min="0"
                        value={minCapacity}
                        onChange={(e) => setMinCapacity(e.target.value)}
                        style={inputStyle}
                        placeholder="e.g. 30"
                    />
                </div>
                <div style={fieldStyle}>
                    <label htmlFor="rk-avail-cap-type" style={labelStyle}>
                        Capacity Type
                    </label>
                    <select
                        id="rk-avail-cap-type"
                        value={capacityType}
                        onChange={(e) => setCapacityType(e.target.value as "seated" | "exam" | "standing")}
                        style={inputStyle}
                    >
                        <option value="seated">Seated</option>
                        <option value="exam">Exam</option>
                        <option value="standing">Standing</option>
                    </select>
                </div>
            </div>

            {equipmentOptions.length > 0 && (
                <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <legend style={labelStyle}>Required Equipment</legend>
                    <div style={checkboxGroupStyle}>
                        {equipmentOptions.map((tag) => (
                            <label key={tag} style={checkboxLabelStyle}>
                                <input
                                    type="checkbox"
                                    checked={selectedEquipment.includes(tag)}
                                    onChange={() => toggleEquipment(tag)}
                                />
                                {tag}
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}

            {accessibilityOptions.length > 0 && (
                <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <legend style={labelStyle}>Accessibility Requirements</legend>
                    <div style={checkboxGroupStyle}>
                        {accessibilityOptions.map((attr) => (
                            <label key={attr} style={checkboxLabelStyle}>
                                <input
                                    type="checkbox"
                                    checked={selectedAccessibility.includes(attr)}
                                    onChange={() => toggleAccessibility(attr)}
                                />
                                {attr}
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}

            {locationOptions.length > 0 && (
                <div style={fieldStyle}>
                    <label htmlFor="rk-avail-location" style={labelStyle}>
                        Location Scope
                    </label>
                    <select
                        id="rk-avail-location"
                        value={locationScope}
                        onChange={(e) => setLocationScope(e.target.value)}
                        style={inputStyle}
                    >
                        <option value="">All locations</option>
                        {locationOptions.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.displayName}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </form>
    );
}
