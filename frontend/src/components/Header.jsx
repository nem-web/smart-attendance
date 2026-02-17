import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, User, ChevronDown, Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";

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

/**
 * Header component responsible for rendering the main navigation bar.
 *
 * @param {Object} props
 * @param {"light"|"dark"} props.theme - The current theme.
 * @param {Function} props.setTheme - Callback to update the theme.
 * @returns {React.ReactElement} The rendered header.
 */
export default function Header() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    try {
      const storedData = localStorage.getItem("user");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!storedData) { setUser(null); return; }
      setUser(JSON.parse(storedData));
    } catch (e) {
      console.error("Failed to parse user from local storage", e);
      setUser(null);
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [location.pathname]);

  const displayName = user?.name || user?.email || "Guest";

  /**
   * Checks whether the given path matches the current route.
   *
   * @param {string} path - The route path to check.
   * @returns {boolean} True if the path is the current route.
   */
  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--bg-card)] border-b border-[var(--border-color)] shadow-sm">
      {/* Main bar */}
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left: Logo + toggle */}
        <div className="flex items-center gap-3">
          {/* Mobile toggle button */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg text-[var(--text-body)] hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-3">
            <img className="w-10 h-10 rounded-full" src="/logo.png" alt="Logo" />
            <h1 className="text-xl font-bold text-[var(--text-main)] hidden sm:block">Smart Attendance</h1>
          </Link>
        </div>

        {/* Center: Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActive(link.to)
                  ? "text-[var(--primary)] bg-[var(--action-info-bg)]/10"
                  : "text-[var(--text-body)] hover:text-[var(--primary)] hover:bg-[var(--bg-secondary)]"
              }`}
            >
              {t(`nav.${link.label}`)}
            </Link>
          ))}
        </nav>

        {/* Right: Profile section */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center gap-2 mr-2">
            <button 
              onClick={() => i18n.changeLanguage('en')} 
              className={`text-sm transition-colors ${i18n.language === 'en' ? 'font-bold text-[var(--primary)]' : 'text-[var(--text-body)] hover:text-[var(--text-main)]'}`}
            >
              English
            </button>
            <span className="text-[var(--border-color)]">|</span>
            <button 
              onClick={() => i18n.changeLanguage('hi')} 
              className={`text-sm transition-colors ${i18n.language === 'hi' ? 'font-bold text-[var(--primary)]' : 'text-[var(--text-body)] hover:text-[var(--text-main)]'}`}
            >
              हिंदी
            </button>
          </div>

          <button
            type="button"
            disabled
            aria-label="Notifications"
            className="bg-[var(--primary)] p-1.5 rounded-full opacity-60"
          >
            <Bell size={16} className="text-[var(--text-on-primary)]" />
          </button>
          <Link
            to="/settings"
            className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label="Open settings"
          >
            <User size={20} className="text-[var(--text-body)]" />
            <span className="text-sm font-medium text-[var(--text-main)]">{displayName}</span>
            <ChevronDown size={16} className="text-[var(--text-body)]" />
          </Link>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Mobile navigation"
          className="lg:hidden border-t border-[var(--border-color)] bg-[var(--bg-card)] px-4 pb-4 pt-2 space-y-1 animate-in slide-in-from-top"
        >
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`block px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive(link.to)
                  ? "text-[var(--primary)] bg-[var(--action-info-bg)]/10"
                  : "text-[var(--text-body)] hover:text-[var(--primary)] hover:bg-[var(--bg-secondary)]"
              }`}
            >
              {t(`nav.${link.label}`)}
            </Link>
          ))}
          {/* Mobile-only profile link */}
          <Link
            to="/settings"
            className="sm:hidden flex items-center gap-2 px-4 py-2.5 border-t border-[var(--border-color)] mt-2 pt-3"
            aria-label="Open settings"
          >
            <User size={18} className="text-[var(--text-body)]" />
            <span className="text-sm font-medium text-[var(--text-main)]">{displayName}</span>
          </Link>
        </nav>
      )}
    </header>
  );
}
