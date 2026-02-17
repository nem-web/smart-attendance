import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, BookOpen, TrendingUp, User, CircleUser, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";

function DesktopItem({ icon: Icon, label, active, path }) {
  return (
    <Link
      to={path}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${
        active
          ? "bg-[var(--action-info-bg)]/10 text-[var(--action-info-bg)] shadow-sm shadow-black/10"
          : "text-[var(--text-body)]/90 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-main)]"
      }`}
    >
      <Icon
        size={18}
        className={`transition-transform duration-200 ${
          active ? "scale-110" : "group-hover:scale-110"
        }`}
      />
      {label}
    </Link>
  );
}

DesktopItem.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  path: PropTypes.string.isRequired,
};

function MobileItem({ icon: Icon, label, active, path }) {
  return (
    <Link
      to={path}
      className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
        active ? "text-[var(--action-info-bg)]" : "text-[var(--text-body)]/70"
      }`}
    >
      <Icon size={20} />
      {label}
    </Link>
  );
}

MobileItem.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  path: PropTypes.string.isRequired,
};

export default function StudentNavigation({ activePage = "home" }) {
  const { t } = useTranslation();
  const [username] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored).name : "";
    } catch {
      return "";
    }
  });

  const navigate = useNavigate();

  const navItems = [
    { id: "home", label: t('student_dashboard.nav.home'), icon: Home, path: "/student-dashboard" },
    { id: "subjects", label: t('student_dashboard.nav.subjects'), icon: BookOpen, path: "/student-subjects" },
    { id: "forecast", label: t('student_dashboard.nav.forecast'), icon: TrendingUp, path: "/student-forecast" },
    { id: "profile", label: t('student_dashboard.nav.profile'), icon: User, path: "/student-profile" },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-[var(--bg-card)] border-r border-[var(--border-color)] flex-col fixed h-full z-10">
        <div className="p-6 flex items-center gap-3">
          <img className="w-14 h-14 rounded-full" src="logo.png" alt="" />
          <span className="font-bold text-lg tracking-tight text-[var(--text-main)]">{t('student_dashboard.nav.app_name')}</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map(item => (
            <DesktopItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              path={item.path}
              active={activePage === item.id}
            />
          ))}
        </nav>

        <div className="flex items-center justify-between p-4 border-t border-[var(--border-color)] mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--action-info-bg)]/10 text-[var(--action-info-bg)] flex items-center justify-center">
              <CircleUser size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold">{username}</p>
              <p className="text-xs text-[var(--text-body)]/80">{t('student_dashboard.nav.student_role')}</p>
            </div>
          </div>
          <div className="logout">
            <LogOut className="cursor-pointer text-[var(--text-body)]/80 hover:text-[var(--danger)] transition-colors" onClick={()=>{
              localStorage.setItem("user", null);
              navigate("/");
            }}/>
          </div>
        </div>

      </aside>

      {/* MOBILE BOTTOM NAVBAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-[var(--border-color)] px-6 py-3 pb-6 flex justify-between items-center z-50">
        {navItems.map(item => (
          <MobileItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            path={item.path}
            active={activePage === item.id}
          />
        ))}
      </div>

      <div className="md:hidden h-20"></div>
    </>
  );
}

StudentNavigation.propTypes = {
  activePage: PropTypes.string,
};
