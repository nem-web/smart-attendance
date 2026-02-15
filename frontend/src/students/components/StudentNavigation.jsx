import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, BookOpen, TrendingUp, User, CircleUser, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

/* ---------------------- DESKTOP NAV ITEM ---------------------- */
// eslint-disable-next-line no-unused-vars
function DesktopItem({ icon: IconComponent, label, active, path }) {
  return (
    <Link
      to={path}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <IconComponent size={20} />
      {label}
    </Link>
  );
}

/* ---------------------- MOBILE NAV ITEM ---------------------- */
// eslint-disable-next-line no-unused-vars
function MobileItem({ icon: IconComponent, label, active, path }) {
  return (
    <Link
      to={path}
      className={`flex flex-col items-center gap-1 transition-colors ${
        active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      <div className={`p-1.5 rounded-xl ${active ? "bg-blue-50" : ""}`}>
        <IconComponent size={20} strokeWidth={active ? 2.5 : 2} />
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

/* ---------------------- MAIN NAVIGATION ---------------------- */
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
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col fixed h-full z-10">
        <div className="p-6 flex items-center gap-3">
          <img className="w-14 h-14 rounded-full" src="logo.png" alt="" />
          <span className="font-bold text-lg tracking-tight">{t('student_dashboard.nav.app_name')}</span>
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

        <div className="flex items-center justify-between p-4 border-t border-gray-100 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <CircleUser size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold">{username}</p>
              <p className="text-xs text-gray-500">{t('student_dashboard.nav.student_role')}</p>
            </div>
          </div>
          <div className="logout">
            <LogOut className="cursor-pointer"  onClick={()=>{
              localStorage.setItem("user", null);
              navigate("/");
            }}/>
          </div>
        </div>

      </aside>

      {/* MOBILE BOTTOM NAVBAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 pb-6 flex justify-between items-center z-50">
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
