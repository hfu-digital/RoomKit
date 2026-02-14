"use client";

import { useState } from "react";
import { useLocationTree } from "@roomkit/react";
import type { LocationTreeNode } from "@roomkit/react";

export default function LocationsPage() {
    const { data: tree, isLoading, error } = useLocationTree();
    const [selectedNode, setSelectedNode] = useState<LocationTreeNode | null>(
        null,
    );

    return (
        <div>
            <h2 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: 600 }}>
                Location Browser
            </h2>

            {isLoading && <p style={{ color: "#6b7280" }}>Loading locations...</p>}
            {error && (
                <p style={{ color: "#dc2626" }}>Error: {error.message}</p>
            )}

            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                {/* -- Tree panel -------------------------------------- */}
                <div
                    style={{
                        flex: "1 1 360px",
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "16px",
                        maxHeight: "600px",
                        overflow: "auto",
                    }}
                >
                    {tree && tree.length === 0 && (
                        <p style={{ color: "#6b7280" }}>No locations found.</p>
                    )}
                    {tree?.map((node) => (
                        <TreeNode
                            key={node.id}
                            node={node}
                            depth={0}
                            selectedId={selectedNode?.id ?? null}
                            onSelect={setSelectedNode}
                        />
                    ))}
                </div>

                {/* -- Detail panel ------------------------------------ */}
                {selectedNode && (
                    <div
                        style={{
                            flex: "1 1 320px",
                            background: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "20px",
                            alignSelf: "flex-start",
                        }}
                    >
                        <h3
                            style={{
                                fontSize: "16px",
                                fontWeight: 600,
                                marginBottom: "12px",
                            }}
                        >
                            {selectedNode.displayName}
                        </h3>

                        <dl style={{ fontSize: "14px" }}>
                            <DetailRow label="Type" value={selectedNode.type} />
                            <DetailRow label="Path" value={selectedNode.path} />
                            <DetailRow
                                label="Active"
                                value={selectedNode.isActive ? "Yes" : "No"}
                            />
                            <DetailRow
                                label="ID"
                                value={selectedNode.id}
                            />
                            {selectedNode.aliases.length > 0 && (
                                <DetailRow
                                    label="Aliases"
                                    value={selectedNode.aliases.join(", ")}
                                />
                            )}
                            {selectedNode.metadata && (
                                <DetailRow
                                    label="Metadata"
                                    value={selectedNode.metadata}
                                />
                            )}
                            <DetailRow
                                label="Children"
                                value={String(selectedNode.children.length)}
                            />
                        </dl>

                        <button
                            onClick={() => setSelectedNode(null)}
                            style={{
                                marginTop: "16px",
                                padding: "6px 14px",
                                fontSize: "13px",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                background: "#fff",
                            }}
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ====================================================================== */
/*  Sub-components                                                         */
/* ====================================================================== */

function TreeNode({
    node,
    depth,
    selectedId,
    onSelect,
}: {
    node: LocationTreeNode;
    depth: number;
    selectedId: string | null;
    onSelect: (node: LocationTreeNode) => void;
}) {
    const [expanded, setExpanded] = useState(depth < 2);
    const hasChildren = node.children.length > 0;
    const isSelected = node.id === selectedId;

    return (
        <div style={{ paddingLeft: depth > 0 ? "16px" : "0" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    background: isSelected ? "#eff6ff" : "transparent",
                    cursor: "pointer",
                    fontSize: "14px",
                }}
                onClick={() => onSelect(node)}
            >
                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(!expanded);
                        }}
                        style={{
                            border: "none",
                            background: "none",
                            padding: 0,
                            fontSize: "12px",
                            color: "#6b7280",
                            width: "16px",
                        }}
                    >
                        {expanded ? "v" : ">"}
                    </button>
                )}
                {!hasChildren && <span style={{ width: "16px" }} />}

                <span style={typeBadgeStyle}>{node.type}</span>
                <span style={{ fontWeight: isSelected ? 600 : 400 }}>
                    {node.displayName}
                </span>
            </div>

            {expanded &&
                hasChildren &&
                node.children.map((child) => (
                    <TreeNode
                        key={child.id}
                        node={child}
                        depth={depth + 1}
                        selectedId={selectedId}
                        onSelect={onSelect}
                    />
                ))}
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                display: "flex",
                gap: "8px",
                padding: "6px 0",
                borderBottom: "1px solid #f3f4f6",
            }}
        >
            <dt style={{ fontWeight: 500, color: "#6b7280", minWidth: "80px" }}>
                {label}
            </dt>
            <dd style={{ color: "#1a1a1a", wordBreak: "break-all" }}>{value}</dd>
        </div>
    );
}

/* ====================================================================== */
/*  Inline styles                                                          */
/* ====================================================================== */

const typeBadgeStyle: React.CSSProperties = {
    padding: "1px 6px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 500,
    background: "#f3f4f6",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
};
