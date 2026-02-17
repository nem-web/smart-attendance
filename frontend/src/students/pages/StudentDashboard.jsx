import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  Bell, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Home, 
  BookOpen, 
  TrendingUp, 
  User,
  Menu,
  QrCode
} from "lucide-react";
import { Link } from "react-router-dom";
import StudentNavigation from "../components/StudentNavigation"

export default function StudentDashboard() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  // Mock Data for Today's Schedule
  const schedule = [
    {
      id: 1,
      subject: "Mathematics",
      time: "09:00 - 09:50 AM",
      status: "Present",
      color: "green"
    },
    {
      id: 2,
      subject: "Physics",
      time: "10:00 - 10:50 AM",
      status: "Absent",
      color: "red"
    },
    {
      id: 3,
      subject: "English Literature",
      time: "11:10 - 12:00 PM",
      status: "Upcoming",
      color: "gray"
    },
    {
      id: 4,
      subject: "Computer Science",
      time: "01:00 - 01:50 PM",
      status: "Upcoming",
      color: "gray"
    },
  ];

  const currentDate = new Date().toLocaleDateString(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  const [username] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored).name : "";
    } catch {
      return "";
    }
  });


  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col md:flex-row font-sans text-[var(--text-main)]">

      <StudentNavigation activePage="home" />

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-8">

        {/* Header */}
        <header className="px-6 py-5 bg-[var(--bg-card)] border-b border-[var(--border-color)] md:bg-transparent md:border-none sticky top-0 z-10 flex justify-between items-center">
          <div>
            <p className="text-xs text-[var(--text-body)]/80 font-medium md:hidden">{t("student_dashboard.portal_name")}</p>
            <h1 className="text-xl md:text-2xl font-bold text-[var(--text-main)]">{t("student_dashboard.welcome", { name: username })}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex gap-2 items-center bg-[var(--bg-card)] px-3 py-1.5 rounded-full border border-[var(--border-color)] shadow-sm">
              <button 
                onClick={() => changeLanguage("en")} 
                className={`text-xs ${i18n.language === "en" ? "font-bold text-[var(--primary)] border-b-2 border-[var(--primary)]" : "text-[var(--text-body)]/70 hover:text-[var(--text-body)]"}`}
              >
                English
              </button>
              <span className="text-[var(--text-body)]/70 text-xs">|</span>
              <button 
                onClick={() => changeLanguage("hi")} 
                className={`text-xs ${i18n.language === "hi" ? "font-bold text-[var(--primary)] border-b-2 border-[var(--primary)]" : "text-[var(--text-body)]/70 hover:text-[var(--text-body)]"}`}
              >
                हिंदी
              </button>
            </div>

            <button className="p-2 text-[var(--text-body)]/80 hover:bg-[var(--bg-secondary)] rounded-full transition relative">
              <Bell size={22} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-[var(--danger)] rounded-full border border-[var(--bg-card)]"></span>
            </button>
          </div>
        </header>

        <div className="px-6 py-4 space-y-6 max-w-5xl mx-auto">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* LEFT COLUMN: Stats Cards */}
            <div className="space-y-6">

              {/* Hero Card (Attendance) */}
              <div className="bg-[var(--action-info-bg)] rounded-3xl p-6 text-[var(--text-on-primary)] shadow-lg shadow-[var(--primary)]/20 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--bg-card)] opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-[var(--primary-hover)] opacity-20 rounded-full -ml-5 -mb-5 blur-xl"></div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[var(--text-on-primary)]/80 text-sm font-medium">{t("student.myAttendance")}</p>
                      <h2 className="text-5xl font-bold mt-1">78%</h2>
                    </div>
                    <span className="bg-[var(--bg-card)]/20 backdrop-blur-sm text-[var(--text-on-primary)] px-3 py-1 rounded-full text-xs font-semibold border border-[var(--bg-card)]/20">
                      {t("student_dashboard.stats.on_track")}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-[var(--text-on-primary)]/85">{t("student_dashboard.stats.keep_attending")}</p>
                    
                    {/* Progress Bar */}
                    <div className="h-2 bg-[var(--bg-card)]/30 rounded-full overflow-hidden flex">
                      <div className="h-full bg-[var(--success)] w-[78%]"></div>
                      <div className="h-full bg-[var(--bg-card)]/30 flex-1 relative">
                        {/* Safe Zone Marker */}
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--bg-card)] h-full"></div>
                      </div>
                    </div>

                    <div className="flex justify-between text-[10px] text-[var(--text-on-primary)]/70 font-medium uppercase tracking-wide mt-1">
                      <span>{t("student_dashboard.stats.current")}: 78%</span>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"></span>
                        <span>{t("student_dashboard.stats.safe_zone_label", { percent: 75 })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <Link
                      to="/student-mark-qr"
                      className="inline-flex items-center gap-2 bg-[var(--bg-card)] text-[var(--action-info-bg)] px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
                    >
                      <QrCode size={18} />
                      Mark with QR
                    </Link>
                  </div>
                </div>
              </div>

              {/* Insight/Alert Card */}
              <div className="bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-main)]">{t("student_dashboard.stats.need_classes_title", { count: 3 })}</h3>
                  <p className="text-xs text-[var(--text-body)]/80 mt-1 leading-relaxed">
                    {t("student_dashboard.stats.need_classes_desc", { count: 3, percent: 80 })}
                  </p>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Schedule List */}
            <div>
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-lg font-bold text-[var(--text-main)]">{t("student_dashboard.schedule.today")}</h3>
                <span className="text-xs font-medium text-[var(--text-body)]/70">{currentDate}</span>
              </div>

              <div className="space-y-3">
                {schedule.map((item) => (
                  <div key={item.id} className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-color)] shadow-sm flex items-center justify-between group hover:border-[var(--primary)]/20 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Timeline Line Visual */}
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <div className={`w-2 h-2 rounded-full ${item.status === "Present" ? "bg-[var(--success)]" : item.status === "Absent" ? "bg-[var(--danger)]" : "bg-[var(--border-color)]"}`}></div>
                        <div className="w-0.5 h-8 bg-[var(--border-color)]/50 group-last:hidden"></div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-body)]/70 font-medium uppercase tracking-wide">
                          <Clock size={10} />
                          {item.time}
                        </div>
                        <h4 className="text-sm font-bold text-[var(--text-main)] mt-0.5">{item.subject}</h4>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {item.status === "Present" && (
                        <span className="px-3 py-1 rounded-full bg-[var(--success)]/15 text-[var(--success)] text-xs font-bold">{t("student_dashboard.schedule.status_present")}</span>
                      )}
                      {item.status === "Absent" && (
                        <span className="px-3 py-1 rounded-full bg-[var(--danger)]/15 text-[var(--danger)] text-xs font-bold">{t("student_dashboard.schedule.status_absent")}</span>
                      )}
                      {item.status === "Upcoming" && (
                        <span className="px-3 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-body)]/80 text-xs font-bold">{t("student_dashboard.schedule.status_upcoming")}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State / End of List Decor */}
              <div className="text-center mt-6">
                <p className="text-xs text-[var(--text-body)]/70">{t("student_dashboard.schedule.all_caught_up")}</p>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* --- MOBILE BOTTOM NAVIGATION (Visible only on Mobile) --- */}

    </div>
  );
}
