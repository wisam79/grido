import { readFileSync } from 'node:fs';

/**
 * Grido Studio — Antigravity PreToolUse Lifecycle Hook
 * Enforces absolute safety invariants on run_command:
 * 1. Hard-blocks any command attempting to run `cd`.
 * 2. Hard-blocks running heavy E2E tests (Playwright) locally.
 * 3. Hard-blocks any attempt to bypass git verification hooks (--no-verify).
 */
function main() {
  try {
    const rawInput = readFileSync(0, 'utf-8');
    if (!rawInput.trim()) {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
      return;
    }

    const payload = JSON.parse(rawInput);
    const toolName = payload?.toolCall?.name;
    const cmd = payload?.toolCall?.args?.CommandLine || '';

    if (toolName === 'run_command' && typeof cmd === 'string') {
      // 1. Prohibit `cd` command strictly (standalone, chained, or prefixed)
      const cdRegex = /(?:^|[;&|\r\n]\s*)\bcd(?:\.exe)?(?:\s+|$)/i;
      if (cdRegex.test(cmd)) {
        const response = {
          decision: 'deny',
          reason:
            '❌ حظر أمني معماري: أمر "cd" محظور قطعياً في استوديو Grido وفق دستور المشروع (.agents/AGENTS.md). حدد مسار العمل دائماً عبر المعامل Cwd أو المسارات المطلقة.',
        };
        process.stdout.write(JSON.stringify(response));
        return;
      }

      // 2. Prohibit heavy local Playwright / E2E execution to protect host machine
      const playwrightRegex = /\b(?:npx\s+)?playwright\s+test\b/i;
      if (playwrightRegex.test(cmd)) {
        const response = {
          decision: 'deny',
          reason:
            '❌ حظر إجهاد الجهاز المحلي: يُمنع تشغيل اختبارات E2E (Playwright) محلياً وفق دستور المشروع (.agents/AGENTS.md). التحقق يتم حصراً بدفع الكود ومراقبة دورة الـ CI السحابية عبر gh run list و gh run watch.',
        };
        process.stdout.write(JSON.stringify(response));
        return;
      }

      // 3. Prohibit bypassing git hooks (--no-verify / -n)
      const noVerifyRegex = /\bgit\s+(?:commit|push)\b.*(?:\s--no-verify|\s-n\b)/i;
      if (noVerifyRegex.test(cmd)) {
        const response = {
          decision: 'deny',
          reason:
            '❌ حظر تجاوز الفحوصات: يُمنع إجبارياً استخدام --no-verify أو -n لتجاوز بوابات التوثيق وفحص المراجع الصارم في استوديو Grido.',
        };
        process.stdout.write(JSON.stringify(response));
        return;
      }
    }

    // Default: allow all compliant commands
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  } catch (_err) {
    // Fail-safe: allow rather than breaking the agent loop if stdin is unexpected
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  }
}

main();
