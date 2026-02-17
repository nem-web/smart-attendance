import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Loader2,
    MapPin,
    QrCode,
    ShieldCheck,
    Navigation
} from "lucide-react";
import api from "../../api/axiosClient";
import QRScanner from "../components/QRScanner";

export default function MarkWithQR() {
    const navigate = useNavigate();
    const [showScanner, setShowScanner] = useState(false);
    const [status, setStatus] = useState("idle"); // idle, scanning, geolocating, submitting, success, error
    const [errorMsg, setErrorMsg] = useState("");

    const startScanning = () => {
        setShowScanner(true);
        setStatus("scanning");
        setErrorMsg("");
    };

    const handleScanSuccess = async (decodedText) => {
        setShowScanner(false);
        setStatus("geolocating");

        // Step 2: Capture Geolocation
        if (!navigator.geolocation) {
            setStatus("error");
            setErrorMsg("Geolocation is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await submitAttendance(decodedText, latitude, longitude);
            },
            (error) => {
                setStatus("error");
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setErrorMsg("User denied the request for Geolocation.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setErrorMsg("Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        setErrorMsg("The request to get user location timed out.");
                        break;
                    default:
                        setErrorMsg("An unknown error occurred while getting location.");
                        break;
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const submitAttendance = async (token, lat, lng) => {
        setStatus("submitting");
        try {
            await api.post("/api/attendance/mark-qr", {
                token,
                latitude: lat,
                longitude: lng,
            });

            // If the request did not throw, treat it as a success based on HTTP status
            setStatus("success");
        } catch (error) {
            setStatus("error");
            setErrorMsg(error.response?.data?.detail || "An error occurred while submitting attendance.");
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col font-sans text-[var(--text-main)]">
            {/* Header */}
            <header className="px-6 py-5 bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center justify-between sticky top-0 z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 text-[var(--text-body)]/80 hover:bg-[var(--bg-secondary)] rounded-full transition-colors"
                    aria-label="Go back"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-[var(--text-main)]">Mark Attendance</h1>
                <div className="w-10"></div> {/* Spacer */}
            </header>

            <main className="flex-1 p-6 flex flex-col items-center justify-center max-w-lg mx-auto w-full">

                {status === "idle" && (
                    <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="relative mx-auto w-48 h-48 bg-[var(--action-info-bg)]/10 rounded-full flex items-center justify-center text-[var(--action-info-bg)] shadow-inner">
                            <QrCode size={80} strokeWidth={1.5} />
                            <div className="absolute -bottom-2 -right-2 bg-[var(--success)] text-[var(--text-on-primary)] p-3 rounded-2xl shadow-lg animate-bounce duration-[2000ms]">
                                <ShieldCheck size={28} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-2xl font-black text-[var(--text-main)] leading-tight">Ready to check in?</h2>
                            <p className="text-[var(--text-body)]/80 text-sm max-w-xs mx-auto">
                                Scan the QR code displayed on your teacher's screen to mark your attendance instantly.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-body)]/80 uppercase tracking-widest justify-center">
                                <span className="w-8 h-px bg-[var(--border-color)]"></span>
                                Requirements
                                <span className="w-8 h-px bg-[var(--border-color)]"></span>
                            </div>
                            <div className="flex justify-center gap-6">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]/40 shadow-sm flex items-center justify-center text-[var(--text-body)]/80">
                                        <Navigation size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold text-[var(--text-body)]/80">Live GPS</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]/40 shadow-sm flex items-center justify-center text-[var(--text-body)]/80">
                                        <MapPin size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold text-[var(--text-body)]/80">In Class</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={startScanning}
                            className="w-full bg-[var(--action-info-bg)]  hover:bg-[var(--action-info-hover)] active:scale-95 text-[var(--text-on-primary)] py-4 px-8 rounded-2xl font-bold shadow-xl shadow-black/10 transition-all flex items-center justify-center gap-3 text-lg"
                        >
                            <QrCode size={22} />
                            Mark with QR
                        </button>
                    </div>
                )}

                {(status === "geolocating" || status === "submitting") && (
                    <div className="text-center space-y-6">
                        <div className="relative">
                            <div className="w-24 h-24 border-4 border-[var(--border-color)]/40 border-t-[var(--action-info-bg)] rounded-full animate-spin mx-auto"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-[var(--action-info-bg)]">
                                {status === "geolocating" ? <Navigation size={32} /> : <Loader2 size={32} className="animate-spin" />}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-[var(--text-main)]">
                                {status === "geolocating" ? "Locating you..." : "Processing..."}
                            </h3>
                            <p className="text-[var(--text-body)]/80 text-sm">
                                {status === "geolocating"
                                    ? "We're verifying you're in the classroom."
                                    : "Hang tight, we're marking your attendance."}
                            </p>
                        </div>
                    </div>
                )}

                {status === "success" && (
                    <div className="text-center space-y-8 animate-in zoom-in duration-300">
                        <div className="w-24 h-24 bg-[var(--success)]/15 text-[var(--success)] rounded-full flex items-center justify-center mx-auto shadow-lg shadow-black/10">
                            <CheckCircle2 size={56} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black text-[var(--text-main)]">Success!</h2>
                            <p className="text-[var(--text-body)]">
                                Your attendance has been marked successfully. Have a great class!
                            </p>
                        </div>
                        <button
                            onClick={() => navigate("/student-dashboard")}
                            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-on-primary)] py-4 px-8 rounded-2xl font-bold transition-all shadow-xl"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                )}

                {status === "error" && (
                    <div className="text-center space-y-8">
                        <div className="w-24 h-24 bg-[var(--danger)]/15 text-[var(--danger)] rounded-full flex items-center justify-center mx-auto shadow-lg shadow-black/10">
                            <XCircle size={56} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black text-[var(--text-main)]">Oops!</h2>
                            <div className="p-4 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-2xl text-[var(--danger)] text-sm leading-relaxed">
                                {errorMsg || "Something went wrong while marking your attendance."}
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={startScanning}
                                className="w-full bg-[var(--action-info-bg)] hover:bg-[var(--action-info-hover)] text-[var(--text-on-primary)] py-4 px-8 rounded-2xl font-bold transition-all shadow-xl shadow-black/10"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => navigate("/student-dashboard")}
                                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-body)] py-4 px-8 rounded-2xl font-bold transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {showScanner && (
                    <QRScanner
                        onScanSuccess={handleScanSuccess}
                        onClose={() => {
                            setShowScanner(false);
                            setStatus("idle");
                        }}
                    />
                )}
            </main>

            {/* Privacy Footer */}
            <footer className="p-8 text-center bg-[var(--bg-primary)] border-t border-[var(--border-color)]">
                <div className="flex items-center justify-center gap-2 text-[var(--text-body)]/80 mb-3">
                    <ShieldCheck size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Secure Verification</span>
                </div>
                <p className="text-[10px] text-[var(--text-body)]/80 leading-relaxed max-w-[200px] mx-auto">
                    This app validates your session using live location and camera data to prevent proxy attendance.
                </p>
            </footer>
        </div>
    );
}
