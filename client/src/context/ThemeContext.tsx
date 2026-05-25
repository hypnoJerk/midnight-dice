import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';
type Preset = 'green' | 'amber';

interface ThemeContextType {
  theme: Theme;
  preset: Preset;
  toggleTheme: () => void;
  togglePreset: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(
    (localStorage.getItem('midnight_theme') as Theme) || 'dark'
  );
  const [preset, setPreset] = useState<Preset>(
    (localStorage.getItem('midnight_preset') as Preset) || 'green'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('midnight_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-preset', preset);
    localStorage.setItem('midnight_preset', preset);
  }, [preset]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const togglePreset = () => {
    setPreset(prev => (prev === 'green' ? 'amber' : 'green'));
  };

  return (
    <ThemeContext.Provider value={{ theme, preset, toggleTheme, togglePreset }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
