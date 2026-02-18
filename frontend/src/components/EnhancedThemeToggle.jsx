import { Sun, Moon, TreePine, Zap } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";

export default function EnhancedThemeToggle({ position = "default" }) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const themes = [
    { name: "Light", icon: Sun, color: "text-yellow-600" },
    { name: "Dark", icon: Moon, color: "text-slate-400" },
    { name: "Forest", icon: TreePine, color: "text-green-600" },
    { name: "Cyber", icon: Zap, color: "text-purple-500" }
  ];

  const currentTheme = themes.find(t => t.name === theme) || themes[0];
  const Icon = currentTheme.icon;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const positionClasses = position === "absolute" 
    ? "absolute top-4 right-4 z-50" 
    : "relative";

  return (
    <div className={positionClasses} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] transition text-sm shadow-sm"
        title="Change theme"
      >
        <Icon size={16} className={currentTheme.color} />
        <span className="text-[var(--text-body)] font-medium">{theme}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg overflow-hidden z-50">
          {themes.map((t) => {
            const ThemeIcon = t.icon;
            return (
              <button
                key={t.name}
                onClick={() => {
                  setTheme(t.name);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition ${
                  theme === t.name
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold"
                    : "text-[var(--text-body)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                <ThemeIcon size={16} className={t.color} />
                {t.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

EnhancedThemeToggle.propTypes = {
  position: PropTypes.oneOf(["default", "absolute"]),
};
