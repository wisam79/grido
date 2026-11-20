// Report-only merge configuration. No tests, webServer, runtime or credentials.
// Explicit testDir lets Playwright normalize Windows/Linux/config root paths.
export default {
  testDir: '../..',
  reporter: [['html', { open: 'never' }], ['json'], ['junit']],
};
