import React, { useState } from "react";
import RotatingQR from "./RotatingQR";
import { X } from "lucide-react";
import PropTypes from 'prop-types';

export default function StartAttendanceModal({ sessionId, onClose }) {
  const [showQR, setShowQR] = useState(false);
  // Use the provided sessionId or generate a fallback (using useState to ensure purity)
  const [actualSessionId] = useState(() => sessionId || "session-" + Date.now());

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

        {!showQR ? (
          <div className="flex flex-col gap-4">
            <p className="text-[var(--text-body)]">
              Click below to generate a rotating QR code for students to scan.
              This code refreshes every 5 seconds to prevent sharing.
            </p>
            <button
              onClick={() => setShowQR(true)}
              className="w-full py-3 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-xl hover:bg-[var(--primary-hover)] transition font-medium shadow-md cursor-pointer flex justify-center items-center"
            >
              Generate QR
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <RotatingQR
              sessionId={actualSessionId}
              onClose={onClose}
            />
          </div>
        )}
      </div>
    </div>
  );
}

StartAttendanceModal.propTypes = {
  sessionId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};
