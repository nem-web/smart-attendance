"use client";

import { Incident } from "@/lib/mockData";
import { getSeverityColor } from "@/lib/theme";
import {
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    Zap,
    ChevronUp,
    ChevronDown,
    Search
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/common/Button";
import { FeedbackButtons } from "@/components/incidents/FeedbackButtons";
import { SimilarIncidents } from "@/components/incidents/SimilarIncidents";

interface IncidentCardProps {
    incident: Incident;
    onViewReasoning?: (id: string) => void;
}

export function IncidentCard({ incident, onViewReasoning }: IncidentCardProps) {
    const [expanded, setExpanded] = useState(false);

    const getStatusIcon = () => {
        switch (incident.status) {
            case "resolved": return <CheckCircle className="h-5 w-5 text-green-500" />;
            case "in-progress": return <AlertTriangle className="h-5 w-5 text-orange-500" />;
            case "failed": return <XCircle className="h-5 w-5 text-red-500" />;
        }
    };

    const severityColor = getSeverityColor(incident.severity);

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all hover:border-white/20">
            {/* Header / Summary */}
            <div
                className="p-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-1">{getStatusIcon()}</div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${severityColor.bg} ${severityColor.text} ${severityColor.border}`}>
                                    {incident.severity}
                                </span>
                                <span className="text-sm text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground">{incident.timestamp.split('T')[0]}</span>
                            </div>
                            <h4 className={`font-semibold text-lg leading-tight mb-1 ${incident.severity === 'critical' ? 'text-red-400' :
                                incident.severity === 'warning' ? 'text-yellow-400' : 'text-white'
                                }`}>
                                {incident.title}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {incident.duration}
                                </span>
                                <span className="flex items-center gap-1 text-primary">
                                    <Zap className="h-3 w-3" /> {incident.agentAction}
                                </span>
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5 bg-black/20"
                    >
                        <div className="p-4 space-y-4">
                            {/* Root Cause */}
                            <div className="grid grid-cols-[100px_1fr] gap-4 text-sm">
                                <span className="text-muted-foreground">Root Cause:</span>
                                <span className="text-white font-medium">{incident.rootCause}</span>
                            </div>

                            {/* Confidence */}
                            <div className="grid grid-cols-[100px_1fr] gap-4 text-sm items-center">
                                <span className="text-muted-foreground">Confidence:</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full"
                                            style={{ width: `${(incident.confidence ?? 0.85) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-gray-400">{(incident.confidence ?? 0.85) * 100}%</span>
                                </div>
                            </div>

                            {/* Operational Memory / Similar Incidents */}
                            {incident.similarIncidents && (
                                <SimilarIncidents incidents={incident.similarIncidents} />
                            )}

                            {/* Feedback */}
                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => onViewReasoning && onViewReasoning(incident.id)}
                                >
                                    <Search className="mr-2 h-4 w-4" />
                                    View Agent Reasoning
                                </Button>
                                <FeedbackButtons incidentId={incident.id} />
                            </div>

                            {/* Timeline */}
                            <div className="pt-2">
                                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Incident Timeline</h5>
                                <div className="space-y-3 relative pl-4 border-l border-white/10 ml-2">
                                    {incident.timeline.map((event, idx) => (
                                        <div key={idx} className="relative group">
                                            <div className="absolute -left-[25px] top-0 h-6 w-6 rounded-full bg-background border border-white/10 flex items-center justify-center z-10">
                                                <span className="text-[10px] filter grayscale group-hover:grayscale-0 transition-all leading-none ml-[0.5px]">{event.icon}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground font-mono mb-0.5">{event.time}</span>
                                                <span className="text-sm text-white">{event.event}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
