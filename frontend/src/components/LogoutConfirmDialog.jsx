import React from "react";
import PropTypes from "prop-types";
import { AlertTriangle, X } from "lucide-react";

export default function LogoutConfirmDialog({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-color)] max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--danger)]/10 flex items-center justify-center">
              <AlertTriangle className="text-[var(--danger)]" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-main)]">
              Confirm Logout
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-body)] hover:text-[var(--text-main)] transition-colors"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-[var(--text-body)] text-sm leading-relaxed">
            Are you sure you want to logout?
          </p>
          <div className="bg-[var(--warning-bg)] border border-[var(--warning)] rounded-lg p-4">
            <p className="text-sm text-[var(--warning-text)] font-medium">
              ⚠️ Important: If you attempt to login from a different device
              within the next 5 hours, you will need to verify with an OTP.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

LogoutConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};
