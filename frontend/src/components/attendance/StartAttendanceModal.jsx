import React, { useState } from "react";
// import RotatingQR from "./RotatingQR";
import LiveAttendanceModal from "./LiveAttendanceModal";
import { X, MapPin, Loader2 } from "lucide-react";
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';

export default function StartAttendanceModal({ sessionId, subjectId, onClose }) {
  const [showQR, setShowQR] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [teacherLocation, setTeacherLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  
  // Use the provided sessionId or generate a fallback (using useState to ensure purity)
  const [actualSessionId] = useState(() => sessionId || "session-" + Date.now());

  const handleStartSession = () => {
    if (!navigator.geolocation) {
        toast.error("Geolocation is not supported.");
        // Allow skip if really needed, but warn
        setLocationError("Geolocation not supported by this browser.");
        return;
    }

    setLoadingLocation(true);
    setLocationError(null);
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            setTeacherLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            });
            setLoadingLocation(false);
            setShowQR(true);
        },
        (error) => {
            console.error("Location error:", error);
            let msg = "Could not get location. ";
            if (error.code === error.PERMISSION_DENIED) msg = "Location permission denied. Please allow location access.";
            else if (error.code === error.POSITION_UNAVAILABLE) msg = "Position unavailable. Please try again.";
            else if (error.code === error.TIMEOUT) msg = "Request timed out. Please try again.";
            
            // Fallback to low accuracy if high accuracy times out
            if (error.code === error.TIMEOUT) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setTeacherLocation({
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude
                        });
                        setLoadingLocation(false);
                        setShowQR(true);
                    },
                    () => {
                        toast.error(msg);
                        setLoadingLocation(false);
                        setLocationError(msg);
                    },
                    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
                );
                return;
            }

            toast.error(msg);
            setLoadingLocation(false);
            setLocationError(msg);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };
  
  const handleSkipLocation = () => {
      if (confirm("Without location, proxy detection will be disabled. Are you sure?")) {
          setShowQR(true);
      }
  };

  if (showQR) {
    return (
      <LiveAttendanceModal 
        sessionId={actualSessionId} 
        subjectId={subjectId} 
        onClose={onClose}
        initialLocation={teacherLocation} 
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-[var(--overlay)] flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 w-full max-w-md relative shadow-xl border border-[var(--border-color)] animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-body)]/80 hover:text-[var(--text-body)] cursor-pointer"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold mb-4 text-[var(--text-main)]">Start Attendance</h2>

        <div className="flex flex-col gap-4">
          <p className="text-[var(--text-body)]">
            Values privacy? We only use location to verify students are within range.
            Click below to generate a rotating QR code.
          </p>
          
          <div className="p-3 bg-[var(--bg-secondary)] rounded-lg text-sm text-[var(--text-body)] flex gap-2 items-start">
             <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--primary)]" />
             <span>Location access is required for smart proxy detection.</span>
          </div>

          {locationError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500 flex gap-2 items-start">
                 <StartAttendanceModalIconError />
                 <span>{locationError}</span>
              </div>
          )}

          <button
            onClick={handleStartSession}
            disabled={loadingLocation}
            className="w-full py-3 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-xl hover:bg-[var(--primary-hover)] transition font-medium shadow-md cursor-pointer flex justify-center items-center gap-2"
          >
            {loadingLocation ? (
                <>
                    <Loader2 size={20} className="animate-spin" />
                    Finding Location...
                </>
            ) : (
                locationError ? "Retry Location" : "Generate QR"
            )}
          </button>
          
          {locationError && (
              <button 
                onClick={handleSkipLocation}
                className="text-sm text-[var(--text-body)]/60 hover:text-[var(--text-body)] underline text-center pb-2"
              >
                  Skip location (No proxy check)
              </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StartAttendanceModalIconError() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
    )
}

StartAttendanceModal.propTypes = {
  sessionId: PropTypes.string,
  subjectId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};
