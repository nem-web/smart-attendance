// frontend/src/theme/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();
const THEME_KEY = "smart_attendance_theme";
const THEMES = ["Light", "Dark", "Forest", "Cyber"];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const t = localStorage.getItem(THEME_KEY);
      return THEMES.includes(t) ? t : "Light";

    } catch {
      return "Light";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggle = (target) => {
    setTheme((prev) =>{
      if(target && THEMES.includes(target)) return target;

      const idx = THEMES.indexOf(prev);
      const nxtIndex = idx === -1 ? 0 : (idx + 1) % THEMES.length;
      return THEMES[nxtIndex];
    });
  }

  const value = {
    theme,
    setTheme,
    toggle
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);
