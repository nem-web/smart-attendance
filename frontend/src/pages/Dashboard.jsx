import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Download,
  Play,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  AlertTriangle
} from "lucide-react"; 
import { getTodaySchedule } from "../api/schedule";
import StartAttendanceModal from "../components/attendance/StartAttendanceModal";

export default function Dashboard() {
  const { t } = useTranslation();
  const [user] = useState(() => {
    const data = localStorage.getItem("user");
    return data ? JSON.parse(data) : null;
  });
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [mlStatus, setMlStatus] = useState("checking"); // checking, ready, waking-up
  const [todayClasses, setTodayClasses] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [tick, setTick] = useState(0); // Periodic tick for real-time status updates

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

  // Fetch today's schedule
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const data = await getTodaySchedule();
        setTodayClasses(data.classes || []);
      } catch (error) {
        console.error("Failed to fetch schedule:", error);
        setTodayClasses([]);
      } finally {
        setLoadingSchedule(false);
      }
    };
    fetchSchedule();
  }, []);

  // Periodic tick for real-time status updates (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Helper function to safely parse a "HH:MM" or "H:MM" time string into minutes since midnight
  const parseTimeToMinutes = (timeStr) => {
    if (typeof timeStr !== "string") {
      return null;
    }

    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return hours * 60 + minutes;
  };

  // Helper function to get class status based on time
  const getClassStatus = (startTime, endTime) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    if (startMinutes === null || endMinutes === null) {
      console.error("Invalid time format for class", { startTime, endTime });
      // Fallback to a safe default that matches existing status values
      return { status: "upcoming", color: "primary", label: "Upcoming" };
    }

    if (currentMinutes > endMinutes) {
      return { status: "completed", color: "success", label: "Completed" };
    } else if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return { status: "live", color: "warning", label: "Pending" };
    } else {
      const minutesUntil = startMinutes - currentMinutes;
      return {
        status: "upcoming",
        color: "primary",
        label: "Upcoming",
        startsIn: minutesUntil
      };
    }
  };

  // Get next upcoming class - memoized to avoid redundant computation
  const nextClass = useMemo(() => {
    // trigger re-calc on tick
    void tick;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const cls of todayClasses) {
      const [startHour, startMin] = cls.start_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;

      if (startMinutes > currentMinutes) {
        return cls;
      }
    }
    return null;
  }, [todayClasses, tick]); // Re-compute when classes or tick changes

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
            <button className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-secondary)] font-medium transition-colors flex items-center gap-2 cursor-pointer">
              <Download size={18} />
              {t('dashboard.download_report')}
            </button>
            <Link to="/attendance" className="px-4 py-2 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-lg hover:bg-[var(--primary-hover)] font-medium shadow-sm flex items-center gap-2 transition-colors">
              <Play size={18} fill="currentColor" />
              {t('dashboard.startAttendance')}
            </Link>
          </div>
        </div>

        {showAttendanceModal && (
          <StartAttendanceModal onClose={() => setShowAttendanceModal(false)} />
        )}

        {/* --- SECTION 2: MAIN GRID LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN (Wider - 8 cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* 2.1 Welcome / Active Session Card */}
            <div className="bg-[var(--bg-card)] text-[var(--text-body)] rounded-2xl p-6 shadow-sm border border-[var(--border-color)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-main)]">{t('dashboard.greeting', { name: user?.name || "Teacher" })}</h2>
                  <p className=" text-sm text-[var(--text-body)] opacity-80">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {!loadingSchedule && nextClass ? (
                    <>
                      <span className="px-3 py-1 bg-[var(--bg-secondary)] text-[var(--text-body)] rounded-full font-medium">
                        Next class: {nextClass.subject || 'Class'} • {nextClass.start_time}
                      </span>
                      {nextClass.room && (
                        <span className="px-3 py-1 bg-[var(--bg-secondary)] text-[var(--text-body)] rounded-full font-medium">
                          Room {nextClass.room}
                        </span>
                      )}
                    </>
                  ) : !loadingSchedule ? (
                    <span className="px-3 py-1 bg-[var(--bg-secondary)] text-[var(--text-body)] rounded-full font-medium">
                      No upcoming classes today
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-[var(--bg-secondary)] text-[var(--text-body)] rounded-full font-medium">
                      Loading schedule...
                    </span>
                  )}
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
                <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl cursor-pointer hover:opacity-90 transition">
                  <div className="font-semibold text-[var(--text-main)] mb-1">{t('dashboard.quick_actions.view_students')}</div>
                  <div className="text-xs text-[var(--text-body)]">{t('dashboard.quick_actions.view_students_desc')}</div>
                </div>
              </Link>
              <Link to="/attendance" className="block">
                <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl cursor-pointer hover:opacity-90 transition">
                  <div className="font-semibold text-[var(--text-main)] mb-1">{t('dashboard.quick_actions.go_to_attendance')}</div>
                  <div className="text-xs text-[var(--text-body)]">{t('dashboard.quick_actions.go_to_attendance_desc')}</div>
                </div>
              </Link>
              <Link to="/" className="block">
                <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl cursor-pointer hover:opacity-90 transition">
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
              {loadingSchedule ? (
                <div className="bg-[var(--bg-card)] p-8 rounded-xl text-center border border-[var(--border-color)]">
                  <Loader2 className="mx-auto mb-3 text-[var(--text-body)]/30 animate-spin" size={32} />
                  <p className="text-[var(--text-body)]">Loading schedule...</p>
                </div>
              ) : todayClasses.length === 0 ? (
                <div className="bg-[var(--bg-card)] p-8 rounded-xl text-center border border-[var(--border-color)]">
                  <Calendar className="mx-auto mb-3 text-[var(--text-body)]/30" size={48} />
                  <p className="text-[var(--text-body)]">No classes scheduled for today</p>
                </div>
              ) : (
                todayClasses.map((cls) => {
                  const status = getClassStatus(cls.start_time, cls.end_time);
                  const borderColorMap = {
                    success: 'border-l-[var(--success)]',
                    warning: 'border-l-[var(--warning)]',
                    primary: 'border-l-[var(--primary)]'
                  };
                  const bgColorMap = {
                    success: 'bg-[var(--success)]/10 text-[var(--success)]',
                    warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
                    primary: 'bg-[var(--primary)]/10 text-[var(--primary)]'
                  };

                  return (
                    <div
                      key={`${cls.slot}-${cls.start_time}`}
                      className={`bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-[var(--border-color)] border-l-4 ${borderColorMap[status.color]}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-[var(--text-main)]">
                          {cls.subject || 'Class'}
                        </h4>
                        <span className={`px-2 py-0.5 ${bgColorMap[status.color]} text-[10px] font-bold uppercase tracking-wide rounded-full`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-xs text-[var(--text-body)] flex flex-col gap-1">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {cls.start_time} - {cls.end_time}
                          </span>
                          {cls.room && <span>Room {cls.room}</span>}
                        </div>
                        {status.status === 'upcoming' && status.startsIn !== undefined && status.startsIn >= 0 && (
                          <span className="text-xs font-medium text-[var(--primary)]">
                            Starts in {status.startsIn} min
                          </span>
                        )}
                        {status.status === 'completed' && cls.attendance_status && (
                          <span className="text-xs font-medium text-[var(--text-body)]">
                            {cls.attendance_status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
