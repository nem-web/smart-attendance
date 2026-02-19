import { useEffect, useState, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import PropTypes from 'prop-types';

const REFRESH_TIME = 5;

export default function RotatingQR({ sessionId, subjectId, onClose }) {
  // Generate token (replace with backend call later)
  const generateToken = useCallback(() => {
    const qrData = {
      subjectId,
      date: new Date().toISOString(),
      sessionId,
      token: `${sessionId}-${Date.now()}`
    };
    return JSON.stringify(qrData);
  }, [sessionId, subjectId]);

  const [token, setToken] = useState(() => generateToken());
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_TIME);

  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === 1) {
          setToken(generateToken());
          return REFRESH_TIME;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [generateToken]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="transition-opacity duration-300">
        <QRCodeCanvas value={token} size={250} />
      </div>
      <p className="text-sm text-[var(--text-body)]/80">
        Code refreshes in {secondsLeft}s...
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-[var(--danger)] text-[var(--text-on-primary)] rounded cursor-pointer hover:opacity-90 transition"
      >
        Stop Session
      </button>
    </div>
  );
}

RotatingQR.propTypes = {
  sessionId: PropTypes.string.isRequired,
  subjectId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
