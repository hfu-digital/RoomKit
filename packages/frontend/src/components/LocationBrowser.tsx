import React, { useState, useCallback } from "react";
import type { LocationNode } from "../types";

export interface LocationTreeNode extends LocationNode {
    children: LocationTreeNode[];
}

export interface LocationBrowserProps {
    className?: string;
    tree: LocationTreeNode[];
    onSelect?: (node: LocationTreeNode) => void;
    selectedId?: string;
    defaultExpandedIds?: string[];
}

const listStyle: React.CSSProperties = {
    listStyle: "none",
    padding: 0,
    margin: 0,
};

const nestedListStyle: React.CSSProperties = {
    listStyle: "none",
    paddingLeft: "1.25rem",
    margin: 0,
};

const itemStyle: React.CSSProperties = {
    padding: "0.25rem 0",
};

const buttonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    background: "none",
    border: "none",
    padding: "0.25rem 0.5rem",
    cursor: "pointer",
    fontSize: "0.875rem",
    borderRadius: "4px",
    width: "100%",
    textAlign: "left",
};

const selectedButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#e8f4fd",
    fontWeight: 600,
};

const toggleStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "1.25rem",
    height: "1.25rem",
    fontSize: "0.625rem",
    flexShrink: 0,
};

const typeLabels: Record<string, string> = {
    institution: "INST",
    campus: "CAM",
    building: "BLD",
    floor: "FLR",
    wing: "WNG",
    room: "RM",
};

const typeBadgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0 0.25rem",
    borderRadius: "3px",
    fontSize: "0.625rem",
    fontWeight: 600,
    backgroundColor: "#f0f0f0",
    color: "#666",
    letterSpacing: "0.025em",
};

interface LocationNodeItemProps {
    node: LocationTreeNode;
    onSelect?: (node: LocationTreeNode) => void;
    selectedId?: string;
    defaultExpandedIds: Set<string>;
}

function LocationNodeItem({ node, onSelect, selectedId, defaultExpandedIds }: LocationNodeItemProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpandedIds.has(node.id));
    const hasChildren = node.children.length > 0;
    const isSelected = selectedId === node.id;

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded((prev) => !prev);
    }, []);

    const handleSelect = useCallback(() => {
        onSelect?.(node);
    }, [onSelect, node]);

    return (
        <li style={itemStyle} role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
            <div
                style={isSelected ? selectedButtonStyle : buttonStyle}
                onClick={handleSelect}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelect();
                    }
                }}
                role="button"
                tabIndex={0}
            >
                {hasChildren ? (
                    <span
                        style={toggleStyle}
                        onClick={handleToggle}
                        role="button"
                        tabIndex={0}
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleToggle(e as unknown as React.MouseEvent);
                            }
                        }}
                    >
                        {isExpanded ? "\u25BC" : "\u25B6"}
                    </span>
                ) : (
                    <span style={toggleStyle} />
                )}
                <span style={typeBadgeStyle}>{typeLabels[node.type] || node.type}</span>
                <span>{node.displayName}</span>
                {!node.isActive && (
                    <span style={{ fontSize: "0.6875rem", color: "#999", marginLeft: "0.25rem" }}>
                        (inactive)
                    </span>
                )}
            </div>
            {hasChildren && isExpanded && (
                <ul style={nestedListStyle} role="group">
                    {node.children.map((child) => (
                        <LocationNodeItem
                            key={child.id}
                            node={child}
                            onSelect={onSelect}
                            selectedId={selectedId}
                            defaultExpandedIds={defaultExpandedIds}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

export function LocationBrowser({
    className,
    tree,
    onSelect,
    selectedId,
    defaultExpandedIds = [],
}: LocationBrowserProps) {
    const expandedSet = React.useMemo(() => new Set(defaultExpandedIds), [defaultExpandedIds]);

    return (
        <nav className={className} aria-label="Location hierarchy">
            <ul style={listStyle} role="tree">
                {tree.map((node) => (
                    <LocationNodeItem
                        key={node.id}
                        node={node}
                        onSelect={onSelect}
                        selectedId={selectedId}
                        defaultExpandedIds={expandedSet}
                    />
                ))}
            </ul>
        </nav>
    );
}
