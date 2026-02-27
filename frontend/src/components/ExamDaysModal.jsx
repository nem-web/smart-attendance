import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Trash2, CalendarDays, Plus, Loader2, AlertCircle, Edit2, Save } from "lucide-react";
import { getExams, addExam, updateExam, deleteExam } from "../api/exams";

/**
 * ExamDaysModal
 *
 * A modal dialog that lets a teacher manage exam days.
 * Exams are stored in a dedicated `exams` collection.
 *
 * Props:
 *   isOpen    (boolean)   – Whether the modal is visible
 *   onClose   (function)  – Called when the modal is closed
 */
export default function ExamDaysModal({ isOpen, onClose }) {
  const { t } = useTranslation();

  // ─── State ──────────────────────────────────────────────────
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);

  const nameInputRef = useRef(null);

  // ─── Fetch exams when modal opens ────────────────────────
  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getExams();
      const sorted = (res.exams ?? []).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      setExams(sorted);
    } catch (err) {
      const msg =
        err.response?.data?.detail ??
        t("manage_schedule.exams_load_error", "Failed to load exams. Please try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isOpen) {
      fetchExams();
      resetForm();
      setError("");
    }
  }, [isOpen, fetchExams]);

  // ─── Reset Form ─────────────────────────────────────────────
  const resetForm = () => {
    setDate("");
    setName("");
    setEditingId(null);
    setError("");
  };

  // ─── Close on Escape key ────────────────────────────────────
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ─── Add/Update exam ────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !name.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      if (editingId) {
        // Update existing exam
        const res = await updateExam(editingId, {
          date: date,
          name: name.trim(),
        });
        setExams((prev) =>
          prev.map((ex) => (ex.id === editingId ? res : ex)).sort((a, b) => new Date(a.date) - new Date(b.date))
        );
      } else {
        // Add new exam
        const res = await addExam({
          date: date,
          name: name.trim(),
        });
        setExams((prev) =>
          [...prev, res].sort((a, b) => new Date(a.date) - new Date(b.date))
        );
      }
      resetForm();
      nameInputRef.current?.focus();
    } catch (err) {
      const msg =
        err.response?.data?.detail ??
        (editingId 
          ? t("manage_schedule.exams_update_error", "Failed to update exam. Please try again.") 
          : t("manage_schedule.exams_add_error", "Failed to add exam. Please try again."));
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Edit exam ──────────────────────────────────────────────
  const handleEdit = (exam) => {
    setEditingId(exam.id);
    setName(exam.name);
    // Date comes as YYYY-MM-DD from API usually, or we might need formatting
    // Based on holiday schema: date is YYYY-MM-DD string
    setDate(exam.date); 
    setError("");
    nameInputRef.current?.focus();
  };

  // ─── Delete exam ────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm(t("manage_schedule.confirm_delete_exam", "Are you sure you want to delete this exam?"))) {
      return;
    }
    setDeletingId(id);
    setError("");
    try {
      await deleteExam(id);
      setExams((prev) => prev.filter((h) => h.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ??
        t("manage_schedule.exams_delete_error", "Failed to delete exam. Please try again.");
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
      aria-label={t("manage_schedule.manage_exams", "Manage Exam Days")}
    >
      {/* Modal panel */}
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays size={20} className="text-[var(--primary)]" />
            <h3 className="text-xl font-bold text-[var(--text-main)]">
              {t("manage_schedule.manage_exams", "Manage Exam Days")}
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
        <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Add/Edit form ─────────────────────────────── */}
          <form onSubmit={handleSubmit} className="bg-[var(--bg-secondary)]/50 p-4 rounded-xl border border-[var(--border-color)]">
            <p className="mb-3 text-sm font-medium text-[var(--text-main)]">
              {editingId 
                ? t("manage_schedule.edit_exam", "Edit exam") 
                : t("manage_schedule.add_exam", "Add a new exam")}
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder={t("manage_schedule.exam_name_placeholder", "Exam name (e.g. Physics Mid-term)")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:ring-2 ring-[var(--primary)] placeholder:text-[var(--text-body)]"
                />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:ring-2 ring-[var(--primary)]"
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-2 text-xs font-medium text-[var(--text-body)] hover:text-[var(--text-main)] transition"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting || !date || !name.trim()}
                  className="inline-flex items-center justify-center gap-1.5 bg-[var(--primary)] text-[var(--text-on-primary)] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : editingId ? (
                    <>
                      <Save size={16} />
                      {t("common.save", "Save")}
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      {t("manage_schedule.add", "Add")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* ── Exam list ─────────────────────────────────── */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--text-main)]">
              {t("manage_schedule.scheduled_exams", "Scheduled exams")}
              {!loading && (
                <span className="ml-1 text-[var(--text-body)]">({exams.length})</span>
              )}
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
              </div>
            ) : exams.length === 0 ? (
              <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl py-8 text-center text-sm text-[var(--text-body)]">
                {t("manage_schedule.no_exams", "No exams scheduled yet.")}
              </div>
            ) : (
              <div className="space-y-2">
                {exams.map((ex) => (
                  <div
                    key={ex.id}
                    className={`flex items-center justify-between border rounded-lg px-4 py-3 transition ${
                      editingId === ex.id 
                        ? "border-[var(--primary)] bg-[var(--primary)]/5" 
                        : "border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                    }`}
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="text-sm font-bold text-[var(--text-main)] truncate">
                        {ex.name}
                      </p>
                      <p className="text-xs text-[var(--text-body)]">
                        {formatDate(ex.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(ex)}
                        disabled={editingId === ex.id}
                        className={`p-1.5 rounded-md transition ${
                          editingId === ex.id
                            ? "text-[var(--primary)] opacity-50 cursor-default"
                            : "text-[var(--text-body)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10"
                        }`}
                        aria-label={t("manage_schedule.edit_exam", "Edit") + ` ${ex.name}`}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(ex.id)}
                        disabled={deletingId === ex.id}
                        className="p-1.5 text-[var(--text-body)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-md transition disabled:opacity-50"
                        aria-label={t("manage_schedule.delete_exam", "Delete") + ` ${ex.name}`}
                      >
                        {deletingId === ex.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="border-t border-[var(--border-color)] px-6 py-3 flex-shrink-0">
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
