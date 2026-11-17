import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'night' | 'light';

type ThemeContextValue = {
  theme: Theme;
  isNightMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = window.localStorage.getItem('hotelos-theme');
    return saved === 'light' ? 'light' : 'night';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('night', theme === 'night');
    document.documentElement.style.colorScheme = theme === 'night' ? 'dark' : 'light';
    window.localStorage.setItem('hotelos-theme', theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    isNightMode: theme === 'night',
    setTheme,
    toggleTheme: () => setTheme((current) => current === 'night' ? 'light' : 'night'),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
