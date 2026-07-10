'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  // Start with null so we don't render wrong icon before DOM check
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    // Read actual state from DOM (set by layout.tsx inline script)
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
  };

  // Don't render until we know the actual theme (avoids flash of wrong icon)
  if (theme === null) {
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
        flex items-center justify-center cursor-pointer text-slate-600 dark:text-slate-300
        hover:border-violet-500 hover:text-violet-500 dark:hover:border-violet-400 dark:hover:text-violet-400
        transition-all duration-200 active:scale-95"
    >
      <div className="relative w-5 h-5">
        {/* Sun — visible in light mode */}
        <svg
          className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
            theme === 'light'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 rotate-90 scale-50'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707
               M6.343 17.657l-.707.707m12.728 0l-.707-.707
               M6.343 6.343l-.707-.707
               m2.828 9.9a5 5 0 117.072 0 5 5 0 01-7.072 0z" />
        </svg>

        {/* Moon — visible in dark mode */}
        <svg
          className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
            theme === 'dark'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-50'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646
               9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </div>
    </button>
  );
}
