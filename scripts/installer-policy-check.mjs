#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const installerPath = resolve(root, 'build/windows/installer/project.nsi');
const source = readFileSync(installerPath);
const text = source.toString('utf8');
const errors = [];

if (source[0] !== 0xef || source[1] !== 0xbb || source[2] !== 0xbf) {
  errors.push('project.nsi يجب أن يبقى بترميز UTF-8 BOM');
}

const uninstall = text.match(/Section\s+"uninstall"([\s\S]*?)SectionEnd/i)?.[1];
if (!uninstall) {
  errors.push('تعذّر العثور على Section "uninstall" في السكربت الحاكم');
} else {
  const destructiveDataPatterns = [
    /RMDir\s+\/r\s+"?\$APPDATA\\GridoStudio"?/i,
    /RMDir\s+\/r\s+"?\$LOCALAPPDATA\\GridoStudio"?/i,
  ];
  if (destructiveDataPatterns.some((pattern) => pattern.test(uninstall))) {
    errors.push('uninstall يحذف بيانات GridoStudio من AppData');
  }
  if (!/RMDir\s+\/r\s+\$INSTDIR/i.test(uninstall)) {
    errors.push('uninstall لا يحذف مجلد البرنامج');
  }
  for (const required of [
    /Delete\s+"\$SMPROGRAMS\\\$\{INFO_PRODUCTNAME\}\.lnk"/i,
    /Delete\s+"\$DESKTOP\\\$\{INFO_PRODUCTNAME\}\.lnk"/i,
    /wails\.unassociateFiles/i,
    /wails\.unassociateCustomProtocols/i,
  ]) {
    if (!required.test(uninstall)) errors.push(`عقد تنظيف البرنامج مفقود: ${required}`);
  }
}

for (const required of [
  /Function\s+PreserveLegacyUserData/i,
  /Function\s+RestoreLegacyUserData/i,
  /Rename\s+"\$APPDATA\\GridoStudio"\s+"\$APPDATA\\GridoStudio\.__migration_backup"/i,
  /Rename\s+"\$LOCALAPPDATA\\GridoStudio"\s+"\$LOCALAPPDATA\\GridoStudio\.__migration_backup"/i,
  /Call\s+PreserveLegacyUserData[\s\S]*?nsExec::ExecToStack[\s\S]*?Call\s+RestoreLegacyUserData/i,
]) {
  if (!required.test(text)) errors.push(`حماية ترحيل uninstaller القديم مفقودة: ${required}`);
}

if (errors.length > 0) {
  console.error('❌ فشل فحص سياسة إزالة NSIS:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('✅ سياسة إزالة NSIS سليمة: بيانات المستخدم محفوظة وتنظيف البرنامج باقٍ.');
