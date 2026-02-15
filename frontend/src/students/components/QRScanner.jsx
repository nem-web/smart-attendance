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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Scan QR Code</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Point at teacher's screen</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Close scanner"
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-6 pb-8 bg-gray-50 dark:bg-slate-950">
          <div id="reader" className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-black aspect-square relative shadow-inner">
            {/* Custom overlay components can be added here if html5-qrcode allows, 
                but by default it renders its own UI into this div */}
          </div>

          <div className="mt-6 flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-bold">Privacy Note:</span> We use your camera and GPS to verify your attendance. Stay within the classroom.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 text-center">
             <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Smart Attendance System</p>
        </div>
      </div>
    </div>
  );
}
