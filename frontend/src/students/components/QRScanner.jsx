import React, { useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { XCircle, Camera, AlertCircle } from "lucide-react";

/**
 * QRScanner Component
 * 
 * @param {Object} props
 * @param {Function} props.onScanSuccess - Callback when a QR code is successfully scanned
 * @param {Function} props.onScanError - Callback when a scan error occurs
 * @param {Function} props.onClose - Callback to close the scanner
 */
export default function QRScanner({ onScanSuccess, onScanError, onClose }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      rememberLastUsedCamera: true,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      // This disables the "Upload from Gallery" button as requested
      showTorchButtonIfSupported: true,
    };

    const scanner = new Html5QrcodeScanner("reader", config, false);

    scanner.render(
      (decodedText, decodedResult) => {
        // Success
        scanner.clear().then(() => {
          onScanSuccess(decodedText, decodedResult);
        }).catch(err => {
          console.error("Failed to clear scanner", err);
          onScanSuccess(decodedText, decodedResult);
        });
      },
      (error) => {
        // Error (occurs constantly while scanning, so we only bubble up if explicitly needed)
        if (onScanError) onScanError(error);
      }
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner on unmount", err));
      }
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-card)] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-card)] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--action-info-bg)]/10  text-[var(--action-info-bg)]  flex items-center justify-center">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">Scan QR Code</h3>
              <p className="text-xs text-[var(--text-body)]/90">Point at teacher&apos;s screen</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--text-body)]/80 hover:text-[var(--text-body)] hover:bg-[var(--bg-secondary)]  rounded-full transition-colors"
            aria-label="Close scanner"
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-6 pb-8 bg-[var(--bg-primary)]">
          <div id="reader" className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-[var(--border-color)]  bg-[var(--overlay)] aspect-square relative shadow-inner">
            {/* Custom overlay components can be added here if html5-qrcode allows, 
                but by default it renders its own UI into this div */}
          </div>

          <div className="mt-6 flex items-start gap-4 p-4 bg-[var(--warning)]/10  rounded-2xl border border-[var(--warning)]/20">
            <AlertCircle size={18} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--text-main)]/80 leading-relaxed">
              <span className="font-bold">Privacy Note:</span> We use your camera and GPS to verify your attendance. Stay within the classroom.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-color)] text-center">
             <p className="text-[10px] text-[var(--text-body)]/80 uppercase tracking-widest font-bold">Smart Attendance System</p>
        </div>
      </div>
    </div>
  );
}
