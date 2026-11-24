if (typeof window !== 'undefined') {
  (window as unknown as { process: { env: Record<string, string> } }).process = { env: {} };
}

try {
  const savedMode = localStorage.getItem('grido-theme-mode') || localStorage.getItem('grido-theme');
  const mode =
    savedMode === 'system' || savedMode === 'dark' || savedMode === 'light' ? savedMode : 'system';
  const isDark =
    mode === 'system'
      ? (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true)
      : mode === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
} catch {
  // safe-mode browsers throw on localStorage access; keep default theme
}
