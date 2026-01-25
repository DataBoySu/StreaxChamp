import { useEffect, useState } from 'react';

export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Function to detect Reddit's theme
    const detectTheme = () => {
      // Check for Reddit's data-theme attribute
      const redditTheme = document.documentElement.getAttribute('data-theme');
      if (redditTheme === 'dark' || redditTheme === 'light') {
        setTheme(redditTheme);
        return;
      }

      // Check for Reddit's class-based theme
      const isDark =
        document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark') ||
        document.documentElement.classList.contains('theme-dark');

      if (isDark) {
        setTheme('dark');
        return;
      }

      // Fallback to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    };

    // Initial detection
    detectTheme();

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')
        ) {
          detectTheme();
        }
      });
    });

    // Observe changes to html and body elements
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => detectTheme();
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  return theme;
};
