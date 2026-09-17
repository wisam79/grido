if (typeof window !== 'undefined') {
  ;(window as unknown as { process: { env: Record<string, string> } }).process = { env: {} }
}

try {
  const savedTheme = localStorage.getItem('grido-theme') || 'dark'
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
} catch {
  // safe-mode browsers throw on localStorage access; keep default theme
}