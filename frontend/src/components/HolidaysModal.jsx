import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Trash2, CalendarDays, Plus, Loader2, AlertCircle } from "lucide-react";
import { getHolidays, addHoliday, deleteHoliday } from "../api/holidays";

/**
 * HolidaysModal
 *
 * A modal dialog that lets a teacher manage holidays (non-instructional days).
 * Holidays are stored in a dedicated `holidays` collection (per issue #315).
 *
 * Props:
 *   isOpen    (boolean)   – Whether the modal is visible
 *   onClose   (function)  – Called when the modal is closed
 */
export default function HolidaysModal({ isOpen, onClose }) {
  const { t } = useTranslation();

  // ─── State ──────────────────────────────────────────────────
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");

  const nameInputRef = useRef(null);

  // ─── Fetch holidays when modal opens ────────────────────────
  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getHolidays();
      const sorted = (res.holidays ?? []).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      setHolidays(sorted);
    } catch (err) {
      const msg =
        err.response?.data?.detail ??
        t("manage_schedule.holidays_load_error", "Failed to load holidays. Please try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isOpen) {
      fetchHolidays();
      setNewDate("");
      setNewName("");
      setError("");
    }
  }, [isOpen, fetchHolidays]);

  // ─── Close on Escape key ────────────────────────────────────
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ─── Add holiday ────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newDate || !newName.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await addHoliday({
        date: newDate,
        name: newName.trim(),
      });
      setHolidays((prev) =>
        [...prev, res].sort((a, b) => new Date(a.date) - new Date(b.date))
      );
      setNewDate("");
      setNewName("");
      nameInputRef.current?.focus();
    } catch (err) {
      const msg =
        err.response?.data?.detail ??
        t("manage_schedule.holidays_add_error", "Failed to add holiday. Please try again.");
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete holiday ─────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeletingId(id);
    setError("");
    try {
      await deleteHoliday(id);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      const msg =
        err.response?.data?.detail ??
        t("manage_schedule.holidays_delete_error", "Failed to delete holiday. Please try again.");
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Format date for display ────────────────────────────────
  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // ─── Don't render when closed ───────────────────────────────
  if (!isOpen) return null;

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm animate-in fade-in duration-200 p-4"
      onClick={() => onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={t("manage_schedule.manage_holidays", "Manage Holidays")}
    >
      {/* Modal panel */}
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-lg rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={20} className="text-[var(--primary)]" />
            <h3 className="text-xl font-bold text-[var(--text-main)]">
              {t("manage_schedule.manage_holidays", "Manage Holidays")}
            </h3>
          </div>
          <button
            onClick={() => onClose()}
            className="text-[var(--text-body)] hover:text-[var(--text-main)] transition"
            aria-label={t("common.close", "Close")}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="max-h-[65vh] overflow-y-auto px-6 py-4 space-y-5">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Add‑holiday form ─────────────────────────────── */}
          <form onSubmit={handleAdd}>
            <p className="mb-2 text-sm font-medium text-[var(--text-main)]">
              {t("manage_schedule.add_holiday", "Add a new holiday")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                ref={nameInputRef}
                type="text"
                placeholder={t("manage_schedule.holiday_name_placeholder", "Holiday name")}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={100}
                required
                className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:ring-2 ring-[var(--primary)] placeholder:text-[var(--text-body)]"
              />
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:ring-2 ring-[var(--primary)]"
              />
              <button
                type="submit"
                disabled={submitting || !newDate || !newName.trim()}
                className="inline-flex items-center justify-center gap-1.5 bg-[var(--primary)] text-[var(--text-on-primary)] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                {t("manage_schedule.add", "Add")}
              </button>
            </div>
          </form>

          {/* ── Holiday list ─────────────────────────────────── */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--text-main)]">
              {t("manage_schedule.scheduled_holidays", "Scheduled holidays")}
              {!loading && (
                <span className="ml-1 text-[var(--text-body)]">({holidays.length})</span>
              )}
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
              </div>
            ) : holidays.length === 0 ? (
              <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl py-8 text-center text-sm text-[var(--text-body)]">
                {t("manage_schedule.no_holidays", "No holidays added yet.")}
              </div>
            ) : (
              <div className="space-y-2">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between border border-[var(--border-color)] rounded-lg px-4 py-3 hover:bg-[var(--bg-secondary)] transition"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--text-main)] truncate">
                        {h.name}
                      </p>
                      <p className="text-xs text-[var(--text-body)]">
                        {formatDate(h.date)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(h.id)}
                      disabled={deletingId === h.id}
                      className="ml-3 flex-shrink-0 p-1.5 text-[var(--text-body)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-md transition disabled:opacity-50"
                      aria-label={t("manage_schedule.delete_holiday", "Delete") + ` ${h.name}`}
                    >
                      {deletingId === h.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="border-t border-[var(--border-color)] px-6 py-3">
          <button
            onClick={() => onClose()}
            className="w-full py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium text-[var(--text-main)] hover:bg-[var(--bg-secondary)] transition"
          >
            {t("common.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}