import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { User, ChevronDown, Menu, X, Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeContext";
import NotificationDropdown from "./NotificationDropdown";

/** Navigation link definitions for the main header. */
const navLinks = [
  { to: "/dashboard", label: "overview" },
  { to: "/attendance", label: "attendance" },
  { to: "/students", label: "students" },
  { to: "/analytics", label: "analytics" },
  { to: "/reports", label: "reports" },
  { to: "/manage-schedule", label: "schedule" },
  { to: "/messaging", label: "messaging" },
];

export default function Header() {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const isDark = theme === "Dark";

  const [user] = useState(() => {
    const storedData = localStorage.getItem("user");
    if (storedData) {
        try {
            return JSON.parse(storedData);
        } catch {
            return null;
        }
    }
    return null;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [location.pathname]);

  const displayName = user?.name || user?.email || "Guest";
  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--bg-card)] shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg text-[var(--text-body)] hover:bg-[var(--bg-secondary)]"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-3">
            <img className="w-10 h-10 rounded-full" src="/logo.png" alt="Logo" />
            <h1 className="text-xl font-bold text-[var(--text-main)] hidden sm:block">
              Smart Attendance
            </h1>
          </Link>
        </div>

        {/* Center */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                isActive(link.to)
                  ? "text-[var(--primary)] bg-[var(--action-info-bg)]/10"
                  : "text-[var(--text-body)] hover:text-[var(--primary)] hover:bg-[var(--bg-secondary)]"
              }`}
            >
              {t(`nav.${link.label}`)}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Language */}
          <div className="flex items-center gap-2 mr-2" role="group" aria-label="Language selection">
            <button
              onClick={() => i18n.changeLanguage("en")}
              className={i18n.language === "en" ? "font-bold text-[var(--primary)]" : "text-[var(--text-body)]"}
              aria-label="Switch to English"
              aria-pressed={i18n.language === "en"}
            >
              English
            </button>
            <span className="text-[var(--border-color)]" aria-hidden="true">|</span>
            <button
              onClick={() => i18n.changeLanguage("hi")}
              className={i18n.language === "hi" ? "font-bold text-[var(--primary)]" : "text-[var(--text-body)]"}
              aria-label="Switch to Hindi"
              aria-pressed={i18n.language === "hi"}
            >
              हिंदी
            </button>
          </div>

          {/* Notification Dropdown */}
          <NotificationDropdown />

          {/* Theme Toggle */}
          <button
            onClick={() => toggle(isDark ? "Light" : "Dark")}
            className="p-2 rounded-full hover:bg-[var(--bg-secondary)]"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={18} className="text-slate-400" /> : <Moon size={18} className="text-slate-400" />}
          </button>

          {/* Profile */}
          <Link
            to="/settings"
            className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--bg-secondary)]"
          >
            <User size={20} className="text-[var(--text-body)]" />
            <span className="text-sm font-medium text-[var(--text-main)]">{displayName}</span>
            <ChevronDown size={16} className="text-[var(--text-body)]" />
          </Link>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav 
          id="mobile-menu"
          className="lg:hidden bg-[var(--bg-card)] px-4 pb-4 pt-2 space-y-1"
          role="navigation"
          aria-label="Mobile navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`block px-4 py-2.5 rounded-lg text-sm font-semibold ${
                isActive(link.to)
                  ? "text-[var(--primary)] bg-[var(--action-info-bg)]/10"
                  : "text-[var(--text-body)] hover:text-[var(--primary)] hover:bg-[var(--bg-secondary)]"
              }`}
            >
              {t(`nav.${link.label}`)}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
