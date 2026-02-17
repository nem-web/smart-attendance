import React, { useState, useEffect } from "react";

export default function FaceOverlay({ faces, videoRef }) {
  const [videoDimensions, setVideoDimensions] = useState(null);

  useEffect(() => {
    if (videoRef.current && videoRef.current.video && videoRef.current.video.videoWidth) {
      const videoEl = videoRef.current.video;
      const newDims = {
        width: videoEl.videoWidth,
        height: videoEl.videoHeight,
        displayWidth: videoEl.clientWidth,
        displayHeight: videoEl.clientHeight
      };

      setVideoDimensions(prev => {
        if (!prev || 
            prev.width !== newDims.width || 
            prev.height !== newDims.height || 
            prev.displayWidth !== newDims.displayWidth || 
            prev.displayHeight !== newDims.displayHeight) {
          return newDims;
        }
        return prev;
      });
    }
  }, [faces, videoRef]); // Re-check when faces change or videoRef changes

  if (!videoDimensions) return null;

  const { width: videoWidth, height: videoHeight, displayWidth, displayHeight } = videoDimensions;

  const scaleX = displayWidth / videoWidth;
  const scaleY = displayHeight / videoHeight;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ width: displayWidth, height: displayHeight }}
    >
      {faces.map((f, idx) => {
        const { top, right, bottom, left } = f.box;

        const boxWidth = (right - left) * scaleX;
        const boxHeight = (bottom - top) * scaleY;

        // ✅ correct mirror handling
        const x = (videoWidth - right) * scaleX;
        const y = top * scaleY;

        const color =
          f.status === "present"
            ? "var(--success)"
            : f.status === "uncertain"
            ? "var(--warning)"
            : "var(--danger)";

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
              width: `${boxWidth}px`,
              height: `${boxHeight}px`,
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
                color: "var(--text-on-primary)",
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
