import { Sun, Moon } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "Dark";

  return (
    <button
      onClick={() => toggle(isDark ? "Light" : "Dark")}
      className="p-2 rounded-full hover:bg-[var(--bg-secondary)] transition"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun size={18} className="text-slate-400" />
      ) : (
        <Moon size={18} className="text-slate-400" />
      )}
    </button>
  );
}
