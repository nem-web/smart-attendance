import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AddSubjectModal({ open, onClose, onSave }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, code });
    setName("");
    setCode("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-card)] w-full max-w-md rounded-2xl shadow-xl border border-[var(--border-color)] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
          <h3 className="text-lg font-bold text-[var(--text-main)]">{t('settings.profile.add_subject_modal.title')}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-secondary)] text-[var(--text-body)] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--text-main)]">
              {t('settings.profile.add_subject_modal.name_label')}
            </label>
            <input
              required
              type="text"
              placeholder={t('settings.profile.add_subject_modal.name_placeholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-main)] focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--text-main)]">
              {t('settings.profile.add_subject_modal.code_label')}
            </label>
            <input
              required
              type="text"
              placeholder={t('settings.profile.add_subject_modal.code_placeholder')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-main)] focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-all"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-medium text-[var(--text-body)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] transition-colors"
            >
              {t('settings.profile.add_subject_modal.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl font-bold bg-[var(--primary)] text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)] shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} />
              {t('settings.profile.add_subject_modal.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
