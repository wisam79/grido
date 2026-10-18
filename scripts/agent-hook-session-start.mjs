import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Grido Studio — Antigravity SessionStart Lifecycle Hook
 * Injects project environment status and safety reminder when a new conversation starts.
 */
function main() {
  try {
    const root = process.cwd();
    // Resolve project root whether CWD is .agents or project root
    const projectRoot = existsSync(join(root, 'changelog')) ? root : join(root, '..');
    const fragDir = join(projectRoot, 'changelog', 'fragments');

    let msg =
      '🛡️ بيئة Grido Studio المخصصة نشطة ومحمية. تذكير: خطافات دورة الحياة البرمجية (.agents/hooks.json) تمنع آلياً أوامر cd و Playwright المحلي وتجاوز الـ hooks (--no-verify). بوابة التوثيق (docs-gate) إلزامية.';

    if (existsSync(fragDir)) {
      const files = readdirSync(fragDir).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
      if (files.length > 0) {
        msg += ` يوجد حالياً ${files.length} fragment(s) في changelog/fragments/ غير مُصدرة.`;
      } else {
        msg += ' لا توجد fragments معلقة في changelog/fragments/.';
      }
    }

    const response = {
      injectSteps: [
        {
          systemMessage: {
            systemMessage: msg,
          },
        },
      ],
    };

    process.stdout.write(JSON.stringify(response));
  } catch (_err) {
    process.stdout.write(JSON.stringify({ injectSteps: [] }));
  }
}

main();
