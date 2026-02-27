import { QRCodeCanvas } from "qrcode.react";
import PropTypes from 'prop-types';
import { Loader2 } from "lucide-react";

export default function RotatingQR({ token, onClose, compact = false }) {
  
  return (
    <div className={`flex flex-col items-center gap-4 ${compact ? 'p-0' : 'p-4'}`}>
      <div className="transition-opacity duration-300 relative">
        {token ? (
           <QRCodeCanvas value={token} size={compact ? 200 : 250} />
        ) : (
           <div 
             className="flex flex-col items-center justify-center bg-gray-100 rounded-lg animate-pulse"
             style={{ width: compact ? 200 : 250, height: compact ? 200 : 250 }}
           >
              <Loader2 className="animate-spin text-gray-400" size={32} />
              <p className="text-xs text-gray-400 mt-2 font-medium">Generating QR...</p>
           </div>
        )}
      </div>
      
      {!compact && (
        <button
          onClick={onClose}
          className="mt-2 px-4 py-2 bg-[var(--danger)] text-[var(--text-on-primary)] rounded cursor-pointer hover:opacity-90 transition"
        >
          Stop Session
        </button>
      )}
    </div>
  );
}

RotatingQR.propTypes = {
  token: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  compact: PropTypes.bool,
};
