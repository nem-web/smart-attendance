import React from "react";
import PropTypes from "prop-types";
import { AlertTriangle, X, CheckCircle, Info } from "lucide-react";

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "info", // 'danger', 'warning', 'info', 'success'
  children
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "danger":
        return <AlertTriangle className="text-[var(--danger)]" size={24} />;
      case "warning":
        return <AlertTriangle className="text-[var(--warning)]" size={24} />;
      case "success":
        return <CheckCircle className="text-[var(--success)]" size={24} />;
      default:
        return <Info className="text-[var(--primary)]" size={24} />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case "danger": return "bg-[var(--danger)]/10";
      case "warning": return "bg-[var(--warning)]/10";
      case "success": return "bg-[var(--success)]/10";
      default: return "bg-[var(--primary)]/10";
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case "danger": return "bg-[var(--danger)] hover:bg-[var(--danger)]/90";
      case "warning": return "bg-[var(--warning)] hover:bg-[var(--warning)]/90";
      case "success": return "bg-[var(--success)] hover:bg-[var(--success)]/90";
      default: return "bg-[var(--primary)] hover:bg-[var(--primary-hover)]";
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--bg-card)] rounded-xl shadow-2xl border border-[var(--border-color)] max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${getIconBg()} flex items-center justify-center`}>
              {getIcon()}
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-main)]">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-body)] hover:text-[var(--text-main)] hover:bg-[var(--bg-secondary)] p-1 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-[var(--text-body)] text-sm leading-relaxed">
            {message}
          </p>
          {children}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 bg-[var(--bg-secondary)]/50 border-t border-[var(--border-color)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-sm text-[var(--text-body)] hover:text-[var(--text-main)] hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-color)] transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-medium text-sm text-white shadow-sm transition-all ${getButtonColor()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

ConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  type: PropTypes.oneOf(['danger', 'warning', 'info', 'success']),
  children: PropTypes.node
};
