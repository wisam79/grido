#!/usr/bin/env node
/**
 * commit-msg-lint.mjs — مدقق رسائل الالتزام (Conventional Commits 1.0.0)
 *
 * الاستخدام:
 *   node scripts/commit-msg-lint.mjs .git/COMMIT_EDITMSG
 *   node scripts/commit-msg-lint.mjs --range origin/main..HEAD
 *
 * لا يعتمد على أي حزمة خارجية حتى يبقى الخطاف سريعاً ويعمل بلا npm install.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ALLOWED_TYPES = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'release',
  'revert',
  'security',
  'style',
  'test',
];

const HEADER_RE =
  /^(build|chore|ci|docs|feat|fix|perf|refactor|release|revert|security|style|test)(?:\([a-z0-9][a-z0-9-]*\))?!?: \S.*$/;
const MAX_HEADER_LENGTH = 120;
const SKIP_RE = /^(Merge |Revert "|fixup! |squash! |amend! )/;

function cleanMessage(raw) {
  return raw
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('#'))
    .join('\n')
    .trim();
}

function validateMessage(raw, label) {
  const message = cleanMessage(raw);
  if (!message) return [`${label}: الرسالة فارغة.`];
  if (SKIP_RE.test(message)) return [];

  const header = message.split('\n')[0].trim();
  const problems = [];
  if (header.length > MAX_HEADER_LENGTH) {
    problems.push(
      `${label}: العنوان أطول من ${MAX_HEADER_LENGTH} حرفاً (${header.length}).`,
    );
  }
  if (!HEADER_RE.test(header)) {
    problems.push(
      `${label}: لا تتبع Conventional Commits.\n` +
        `    العنوان: ${header}\n` +
        `    الصيغة: type(scope): وصف\n` +
        `    الأنواع المسموحة: ${ALLOWED_TYPES.join(', ')}\n` +
        `    مثال: fix(print): تصحيح محاذاة خط القص`,
    );
  }
  return problems;
}

function messagesFromRange(range) {
  const output = execFileSync('git', ['log', '--format=%H%x00%B%x00', range], {
    encoding: 'utf8',
  });
  const parts = output.split('\0');
  const messages = [];
  for (let index = 0; index + 1 < parts.length; index += 2) {
    const hash = parts[index].trim();
    if (!hash) continue;
    messages.push({ label: hash.slice(0, 8), raw: parts[index + 1] });
  }
  return messages;
}

const args = process.argv.slice(2);
const rangeIndex = args.indexOf('--range');

let messages;
if (rangeIndex !== -1) {
  const range = args[rangeIndex + 1];
  if (!range) {
    console.error('commit-msg-lint: --range يتطلب مدى صالحاً (مثل origin/main..HEAD).');
    process.exit(2);
  }
  messages = messagesFromRange(range);
} else if (args[0]) {
  try {
    messages = [{ label: args[0], raw: readFileSync(args[0], 'utf8') }];
  } catch (error) {
    console.error(`commit-msg-lint: تعذّر قراءة ملف الرسالة: ${error.message}`);
    process.exit(2);
  }
} else {
  console.error('الاستخدام: node scripts/commit-msg-lint.mjs <commit-msg-file> | --range <git-range>');
  process.exit(2);
}

const problems = messages.flatMap(({ label, raw }) => validateMessage(raw, label));
if (problems.length) {
  console.error('\n✖ رسائل الالتزام غير مطابقة للمعيار:\n');
  for (const problem of problems) console.error(`  - ${problem}\n`);
  console.error(`  الأنواع المسموحة: ${ALLOWED_TYPES.join(', ')}`);
  process.exit(1);
}

console.log(`✔ رسائل الالتزام سليمة (${messages.length}).`);
