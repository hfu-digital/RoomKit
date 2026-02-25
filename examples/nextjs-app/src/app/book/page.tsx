"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCreateBooking } from "@hfu.digital/roomkit-react";
import type { Booking } from "@hfu.digital/roomkit-react";

export default function BookPage() {
    const searchParams = useSearchParams();
    const prefilledRoomId = searchParams.get("roomId") ?? "";

    /* ------------------------------------------------------------------ */
    /*  Form state                                                         */
    /* ------------------------------------------------------------------ */
    const [roomId, setRoomId] = useState(prefilledRoomId);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [purposeType, setPurposeType] = useState("lecture");
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");
    const [requesterId, setRequesterId] = useState("");

    const [success, setSuccess] = useState<Booking | null>(null);

    /* ------------------------------------------------------------------ */
    /*  Mutation                                                           */
    /* ------------------------------------------------------------------ */
    const { mutate, isLoading, error } = useCreateBooking({
        onSuccess: (booking) => setSuccess(booking),
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!roomId || !title || !startsAt || !endsAt || !requesterId) return;

        await mutate({
            roomId,
            requesterId,
            title,
            description: description || null,
            purposeType,
            startsAt: new Date(startsAt).toISOString(),
            endsAt: new Date(endsAt).toISOString(),
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Success view                                                       */
    /* ------------------------------------------------------------------ */
    if (success) {
        return (
            <div style={cardStyle}>
                <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#166534" }}>
                    Booking created
                </h2>
                <p style={{ marginTop: "8px", color: "#374151" }}>
                    <strong>{success.title}</strong> has been submitted
                    with status <em>{success.status}</em>.
                </p>
                <p style={{ marginTop: "4px", fontSize: "13px", color: "#6b7280" }}>
                    ID: {success.id}
                </p>
                <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                    <a href="/" style={linkBtnStyle}>
                        Back to search
                    </a>
                    <button
                        onClick={() => {
                            setSuccess(null);
                            setTitle("");
                            setDescription("");
                            setStartsAt("");
                            setEndsAt("");
                        }}
                        style={secondaryBtnStyle}
                    >
                        Create another
                    </button>
                </div>
            </div>
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Form view                                                          */
    /* ------------------------------------------------------------------ */
    return (
        <div>
            <h2 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: 600 }}>
                New Booking
            </h2>

            <form onSubmit={handleSubmit} style={cardStyle}>
                <div style={fieldGrid}>
                    <label style={labelStyle}>
                        Room ID *
                        <input
                            required
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            placeholder="UUID of the room"
                            style={inputStyle}
                        />
                    </label>

                    <label style={labelStyle}>
                        Requester ID *
                        <input
                            required
                            value={requesterId}
                            onChange={(e) => setRequesterId(e.target.value)}
                            placeholder="Your user UUID"
                            style={inputStyle}
                        />
                    </label>

                    <label style={labelStyle}>
                        Title *
                        <input
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Team meeting"
                            style={inputStyle}
                        />
                    </label>

                    <label style={labelStyle}>
                        Purpose
                        <select
                            value={purposeType}
                            onChange={(e) => setPurposeType(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="lecture">Lecture</option>
                            <option value="seminar">Seminar</option>
                            <option value="meeting">Meeting</option>
                            <option value="exam">Exam</option>
                            <option value="other">Other</option>
                        </select>
                    </label>

                    <label style={labelStyle}>
                        From *
                        <input
                            required
                            type="datetime-local"
                            value={startsAt}
                            onChange={(e) => setStartsAt(e.target.value)}
                            style={inputStyle}
                        />
                    </label>

                    <label style={labelStyle}>
                        To *
                        <input
                            required
                            type="datetime-local"
                            value={endsAt}
                            onChange={(e) => setEndsAt(e.target.value)}
                            style={inputStyle}
                        />
                    </label>

                    <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                        Description
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Optional notes"
                            style={{ ...inputStyle, resize: "vertical" }}
                        />
                    </label>
                </div>

                {error && (
                    <p style={{ marginTop: "12px", color: "#dc2626", fontSize: "14px" }}>
                        Error: {error.message}
                    </p>
                )}

                <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            ...primaryBtnStyle,
                            opacity: isLoading ? 0.6 : 1,
                        }}
                    >
                        {isLoading ? "Creating..." : "Create Booking"}
                    </button>
                    <a href="/" style={linkBtnSecondary}>
                        Cancel
                    </a>
                </div>
            </form>
        </div>
    );
}

/* ====================================================================== */
/*  Inline styles                                                          */
/* ====================================================================== */

const cardStyle: React.CSSProperties = {
    padding: "20px",
    background: "#fff",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
};

const fieldGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "16px",
};

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

const primaryBtnStyle: React.CSSProperties = {
    padding: "8px 20px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#fff",
    background: "#2563eb",
    border: "none",
    borderRadius: "6px",
};

const secondaryBtnStyle: React.CSSProperties = {
    padding: "8px 20px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#374151",
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
};

const linkBtnStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "8px 20px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#fff",
    background: "#2563eb",
    borderRadius: "6px",
    textDecoration: "none",
};

const linkBtnSecondary: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 20px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#374151",
    textDecoration: "none",
};
