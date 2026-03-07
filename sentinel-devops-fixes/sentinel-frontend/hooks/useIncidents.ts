"use client";

import { useEffect, useState } from "react";
import { Incident } from "@/lib/mockData";
import { useWebSocketMessage, useWebSocketConnection } from "@/lib/WebSocketContext";
import { parseInsight, InsightPayload } from "@/lib/parseInsight";

export function useIncidents(options: { manual?: boolean } = {}) {
    const { manual } = options;
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
    const lastMessage = useWebSocketMessage();
    const { isConnected } = useWebSocketConnection();

    // Handle WebSocket Messages
    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === "INCIDENT_NEW") {
            const newIncident = parseInsight(lastMessage.data as InsightPayload);
            setIncidents((prev) => {
                if (prev.some(i => i.id === newIncident.id)) return prev;
                return [newIncident, ...prev].slice(0, 50);
            });
        }
    }, [lastMessage]);

    // Initial fetch fallback — respects manual mode
    useEffect(() => {
        if (manual) return;

        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        fetch(`${API_BASE}/api/insights`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setIncidents(data.map(parseInsight));
                }
            })
            .catch(err => console.error("Failed to fetch incidents:", err));
    }, [manual]);

    return { incidents, activeIncidentId, setActiveIncidentId, isConnected };
}
