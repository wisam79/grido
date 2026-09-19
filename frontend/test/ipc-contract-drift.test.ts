import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { WAILS_V3_METHOD_HANDLERS, MOCK_USER_PROFILE, MOCK_PROJECTS } from '../e2e/helpers/wails-v3-bridge';

/**
 * 🛡️ اختبار حماية عقود الـ IPC من الانحراف (IPC Contract Drift Test)
 * 
 * يضمن هذا الاختبار مطابقة جسر المحاكاة لجميع دوال Wails v3 المولدة
 * من كود Go Backend، مما يمنع حدوث أي فجوة أو انهيار غير مكتشف في الـ E2E.
 */
describe('Wails v3 IPC Contract Integrity & Drift Guard', () => {
  const bindingsDir = path.resolve(__dirname, '../bindings/grido');

  // دالة مساعدة لجمع كل ملفات الـ TypeScript في مجلد الـ Bindings
  function collectBindingFiles(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(collectBindingFiles(fullPath));
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it('All generated Wails v3 methods ($Call.ByID) must have corresponding handlers in wails-v3-bridge', () => {
    const bindingFiles = collectBindingFiles(bindingsDir);
    expect(bindingFiles.length).toBeGreaterThan(0);

    const callPattern = /\$Call\.ByID\((\d+)/g;
    const extractedMethodIds = new Set<number>();
    const methodLocations = new Map<number, string>();

    for (const filePath of bindingFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      let match;
      while ((match = callPattern.exec(content)) !== null) {
        const id = parseInt(match[1], 10);
        extractedMethodIds.add(id);
        const relPath = path.relative(bindingsDir, filePath);
        methodLocations.set(id, relPath);
      }
    }

    expect(extractedMethodIds.size).toBeGreaterThan(10);

    const registeredIds = new Set(Object.keys(WAILS_V3_METHOD_HANDLERS).map(Number));
    const missingHandlers: { id: number; file: string }[] = [];

    for (const id of extractedMethodIds) {
      if (!registeredIds.has(id)) {
        missingHandlers.push({ id, file: methodLocations.get(id) || 'unknown' });
      }
    }

    if (missingHandlers.length > 0) {
      const details = missingHandlers.map((m) => `ID ${m.id} in ${m.file}`).join(', ');
      throw new Error(`Missing mock handlers in wails-v3-bridge for generated methods: [${details}]`);
    }

    expect(missingHandlers).toHaveLength(0);
  });

  it('Core licensing handlers return valid signed Pro profile', async () => {
    // 2824574168: GetLicenseStatus
    // 1507354738: ActivateLicenseKey
    const getStatusHandler = WAILS_V3_METHOD_HANDLERS[2824574168];
    expect(getStatusHandler).toBeDefined();

    const statusResult = await getStatusHandler();
    expect(statusResult).toBeDefined();
    expect(statusResult.plan).toBe('pro');
    expect(statusResult.status).toBe('active');
    expect(statusResult.token).toBeTruthy();
    expect(statusResult.licenseKey).toBeTruthy();
  });

  it('Core project handlers return valid projects schema', async () => {
    // 1640193742: GetAllProjects
    // 2446384535: SaveProject
    const getAllHandler = WAILS_V3_METHOD_HANDLERS[1640193742];
    expect(getAllHandler).toBeDefined();

    const projects = await getAllHandler();
    expect(Array.isArray(projects)).toBe(true);
    if (projects.length > 0) {
      expect(projects[0]).toHaveProperty('id');
      expect(projects[0]).toHaveProperty('name');
      expect(projects[0]).toHaveProperty('preview');
    }
  });

  it('Core print export handlers return valid file paths', async () => {
    // 334009393: ExportPrintSheet
    // 100771007: PrintNative
    const exportHandler = WAILS_V3_METHOD_HANDLERS[334009393];
    expect(exportHandler).toBeDefined();

    const result = await exportHandler({ paperWidthMM: 210, paperHeightMM: 297, dpi: 300 });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.filePath).toBeTruthy();
  });

  it('Phone bridge handlers return valid localhost endpoints and ports', async () => {
    // 93234400: StartPhoneBridge
    // 3709429484: GetPhoneBridgeStatus
    const startBridge = WAILS_V3_METHOD_HANDLERS[93234400];
    expect(startBridge).toBeDefined();

    const bridgeInfo = await startBridge();
    expect(bridgeInfo.isRunning).toBe(true);
    expect(bridgeInfo.port).toBe(8741);
    expect(bridgeInfo.url).toContain('8741');
  });
});
