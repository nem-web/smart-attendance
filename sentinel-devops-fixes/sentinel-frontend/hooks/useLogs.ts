"use client";

import { useState, useEffect, useCallback } from "react";
import { useWebSocketMessage } from "@/lib/WebSocketContext";

export type LogLevel = "info" | "warn" | "error" | "debug" | "success";

export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    service: string;
    message: string;
}

function classifyLogLevel(type: string, message: string): LogLevel {
    if (type === 'alert' || message.includes("CRITICAL") || message.includes("down")) return "error";
    if (type === 'success' || message.includes("HEALTHY")) return "success";
    if (message.includes("DEGRADED")) return "warn";
    return "info";
}

export function useLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [filterLevel, setFilterLevel] = useState<LogLevel | "all">("all");
    const [search, setSearch] = useState("");
    const [error, setError] = useState<string | null>(null);
    const lastMessage = useWebSocketMessage();

    // Initial fetch for cold start — uses environment variable for API URL
    const fetchLogs = useCallback(async () => {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
        try {
            const res = await fetch(`${API_BASE}/api/activity`);
            if (!res.ok) throw new Error("Backend not available");
            const data = await res.json();

            if (data.activity) {
                const formattedLogs: LogEntry[] = data.activity.map((entry: { type: string; message: string; id: number; timestamp: string }) => ({
                    id: entry.id.toString(),
                    timestamp: entry.timestamp,
                    level: classifyLogLevel(entry.type, entry.message),
                    service: "sentinel-agent",
                    message: entry.message
                }));
                setLogs(formattedLogs);
                setError(null);
            }
        } catch (e) {
            // Preserve existing logs on error — never fabricate data
            // Show error state instead of synthetic log entries
            setError("Unable to connect to backend. Displaying last known data.");
            console.error("Failed to fetch logs:", e);
        }
    }, []);

    // Initial data load only — no polling interval (WebSocket handles real-time updates)
    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    // React to WebSocket ACTIVITY_LOG messages for real-time log streaming
    useEffect(() => {
        if (!lastMessage || lastMessage.type !== 'ACTIVITY_LOG') return;
        if (isPaused) return; // Respect pause state

        const entry = lastMessage.data;
        const logEntry: LogEntry = {
            id: entry.id.toString(),
            timestamp: entry.timestamp,
            level: classifyLogLevel(entry.type, entry.message),
            service: "sentinel-agent",
            message: entry.message
        };

        setLogs(prev => {
            // Prevent duplicates
            if (prev.some(l => l.id === logEntry.id)) return prev;
            const next = [logEntry, ...prev];
            // Cap at 200 entries to prevent memory bloat
            return next.length > 200 ? next.slice(0, 200) : next;
        });
    }, [lastMessage, isPaused]);

    // Client-side filtering
    const filteredLogs = logs.filter(log => {
        const matchesLevel = filterLevel === "all" || log.level === filterLevel;
        const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase()) ||
            log.service.toLowerCase().includes(search.toLowerCase());
        return matchesLevel && matchesSearch;
    });

    return {
        logs: filteredLogs,
        isPaused,
        setIsPaused,
        filterLevel,
        setFilterLevel,
        search,
        setSearch,
        error,
        clearLogs: () => setLogs([])
    };
}
