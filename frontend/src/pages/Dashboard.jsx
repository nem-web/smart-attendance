import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Download,
  Play,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  ChevronRight,
  Loader2,
  AlertTriangle
} from "lucide-react"; // Assuming you use lucide-react, or replace with your icons

export default function Dashboard() {
  const { t } = useTranslation();
  const [user] = useState(() => {
    const data = localStorage.getItem("user");
    return data ? JSON.parse(data) : null;
  });
  const [mlStatus, setMlStatus] = useState("checking"); // checking, ready, waking-up

  useEffect(() => {
    const checkMlService = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        setMlStatus("waking-up");
      }, 10000); // If pending for > 10s, it's likely waking up

      try {
        const response = await axios.get(import.meta.env.VITE_ML_SERVICE_URL, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 200) {
          setMlStatus("ready");
        }
      } catch {
        clearTimeout(timeoutId);
        // If it fails, assume it's waking up or down. 
        // Render free tier might just timeout the first request or return 502 temporarily.
        setMlStatus("waking-up");
      }
    };

    // Initial check
    checkMlService();

    // Poll every 30 seconds
    const interval = setInterval(checkMlService, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
    switch (mlStatus) {
      case "ready":
        return (
          <span className="text-xs font-medium text-[var(--success)] bg-[var(--success)]/10 px-2 py-1 rounded flex items-center gap-1">
            <CheckCircle size={12} />
            {t('dashboard.status.ready')}
          </span>
        );
      case "waking-up":
        return (
          <span className="text-xs font-medium text-[var(--warning)] bg-[var(--warning)]/10 px-2 py-1 rounded flex items-center gap-1">
            <AlertTriangle size={12} />
            {t('dashboard.status.waking_up')}
          </span>
        );
      case "checking":
      default:
        return (
          <span className="text-xs font-medium text-[var(--text-body)] bg-[var(--bg-secondary)] px-2 py-1 rounded flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" />
            {t('dashboard.status.checking')}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* --- SECTION 1: PAGE HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-main)]">{t('dashboard.title')}</h1>
            <p className="text-[var(--text-body)] mt-1">{t('dashboard.subtitle')}</p>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-hover)] font-medium transition-colors flex items-center gap-2 cursor-pointer">
              <Download size={18} />
              {t('dashboard.download_report')}
            </button>
            <Link to="/start-attendance" className="hover:bg-[var(--primary-hover)] px-4 py-2 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-lg hover:bg-[var(--primary-hover)] font-medium shadow-sm flex items-center gap-2 transition-colors">
              <Play size={18} fill="currentColor" />
              {t('dashboard.start_attendance')}
            </Link>
          </div>
        </div>

        {/* --- SECTION 2: MAIN GRID LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN (Wider - 8 cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* 2.1 Welcome / Active Session Card */}
            <div className="bg-[var(--bg-card)] text-[var(--text-body)] rounded-2xl p-6 shadow-sm border border-[var(--border-color)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-main)]">{t('dashboard.greeting', { name: user?.name || "Teacher" })}</h2>
                  <p className=" text-sm text-[var(--text-body)] opacity-80">Monday, September 23 • 08:45</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-[var(--bg-secondary)] text-[var(--text-body)] rounded-full font-medium">Next class: Grade 10A • 09:00</span>
                  <span className="px-3 py-1 bg-[var(--bg-secondary)] text-[var(--text-body)] rounded-full font-medium">Room 203</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                {getStatusBadge()}
                <Link to="/attendance-session" className="w-full md:w-auto px-6 py-3 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-xl font-semibold hover:bg-[var(--primary-hover)] transition shadow-md text-center">
                  {t('dashboard.start_session')}
                </Link>
                <div className="flex items-center gap-1.5 text-xs text-[var(--success)] font-medium">
                  <CheckCircle size={14} />
                  {t('dashboard.camera_checked')}
                </div>
              </div>
            </div>

            {/* 2.2 Stats Row (Blue Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Stat 1 */}
              <div className="bg-[var(--action-info-bg)] text-[var(--text-on-primary)] rounded-2xl p-5 relative overflow-hidden">
                <p className="text-[var(--text-on-primary)]/80 text-sm font-medium mb-1">{t('dashboard.stats.attendance_rate')}</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold">94%</h3>
                  <span className="text-xs bg-[var(--text-on-primary)]/15 px-2 py-1 rounded text-[var(--text-on-primary)]/90">{t('dashboard.stats.increase')}</span>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-[var(--action-info-bg)] text-[var(--text-on-primary)] rounded-2xl p-5">
                <p className="text-[var(--text-on-primary)]/80 text-sm font-medium mb-1">{t('dashboard.stats.absent')}</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold">7</h3>
                  <span className="text-xs text-[var(--text-on-primary)]/80">{t('dashboard.stats.all_classes')}</span>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="bg-[var(--action-info-bg)] text-[var(--text-on-primary)] rounded-2xl p-5">
                <p className="text-[var(--text-on-primary)]/80 text-sm font-medium mb-1">{t('dashboard.stats.late_arrivals')}</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold">3</h3>
                  <span className="text-xs text-[var(--text-on-primary)]/80">{t('dashboard.stats.first_period')}</span>
                </div>
              </div>
            </div>

            {/* 2.3 Quick Actions Row (Light Gray Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Link to="/students" className="block">
              <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl cursor-pointer hover:bg-[var(--bg-hover)] transition">
                <div className="font-semibold text-[var(--text-main)] mb-1">{t('dashboard.quick_actions.view_students')}</div>
                <div className="text-xs text-[var(--text-body)]">{t('dashboard.quick_actions.view_students_desc')}</div>
              </div>
              </Link>
              <Link to="/attendance" className="block">
              <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl cursor-pointer hover:bg-[var(--bg-hover)] transition">
                <div className="font-semibold text-[var(--text-main)] mb-1">{t('dashboard.quick_actions.go_to_attendance')}</div>
                <div className="text-xs text-[var(--text-body)]">{t('dashboard.quick_actions.go_to_attendance_desc')}</div>
              </div>
              </Link>
              <Link to="/" className="block">
              <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl cursor-pointer hover:bg-[var(--bg-hover)] transition">
                <div className="font-semibold text-[var(--text-main)] mb-1">{t('dashboard.quick_actions.manage_schedule')}</div>
                <div className="text-xs text-[var(--text-body)]">{t('dashboard.quick_actions.manage_schedule_desc')}</div>
              </div>
              </Link>
            </div>

          </div>

          {/* RIGHT COLUMN (Narrower - 4 cols) */}
          <div className="lg:col-span-4 space-y-6">

            {/* 3.1 Trends Chart Placeholder */}
            <div className="bg-[var(--bg-card)] p-6 rounded-2xl shadow-sm border border-[var(--border-color)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-[var(--text-main)]">{t('dashboard.trends.title')}</h3>
                <span className="text-xs text-[var(--text-body)] bg-[var(--bg-secondary)] px-2 py-1 rounded">{t('dashboard.trends.this_week')}</span>
              </div>

              {/* Chart Placeholder Box */}
              <div className="h-40 bg-[var(--bg-secondary)] rounded-xl w-full flex items-center justify-center text-[var(--text-body)]/50 mb-4 border border-dashed border-[var(--border-color)]">
                {t('dashboard.trends.chart_area')}
              </div>

              <div className="flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span> {t('dashboard.trends.present')}</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--text-body)]/30"></span> {t('dashboard.trends.absent')}</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--warning)]/50"></span> {t('dashboard.trends.late')}</div>
              </div>
            </div>

            {/* 3.2 Upcoming Classes List */}
            <div className="space-y-3">
              {/* Card 1 */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-[var(--border-color)] border-l-4 border-l-[var(--success)]">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-[var(--text-main)]">Grade 10A Mathematics</h4>
                  <span className="px-2 py-0.5 bg-[var(--success)]/10 text-[var(--success)] text-[10px] font-bold uppercase tracking-wide rounded-full">{t('dashboard.classes.completed')}</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-xs text-[var(--text-body)] flex flex-col gap-1">
                    <span className="flex items-center gap-1"><Clock size={12} /> 08:00 - 09:00</span>
                    <span>Room 203</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--text-body)]">96% attendance</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-[var(--border-color)] border-l-4 border-l-[var(--primary)]">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-[var(--text-main)]">Grade 9B Physics</h4>
                  <span className="px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-bold uppercase tracking-wide rounded-full">{t('dashboard.classes.upcoming')}</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-xs text-[var(--text-body)] flex flex-col gap-1">
                    <span className="flex items-center gap-1"><Clock size={12} /> 09:15 - 10:15</span>
                    <span>Lab 2</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--primary)]">{t('dashboard.classes.starts_in')}</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-[var(--border-color)] border-l-4 border-l-[var(--warning)]">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-[var(--text-main)]">Grade 11C Chemistry</h4>
                  <span className="px-2 py-0.5 bg-[var(--warning)]/10 text-[var(--warning)] text-[10px] font-bold uppercase tracking-wide rounded-full">{t('dashboard.classes.pending')}</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-xs text-[var(--text-body)] flex flex-col gap-1">
                    <span className="flex items-center gap-1"><Clock size={12} /> 11:00 - 12:00</span>
                    <span>Lab 1</span>
                  </div>
                  <span className="text-xs font-medium ">{t('dashboard.classes.not_started')}</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}