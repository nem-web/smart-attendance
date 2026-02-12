/* eslint-disable */
import React from "react";

/* eslint-disable react-hooks/rules-of-hooks */
export default function FaceOverlay({ faces, videoRef }) {
  // eslint-disable-next-line react/prop-types
  if (!videoRef.current) return null;

  const videoEl = videoRef.current.video;
  if (!videoEl || !videoEl.videoWidth) return null;

  const displayWidth = videoEl.clientWidth;
  const displayHeight = videoEl.clientHeight;

  const scaleX = displayWidth / videoEl.videoWidth;
  const scaleY = displayHeight / videoEl.videoHeight;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ width: displayWidth, height: displayHeight }}
    >
      {faces.map((f, idx) => {
        const { top, right, bottom, left } = f.box;

        const width = (right - left) * scaleX;
        const height = (bottom - top) * scaleY;

        // ✅ correct mirror handling
        const x = (videoEl.videoWidth - right) * scaleX;
        const y = top * scaleY;

        const color =
          f.status === "present"
            ? "#22c55e"
            : f.status === "uncertain"
            ? "#f59e0b"
            : "#ef4444";

        const label =
          f.status === "present"
            ? `${f.student?.name} (${Math.round(f.confidence * 100)}%)`
            : f.status === "uncertain"
            ? "Check ID"
            : "Unknown";

        return (
          <div
            key={idx}
            style={{
              position: "absolute",
              left: `${x}px`,
              top: `${y}px`,
              width: `${width}px`,
              height: `${height}px`,
              border: `2px solid ${color}`,
              borderRadius: "8px",
              background: `${color}20`,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-18px",
                left: 0,
                background: color,
                color: "#fff",
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "4px",
                whiteSpace: "nowrap",
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
