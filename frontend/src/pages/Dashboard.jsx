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
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { getTodaySchedule } from "../api/schedule";
import { fetchDashboardStats, fetchAttendanceTrend } from "../api/analytics";
import StartAttendanceModal from "../components/attendance/StartAttendanceModal";
import { exportCombinedReport } from "../api/teacher";
import { toast } from "react-hot-toast";

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
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [tick, setTick] = useState(0); // Periodic tick for real-time status updates

  const [trendData, setTrendData] = useState([]);
  const [loadingTrend, setLoadingTrend] = useState(true);

  // Fetch dashboard stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await fetchDashboardStats();
        setDashboardStats(stats);
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
        // Fallback or leave as null (will show 0 or -)
      } finally {
        setLoadingStats(false);
      }
    };
    loadStats();
  }, []);

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

  // Fetch Attendance Trend Data (This Week)
  useEffect(() => {
    const loadTrendData = async () => {
      try {
        const today = new Date();
        const firstDay = new Date(today);
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        firstDay.setDate(diff); // Monday
        
        const lastDay = new Date(firstDay);
        lastDay.setDate(firstDay.getDate() + 6); // Sunday

        const trend = await fetchAttendanceTrend({
          dateFrom: firstDay.toISOString().split('T')[0],
          dateTo: lastDay.toISOString().split('T')[0]
        });

        // Map backend data to recharts specific format if needed
        const formattedData = (trend.data || []).map(item => {
          // Parse date parts to avoid timezone issues. "2023-01-01" -> local date
          const [y, m, d] = item.date.split('-').map(Number);
          const date = new Date(y, m - 1, d);
          return {
            name: date.toLocaleDateString("en-US", { weekday: "short" }),
            fullDate: item.date,
            present: item.present,
            absent: item.absent,
            late: item.late,
            total: item.total
          };
        });
        
        setTrendData(formattedData);
      } catch (error) {
        console.error("Failed to load attendance trend:", error);
      } finally {
        setLoadingTrend(false);
      }
    };
    loadTrendData();
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
      return { status: "upcoming", color: "primary", labelKey: "upcoming" };
    }

    if (currentMinutes > endMinutes) {
      return { status: "completed", color: "success", labelKey: "completed" };
    } else if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return { status: "live", color: "warning", labelKey: "pending" };
    } else {
      const minutesUntil = startMinutes - currentMinutes;
      return {
        status: "upcoming",
        color: "primary",
        labelKey: "upcoming",
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

  const handleDownloadReport = async () => {
    try {
      setDownloadingReport(true);
      toast.loading(t('dashboard.generating_report'), { id: 'report-toast' });
      
      const blob = await exportCombinedReport();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename with date
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `combined_attendance_report_${date}.pdf`);
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      toast.success(t('dashboard.report_downloaded'), { id: 'report-toast' });
    } catch (error) {
      console.error("Failed to download report:", error);
      toast.error(t('dashboard.report_failed'), { id: 'report-toast' });
    } finally {
      setDownloadingReport(false);
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)]">{t('dashboard.title')}</h1>
            <p className="text-sm sm:text-base text-[var(--text-body)] mt-1">{t('dashboard.subtitle')}</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={handleDownloadReport}
              disabled={downloadingReport}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-secondary)] font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingReport ? (
                <Loader2 size={16} className="animate-spin sm:w-[18px] sm:h-[18px]" />
              ) : (
                <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
              )}
              <span className="hidden xs:inline">{downloadingReport ? t('dashboard.generating') : t('dashboard.download_report')}</span>
            </button>
            <Link to="/attendance" className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-lg hover:bg-[var(--primary-hover)] font-medium shadow-sm flex items-center justify-center gap-2 transition-colors text-sm">
              <Play size={16} fill="currentColor" className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden xs:inline">{t('dashboard.startAttendance')}</span>
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
                        {t('dashboard.next_class', { class: nextClass.subject || t('dashboard.class_default'), time: nextClass.start_time })}
                      </span>
                      {nextClass.room && (
                        <span className="px-3 py-1 bg-[var(--bg-secondary)] text-[var(--text-body)] rounded-full font-medium">
                          {t('dashboard.room', { room: nextClass.room })}
                        </span>
                      )}
                    </>
                  ) : !loadingSchedule ? (
                    <span className="px-3 py-1 bg-[var(--bg-secondary)] text-[var(--text-body)] rounded-full font-medium">
                      {t('dashboard.classes.no_upcoming_today')}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-[var(--bg-secondary)] text-[var(--text-body)] rounded-full font-medium">
                      {t('dashboard.classes.loading_schedule')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                {getStatusBadge()}
                <Link to="/attendance" className="w-full md:w-auto px-6 py-3 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-xl font-semibold hover:bg-[var(--primary-hover)] transition shadow-md text-center">
                  {t('dashboard.start_session')}
                </Link>
                <div className="flex items-center gap-1.5 text-xs text-[var(--success)] font-medium">
                  <CheckCircle size={14} />
                  {t('dashboard.camera_checked')}
                </div>
              </div>
            </div>

            {/* 2.2 Stats Row (Blue Cards) */}
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
              {/* Stat 1 */}
              <div className="bg-[var(--action-info-bg)] text-[var(--text-on-primary)] rounded-xl sm:rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                <p className="text-[var(--text-on-primary)]/80 text-sm font-medium mb-1">
                  {dashboardStats?.timeframe === 'week' ? t('dashboard.stats.attendance_rate_week') : t('dashboard.stats.attendance_rate')}
                </p>
                <div className="flex items-end justify-between">
                  {loadingStats ? (
                     <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>
                      <h3 className="text-3xl font-bold">{dashboardStats?.attendanceRate ?? 0}%</h3>
                      {dashboardStats?.increase !== undefined && (
                        <span className="text-xs bg-[var(--text-on-primary)]/15 px-2 py-1 rounded text-[var(--text-on-primary)]/90">
                          {dashboardStats.increase ? t('dashboard.stats.increase') : t('dashboard.stats.decrease')}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-[var(--action-info-bg)] text-[var(--text-on-primary)] rounded-xl sm:rounded-2xl p-4 sm:p-5">
                <p className="text-[var(--text-on-primary)]/80 text-sm font-medium mb-1">{t('dashboard.stats.absent')}</p>
                <div className="flex items-end justify-between">
                  {loadingStats ? (
                     <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>
                      <h3 className="text-3xl font-bold">{dashboardStats?.absent ?? 0}</h3>
                      <span className="text-xs text-[var(--text-on-primary)]/80">{t('dashboard.stats.all_classes')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Stat 3 */}
              <div className="bg-[var(--action-info-bg)] text-[var(--text-on-primary)] rounded-xl sm:rounded-2xl p-4 sm:p-5">
                <p className="text-[var(--text-on-primary)]/80 text-sm font-medium mb-1">{t('dashboard.stats.late_arrivals')}</p>
                <div className="flex items-end justify-between">
                  {loadingStats ? (
                     <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>
                      <h3 className="text-3xl font-bold">{dashboardStats?.late ?? 0}</h3>
                      <span className="text-xs text-[var(--text-on-primary)]/80">{t('dashboard.stats.first_period')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 2.3 Quick Actions Row (Light Gray Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
              <Link to="/students" className="block">
                <div className="bg-[var(--bg-secondary)] p-4 sm:p-5 rounded-xl sm:rounded-2xl cursor-pointer hover:opacity-90 transition">
                  <div className="font-semibold text-[var(--text-main)] mb-1">{t('dashboard.quick_actions.view_students')}</div>
                  <div className="text-xs text-[var(--text-body)]">{t('dashboard.quick_actions.view_students_desc')}</div>
                </div>
              </Link>
              <Link to="/attendance" className="block">
                <div className="bg-[var(--bg-secondary)] p-4 sm:p-5 rounded-xl sm:rounded-2xl cursor-pointer hover:opacity-90 transition">
                  <div className="font-semibold text-[var(--text-main)] mb-1">{t('dashboard.quick_actions.go_to_attendance')}</div>
                  <div className="text-xs text-[var(--text-body)]">{t('dashboard.quick_actions.go_to_attendance_desc')}</div>
                </div>
              </Link>
              <Link to="/" className="block">
                <div className="bg-[var(--bg-secondary)] p-4 sm:p-5 rounded-xl sm:rounded-2xl cursor-pointer hover:opacity-90 transition">
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

              {/* Chart Area */}
              <div className="h-40 w-full mb-4">
                {loadingTrend ? (
                  <div className="h-full w-full bg-[var(--bg-secondary)]/30 rounded-xl flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-[var(--text-body)]/50" />
                  </div>
                ) : trendData.length === 0 ? (
                  <div className="h-full w-full bg-[var(--bg-secondary)]/30 rounded-xl flex items-center justify-center text-sm text-[var(--text-body)]">
                    {t('dashboard.trends.no_data', 'No data this week')}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPresentD" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAbsentD" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--text-body)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--text-body)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLateD" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--warning)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--warning)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: 'var(--text-body)', fontSize: 10}} 
                        dy={5}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: 'var(--text-body)', fontSize: 10}} 
                      />
                      <Tooltip 
                        contentStyle={{
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)', 
                          backgroundColor: "var(--bg-card)", 
                          color: "var(--text-main)",
                          fontSize: '12px',
                          padding: '8px'
                        }}
                        formatter={(value, name) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
                        labelStyle={{color: 'var(--text-body)', marginBottom: '4px'}}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="present" 
                        stroke="var(--primary)" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorPresentD)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="absent" 
                        stroke="var(--text-body)" 
                        strokeOpacity={0.5}
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorAbsentD)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="late" 
                        stroke="var(--warning)" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorLateD)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
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
                  <p className="text-[var(--text-body)]">{t('dashboard.classes.loading_schedule')}</p>
                </div>
              ) : todayClasses.length === 0 ? (
                <div className="bg-[var(--bg-card)] p-8 rounded-xl text-center border border-[var(--border-color)]">
                  <Calendar className="mx-auto mb-3 text-[var(--text-body)]/30" size={48} />
                  <p className="text-[var(--text-body)]">{t('dashboard.classes.no_classes_today')}</p>
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
                          {cls.subject || t('dashboard.class_default')}
                        </h4>
                        <span className={`px-2 py-0.5 ${bgColorMap[status.color]} text-[10px] font-bold uppercase tracking-wide rounded-full`}>
                          {t(`dashboard.classes.${status.labelKey}`)}
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-xs text-[var(--text-body)] flex flex-col gap-1">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {cls.start_time} - {cls.end_time}
                          </span>
                          {cls.room && <span>{t('dashboard.room', { room: cls.room })}</span>}
                        </div>
                        {status.status === 'upcoming' && status.startsIn !== undefined && status.startsIn >= 0 && (
                          <span className="text-xs font-medium text-[var(--primary)]">
                            {t('dashboard.classes.starts_in', { minutes: status.startsIn })}
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
