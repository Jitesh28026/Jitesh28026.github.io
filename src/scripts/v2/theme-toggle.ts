/**
 * V2 theme toggle.
 * The initial theme is set pre-paint by an inline script in <head>
 * (time-based default, or a saved manual preference). This module only
 * wires the manual toggle + persists the choice.
 */

const KEY = 'v2-theme';

function currentTheme(): 'light' | 'dark' {
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light';
}

function label(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
}

function apply(theme: 'light' | 'dark', persist: boolean): void {
  document.documentElement.setAttribute('data-theme', theme);
  if (persist) {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* storage may be unavailable (private mode) — ignore */
    }
  }
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-label', label(theme));
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
  });
}

function init(): void {
  // Sync button labels to whatever the inline script already applied.
  apply(currentTheme(), false);

  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      apply(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
