import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext({
  theme: "light",
  themeMode: "system",
  toggleTheme: () => {},
  setThemeMode: () => {},
  setTheme: () => {},
});

/**
 * Resolves whether the system currently prefers dark mode.
 * @returns {"light" | "dark"}
 */
function getSystemPreference() {
  if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }) {
  // themeMode can be "light", "dark", or "system"
  const [themeMode, setThemeModeState] = useState(() => {
    try {
      const saved = localStorage.getItem("ff_theme_mode") || localStorage.getItem("ff_theme");
      if (saved === "dark" || saved === "light" || saved === "system") {
        return saved;
      }
    } catch {
      // fallback
    }
    return "system";
  });

  // Computed theme: "light" | "dark"
  const [theme, setTheme] = useState(() => {
    if (themeMode === "system") {
      return getSystemPreference();
    }
    return themeMode;
  });

  // Apply theme to DOM and persist
  const applyTheme = useCallback((resolvedTheme) => {
    setTheme(resolvedTheme);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", resolvedTheme);
      document.body.setAttribute("data-theme", resolvedTheme);
      // Ensure color-scheme CSS property matches for native scrollbars and controls
      document.documentElement.style.colorScheme = resolvedTheme;
    }
  }, []);

  // Update when themeMode changes
  useEffect(() => {
    try {
      localStorage.setItem("ff_theme_mode", themeMode);
      localStorage.setItem("ff_theme", themeMode === "system" ? getSystemPreference() : themeMode);
    } catch {
      // ignore storage errors
    }

    if (themeMode === "system") {
      applyTheme(getSystemPreference());
    } else {
      applyTheme(themeMode);
    }
  }, [themeMode, applyTheme]);

  // Listen for OS system theme changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      if (themeMode === "system") {
        applyTheme(e.matches ? "dark" : "light");
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [themeMode, applyTheme]);

  const setThemeMode = (mode) => {
    if (mode === "light" || mode === "dark" || mode === "system") {
      setThemeModeState(mode);
    }
  };

  const toggleTheme = () => {
    setThemeModeState((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme, setThemeMode, setTheme: setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
