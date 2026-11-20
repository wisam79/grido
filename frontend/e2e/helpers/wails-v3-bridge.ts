import { deflateSync } from 'node:zlib';

import type { Page } from '@playwright/test';

// Deterministic 800x600 RGBA fixture. Dimensions, decoding and backend metadata
// agree; the old corrupt/1px placeholder did not exercise a real image canvas.
function fixturePNG(): Buffer {
  const crc32 = (bytes: Buffer) => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const name = Buffer.from(type);
    const header = Buffer.alloc(4);
    header.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([header, name, data, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(800, 0);
  header.writeUInt32BE(600, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = Buffer.alloc((800 * 4 + 1) * 600);
  for (let y = 0; y < 600; y++) {
    for (let x = 0; x < 800; x++) {
      const offset = y * (800 * 4 + 1) + 1 + x * 4;
      const inside = x >= 40 && x < 760 && y >= 40 && y < 560;
      pixels[offset] = inside ? 30 : 245;
      pixels[offset + 1] = inside ? 110 : 245;
      pixels[offset + 2] = inside ? 170 : 245;
      pixels[offset + 3] = 255;
    }
  }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
export const MOCK_RAW_PNG = fixturePNG();
export const MOCK_PNG_BASE64 = `data:image/png;base64,${MOCK_RAW_PNG.toString('base64')}`;

export const MOCK_USER_PROFILE = {
  id: 'e2e-user-id',
  name: 'E2E Tester',
  email: 'e2e-test@grido.app',
  plan: 'pro',
  token: 'e2e-mock-token-12345',
  refreshToken: 'e2e-refresh-token',
  createdAt: '2026-01-01T00:00:00Z',
  expiresAt: '2030-01-01T00:00:00Z',
  licenseKey: 'GRIDO-PRO-E2E-TEST-KEY',
  status: 'active',
  updatedAt: '2026-01-01T00:00:00Z',
};

export interface MockProject {
  id: string;
  name: string;
  mode: string;
  canvasWidth: number;
  canvasHeight: number;
  elements: string;
  slots: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

// Explicit saved-user fixtures, NOT discontinued built-in/official presets.
export const MOCK_CUSTOM_TEMPLATES = [
  { id: 1, name: 'طقم سفر', rows: 1, cols: 2 },
  { id: 2, name: 'طقم تقديم', rows: 2, cols: 2 },
  { id: 3, name: 'طقم عائلي', rows: 2, cols: 3 },
].map(({ id, name, rows, cols }) => ({
  id,
  name,
  slots: rows * cols,
  cells: JSON.stringify(
    Array.from({ length: rows * cols }, (_, index) => ({
      x: (index % cols) / cols,
      y: Math.floor(index / cols) / rows,
      w: 1 / cols,
      h: 1 / rows,
    })),
  ),
  metadata: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}));

export const MOCK_PROJECTS: MockProject[] = [
  {
    id: 'mock-proj-1',
    name: 'مشروع اختباري أول',
    mode: 'single',
    canvasWidth: 2480,
    canvasHeight: 3508,
    backgroundColor: '#ffffff',
    elements: '[]',
    slots: '[]',
    template: '',
    collageTemplate: '',
    printSettings: '',
    editorState: '',
    userGuides: '[]',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

export interface MockLedger {
  fixtureKind: 'mocked-wails';
  rpc: Array<{
    object: number;
    method: number;
    methodID?: number;
    name?: string;
    args: unknown[];
    result?: unknown;
    error?: string;
  }>;
  errors: string[];
  projects: MockProject[];
}
interface BridgeState {
  ledger: MockLedger;
  handlers: Record<number, (...args: any[]) => any>;
}
const bridges = new WeakMap<Page, BridgeState>();
export function getMockLedger(page: Page): MockLedger | undefined {
  return bridges.get(page)?.ledger;
}

function statefulHandlers(projects: MockProject[]) {
  const templates = structuredClone(MOCK_CUSTOM_TEMPLATES);
  let autosave = '';
  let clipboard = '';
  let phoneRunning = false;
  let phoneSession = 0;
  return {
    2446384535: async (project: MockProject) => {
      if (!project?.id || !project.name || !Array.isArray(JSON.parse(project.elements))) {
        throw new Error('SaveProject requires an identified, named serialized document');
      }
      const saved = structuredClone(project);
      const index = projects.findIndex((candidate) => candidate.id === project.id);
      const now = new Date().toISOString();
      saved.createdAt = index >= 0 ? projects[index].createdAt : now;
      saved.updatedAt = now;
      if (index >= 0) projects[index] = saved;
      else projects.push(saved);
      return 'success';
    },
    1640193742: async () =>
      projects.map((project) => ({
        ...structuredClone(project),
        elements: '',
        slots: '',
        template: '',
        collageTemplate: '',
        editorState: '',
      })),
    71630846: async (id: string) =>
      structuredClone(projects.find((project) => project.id === id) ?? null),
    4228529901: async (id: string) => {
      const index = projects.findIndex((project) => project.id === id);
      if (index < 0) throw new Error(`Project ${id} not found`);
      projects.splice(index, 1);
      return 'success';
    },
    2659213342: async () => {
      projects.splice(0);
      return 'success';
    },
    1522265743: async () => structuredClone(templates),
    1411792440: async (name: string, slots: number, cells: string, metadata = '') => {
      const id = Math.max(0, ...templates.map((template) => template.id)) + 1;
      templates.push({
        id,
        name,
        slots,
        cells,
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return id;
    },
    1013443833: async (name: string, slots: number, cells: string) => {
      const id = Math.max(0, ...templates.map((template) => template.id)) + 1;
      templates.push({
        id,
        name,
        slots,
        cells,
        metadata: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return id;
    },
    1006108175: async (id: number) => {
      const index = templates.findIndex((template) => template.id === id);
      if (index < 0) throw new Error(`Template ${id} not found`);
      templates.splice(index, 1);
    },
    2863230114: async (value: string) => {
      autosave = value;
    },
    1086724551: async () => autosave,
    485242536: async () => {
      autosave = '';
    },
    966799716: async (value: string) => {
      clipboard = value;
    },
    345087440: async () => clipboard,
    93234400: async () => {
      phoneRunning = true;
      phoneSession++;
      return {
        ip: '127.0.0.1',
        port: 8741,
        token: `mock-token-${phoneSession}`,
        url: `http://127.0.0.1:8741/cam?token=mock-token-${phoneSession}`,
        isRunning: true,
      };
    },
    1794026154: async () => ({
      isRunning: phoneRunning,
      url: '',
      receivedCount: 0,
      lastReceived: '',
      pairedDevice: '',
    }),
    1433752998: async () => {
      phoneRunning = false;
    },
  };
}

/**
 * خريطة استدعاءات Wails v3 عبر معرّفات الدوال الرقمية ($Call.ByID)
 * مستخرجة من frontend/bindings/grido/**
 */
export const WAILS_V3_METHOD_HANDLERS: Record<number, (...args: any[]) => any> = {
  // ── App bindings (frontend/bindings/grido/app.ts) ──
  3084559015: async () => MOCK_PNG_BASE64, // ApplyMaskRaw
  2977102455: async () => MOCK_PNG_BASE64, // ApplyMaskToImage
  1696913149: async () => '/local-image/mock_bg_removed.png', // RemoveBackground
  3948031462: async () => undefined, // WarmupBgRemoval
  2347956003: async () => ({
    has_update: false,
    current_version: 'v1.0.0',
    latest_version: 'v1.0.0',
    download_url: '',
    release_notes: '',
  }), // CheckForUpdate
  2320258599: async () => null, // CheckPendingCrashReport (لا يوجد انهيار سابق في الاختبار)
  3605864796: async () => ({ cleaned: 0 }), // CleanUnusedMediaNow
  3363530620: async () => ({ deletedCount: 0, freedBytes: 0 }), // EmptyMediaTrash
  485242536: async () => undefined, // ClearAutoSave
  1006108175: async () => undefined, // DeleteCustomTemplate
  2108673700: async () => undefined, // DismissCrashReport
  2440793480: async () => undefined, // DownloadAndInstallUpdate
  // EnhanceImageWithAI يعيد JSON بنفس عقد الخادم الحقيقي ({image, execution_seconds,
  // total_cost_usd} — مرآة internal/service/ai_service_test.go:146) — سلسلة خام
  // كانت تُسقط مسار الترميم في JSON.parse فلا تُطبَّق نتيجة قط في E2E
  2111291824: async () =>
    JSON.stringify({ image: MOCK_PNG_BASE64, execution_seconds: 1.2, total_cost_usd: 0.0012 }),
  2950359501: async () => 'C:/mock/logs.txt', // ExportSupportLogs
  4177774687: async (paths: string[]) => {
    // GetBatchImageDimensions
    const res: Record<string, { width: number; height: number }> = {};
    for (const p of paths || []) res[p] = { width: 800, height: 600 };
    return res;
  },
  345087440: async () => '', // GetClipboardText
  1522265743: async () => MOCK_CUSTOM_TEMPLATES, // GetCustomTemplates
  // 🔑 توكن جلسة مسارات /api المحلية — قيمة ثابتة في E2E (لا Backend حقيقي يفرضها)
  1585336687: async () => 'e2e-local-api-session-token', // GetLocalApiToken
  143340993: async () => ({ width: 800, height: 600 }), // GetImageDimensions
  896689433: async () => ({ count: 1, size_bytes: 1024 }), // GetMediaStorageStats
  1794026154: async () => ({ isRunning: false, url: '', receivedCount: 0, lastReceived: '' }), // GetPhoneBridgeStatus
  3709429484: async () => [], // GetScreensInfo
  3983598326: async () => '', // GetStartupFile
  984446249: async () => '[]', // LoadAiUsageLogs
  1086724551: async () => '', // LoadAutoSave
  514392429: async () => undefined, // LogFrontendError
  1188724780: async () => ['C:/mock/dir'], // OpenDirectoryDialog
  1958968983: async () => MOCK_PNG_BASE64, // OpenFile
  3894305329: async () => undefined, // OpenFolderInExplorer
  3132122792: async () => [MOCK_PNG_BASE64], // OpenMultipleFiles
  1049178424: async () => undefined, // OpenPath
  3192268814: async () => 1, // RequestGracefulQuit
  4162449642: async () => true, // RespondGracefulQuit
  2892812386: async () => undefined, // SaveAiUsageLogs
  2863230114: async () => undefined, // SaveAutoSave
  1013443833: async () => 'success', // SaveCustomTemplate
  1411792440: async () => 'success', // SaveCustomTemplateWithMetadata
  1166008166: async () => 'C:/mock/saved.png', // SaveFileDialog
  211586642: async () => '/local-image/saved-b64.png', // SaveImageFromBase64
  3958356690: async () => 'C:/mock/export', // SelectExportDirectory
  2207617336: async () => undefined, // SendNotification
  966799716: async () => undefined, // SetClipboardText
  1338676276: async () => undefined, // SetProgressBar
  1225131967: async () => undefined, // ShowItemInFolder
  93234400: async () => ({
    ip: '127.0.0.1',
    port: 8741,
    token: 'mock-token',
    url: 'http://127.0.0.1:8741',
    isRunning: true,
  }), // StartPhoneBridge
  1433752998: async () => undefined, // StopPhoneBridge

  // ── LicenseHandler bindings (frontend/bindings/grido/internal/handlers/licensehandler.ts) ──
  1507354738: async () => MOCK_USER_PROFILE, // ActivateLicenseKey
  2824574168: async () => MOCK_USER_PROFILE, // GetLicenseStatus
  4008420485: async () => MOCK_USER_PROFILE, // LoginAccount
  3777204317: async () => MOCK_USER_PROFILE, // LoginWithGoogle
  2529001923: async () => 'success', // Logout
  844537991: async () => MOCK_USER_PROFILE, // RegisterAccount
  2733599319: async () => MOCK_USER_PROFILE, // ResendOTP
  952907889: async () => 'success', // ResetPassword
  3668504133: async () => MOCK_USER_PROFILE, // VerifyOTP
  874821600: async () => MOCK_USER_PROFILE, // VerifyRecoveryOTP

  // ── ProjectHandler bindings (frontend/bindings/grido/internal/handlers/projecthandler.ts) ──
  4228529901: async () => 'success', // DeleteProject
  1640193742: async () => MOCK_PROJECTS, // GetAllProjects
  71630846: async () => MOCK_PROJECTS[0] || null, // GetProject
  2446384535: async () => 'success', // SaveProject

  // ── BackupHandler bindings (frontend/bindings/grido/internal/handlers/backuphandler.ts) ──
  1327210012: async () => 'C:/mock/backup.zip', // ExportBackup
  3760965235: async () => undefined, // ExportBackupToFile
  1499912742: async () => 'C:/mock/backup.json', // ExportBackupToPath
  824902195: async () => 'success', // ImportBackup
  2659213342: async () => 'success', // ResetLibrary
  377054365: async () => 'success', // ResetSettings

  // ── PrintHandler bindings (frontend/bindings/grido/internal/handlers/printhandler.ts) ──
  2204090549: async () => undefined, // CancelSpoolJob
  334009393: async () => ({
    success: true,
    imagePath: 'C:/mock/sheet.png',
    filePath: 'C:/mock/sheet.png',
  }), // ExportPrintSheet
  100771007: async () => ({ success: true, filePath: 'C:/mock/sheet.png' }), // PrintNative
  1916660602: async () => ({
    success: true,
    printers: [
      { name: 'Brother DCP-T520W', isDefault: true },
      { name: 'EPSON L805 Series', isDefault: false },
      { name: 'Microsoft Print to PDF', isDefault: false },
    ],
  }), // GetPrinters
  657414139: async () => 'Brother DCP-T520W', // GetDefaultPrinterName
  2929786627: async () => ({ success: true }), // OpenPrinterPreferences
  2075115632: async () => ({
    success: true,
    papers: [
      { id: 9, name: 'A4', widthMM: 210, heightMM: 297, isBorderless: false },
      { id: 256, name: 'A4 Borderless', widthMM: 210, heightMM: 297, isBorderless: true },
    ],
  }), // GetSupportedPapers
  1373740449: async () => ({
    success: true,
    jobId: 1,
    status: 'Completed',
    code: 'COMPLETED',
    terminal: true,
    error: '',
  }), // PollJobStatus
  1268920029: async () => ({ success: true, jobId: 1, status: 'Spooling' }), // PrintDirect
  1144725046: async (req: {
    printerName?: string;
    formName?: string;
    paperId?: number;
    paperWidthMM?: number;
    paperHeightMM?: number;
    borderless?: boolean;
  }) => ({
    success: true,
    requestedFormName: req.formName ?? '',
    requestedPaperId: req.paperId ?? 0,
    appliedFormName: req.formName ?? 'A4',
    appliedPaperId: req.paperId ?? 9,
    paperWidthMM: req.paperWidthMM ?? 210,
    paperHeightMM: req.paperHeightMM ?? 297,
    printableWidthMM: req.paperWidthMM ?? 210,
    printableHeightMM: req.paperHeightMM ?? 297,
    printableOffsetXMM: 0,
    printableOffsetYMM: 0,
    scale: 1,
    fallbackReason: '',
  }), // ResolvePrinterPlan
  2833362764: async () => undefined, // CancelActivePrintJobs
  1965354225: async () => undefined, // CancelPrintJob
};

/** Names are the generated bindings, not guessed RPC labels. */
export const WAILS_METHOD_NAMES: Record<number, string> = {
  '3084559015': 'ApplyMaskRaw',
  '2977102455': 'ApplyMaskToImage',
  '2347956003': 'CheckForUpdate',
  '2320258599': 'CheckPendingCrashReport',
  '3605864796': 'CleanUnusedMediaNow',
  '485242536': 'ClearAutoSave',
  '1006108175': 'DeleteCustomTemplate',
  '2108673700': 'DismissCrashReport',
  '2440793480': 'DownloadAndInstallUpdate',
  '3363530620': 'EmptyMediaTrash',
  '2111291824': 'EnhanceImageWithAI',
  '2950359501': 'ExportSupportLogs',
  '345087440': 'GetClipboardText',
  '1522265743': 'GetCustomTemplates',
  '143340993': 'GetImageDimensions',
  '1585336687': 'GetLocalApiToken',
  '896689433': 'GetMediaStorageStats',
  '1794026154': 'GetPhoneBridgeStatus',
  '3709429484': 'GetScreensInfo',
  '3983598326': 'GetStartupFile',
  '984446249': 'LoadAiUsageLogs',
  '1086724551': 'LoadAutoSave',
  '514392429': 'LogFrontendError',
  '1188724780': 'OpenDirectoryDialog',
  '1958968983': 'OpenFile',
  '3894305329': 'OpenFolder',
  '3132122792': 'OpenMultipleFiles',
  '1049178424': 'ProcessLocalImageFile',
  '1696913149': 'RemoveBackground',
  '3192268814': 'RequestGracefulQuit',
  '4162449642': 'RespondGracefulQuit',
  '2892812386': 'SaveAiUsageLogs',
  '2863230114': 'SaveAutoSave',
  '1013443833': 'SaveCustomTemplate',
  '1411792440': 'SaveCustomTemplateWithMetadata',
  '1166008166': 'SaveFileDialog',
  '211586642': 'SaveImageFromBase64',
  '3958356690': 'SelectExportDirectory',
  '2207617336': 'SendNotification',
  '966799716': 'SetClipboardText',
  '1338676276': 'SetTaskbarProgress',
  '1225131967': 'ShowInFolder',
  '93234400': 'StartPhoneBridge',
  '1433752998': 'StopPhoneBridge',
  '3948031462': 'WarmupBgRemoval',
  '1327210012': 'ExportBackup',
  '3760965235': 'ExportBackupToFile',
  '1499912742': 'ExportBackupToPath',
  '824902195': 'ImportBackup',
  '2659213342': 'ResetLibrary',
  '377054365': 'Startup',
  '1507354738': 'ActivateLicenseKey',
  '2824574168': 'GetLicenseStatus',
  '4008420485': 'LoginAccount',
  '3777204317': 'LoginWithGoogle',
  '2529001923': 'Logout',
  '844537991': 'RegisterAccount',
  '2733599319': 'ResendOTP',
  '952907889': 'ResetPassword',
  '3668504133': 'VerifyOTP',
  '874821600': 'VerifyRecoveryOTP',
  '2833362764': 'CancelActivePrintJobs',
  '1965354225': 'CancelPrintJob',
  '2204090549': 'CancelSpoolJob',
  '334009393': 'ExportPrintSheet',
  '657414139': 'GetDefaultPrinterName',
  '1916660602': 'GetPrinters',
  '2075115632': 'GetSupportedPapers',
  '2929786627': 'OpenPrinterPreferences',
  '1373740449': 'PollJobStatus',
  '1268920029': 'PrintDirect',
  '100771007': 'PrintNative',
  '1144725046': 'ResolvePrinterPlan',
  '4228529901': 'DeleteProject',
  '1640193742': 'GetAllProjects',
  '71630846': 'GetProject',
  '2446384535': 'SaveProject',
  '4177774687': 'GetBatchImageDimensions',
};

// Explicit runtime controls used by the compatibility wrapper. Unlisted
// objects/methods are contract failures, not a blanket successful true result.
const RUNTIME_CONTROLS: Record<string, { name: string; value: unknown }> = {
  '1:0': { name: 'Clipboard.SetText', value: null },
  '1:1': { name: 'Clipboard.Text', value: '' },
  '2:2': { name: 'Application.Quit', value: null },
  '3:0': { name: 'Events.Emit', value: null },
  '6:0': { name: 'Window.Position', value: { x: 0, y: 0 } },
  '6:14': { name: 'Window.IsMaximised', value: false },
  '6:17': { name: 'Window.Minimise', value: null },
  '6:24': { name: 'Window.SetPosition', value: null },
  '6:33': { name: 'Window.SetSize', value: null },
  '6:37': { name: 'Window.Size', value: { width: 1280, height: 800 } },
  '6:39': { name: 'Window.ToggleMaximise', value: null },
  '6:49': { name: 'Window.SnapAssist', value: null },
  '8:0': { name: 'System.IsDarkMode', value: false },
  '8:1': { name: 'System.Environment', value: { OS: 'linux', Arch: 'amd64' } },
  '10:0': { name: 'CancelCall.Cancel', value: null },
};

/** Mocked browser integration only. Nothing here starts Go or writes a file. */
export async function setupWailsV3Bridge(
  page: Page,
  customHandlers?: Record<number, (...args: any[]) => any>,
) {
  const existing = bridges.get(page);
  if (existing) {
    Object.assign(existing.handlers, customHandlers);
    return existing.ledger;
  }
  const projects = structuredClone(MOCK_PROJECTS);
  const ledger: MockLedger = { fixtureKind: 'mocked-wails', rpc: [], errors: [], projects };
  const handlers: Record<number, (...args: any[]) => any> = {
    ...WAILS_V3_METHOD_HANDLERS,
    ...statefulHandlers(projects),
    ...customHandlers,
  };
  bridges.set(page, { ledger, handlers });
  const chunksByID = new Map<string, { total: number; chunks: Buffer[] }>();

  await page.route('**/wails/runtime', async (route) => {
    let entry: MockLedger['rpc'][number] | undefined;
    try {
      const request = route.request();
      if (request.method() !== 'POST') throw new Error('Runtime requires POST');
      const headers = request.headers();
      const chunkId = headers['x-wails-chunk-id'];
      let payload;
      if (chunkId) {
        const index = Number(headers['x-wails-chunk-index']);
        const total = Number(headers['x-wails-chunk-total']);
        if (
          !Number.isInteger(index) ||
          !Number.isInteger(total) ||
          total < 1 ||
          total > 1024 ||
          index < 0 ||
          index >= total
        )
          throw new Error('Invalid runtime chunk headers');
        const state = chunksByID.get(chunkId) ?? { total, chunks: [] };
        if (state.total !== total || state.chunks.length !== index)
          throw new Error('Runtime chunks missing, duplicated or out of order');
        const bytes = request.postDataBuffer();
        if (!bytes) throw new Error('Empty runtime chunk');
        state.chunks.push(bytes);
        chunksByID.set(chunkId, state);
        if (index < total - 1) return await route.fulfill({ json: true });
        chunksByID.delete(chunkId);
        payload = JSON.parse(Buffer.concat(state.chunks).toString('utf8'));
      } else payload = request.postDataJSON();
      const object = payload?.object;
      const method = payload?.method;
      const rpcArgs = payload?.args;
      entry = { object, method, args: [] };
      ledger.rpc.push(entry);
      let result: unknown;
      if (
        object === 0 &&
        method === 0 &&
        typeof rpcArgs?.methodID === 'number' &&
        Array.isArray(rpcArgs.args)
      ) {
        entry.methodID = rpcArgs.methodID;
        entry.name = WAILS_METHOD_NAMES[rpcArgs.methodID];
        entry.args = structuredClone(rpcArgs.args);
        const handler = handlers[rpcArgs.methodID];
        if (!handler) throw new Error(`Unknown Wails methodID ${rpcArgs.methodID}`);
        result = await handler(...rpcArgs.args);
      } else {
        const control = RUNTIME_CONTROLS[`${object}:${method}`];
        if (!control) throw new Error(`Unknown runtime control ${object}:${method}`);
        entry.name = control.name;
        entry.args = [rpcArgs ?? null];
        result = control.value;
      }
      entry.result = structuredClone(result ?? null);
      await route.fulfill({ json: result ?? null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (entry) entry.error = message;
      ledger.errors.push(message);
      // Fatal in teardown even if production catches the visible rejection.
      // Never mask malformed/unknown RPC with HTTP200 null.
      await route.fulfill({ status: 501, json: { kind: 'RuntimeError', message } });
    }
  });
  await page.route('**/local-image/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: MOCK_RAW_PNG }),
  );
  await page.addInitScript(() => {
    localStorage.setItem('grido_workflow_mode', 'studio');
    // Desktop detection only. All bindings use the audited v3 HTTP path;
    // no divergent legacy window.go handlers bypass the ledger.
    Object.defineProperty(window, 'wails', {
      value: { fixtureKind: 'mocked-wails' },
      configurable: true,
    });
  });
  return ledger;
}

/**
 * دالة انتظار قياسية لجاهزية مساحة عمل التطبيق في Playwright
 */
export async function waitForAppReady(page: Page, timeout = 20000) {
  // انتظار الكانفس الرئيسي أو الغلاف العام لمساحة العمل
  await page
    .locator('#canvas-area')
    .or(page.getByTestId('workspace-canvas-shell'))
    .first()
    .waitFor({
      state: 'visible',
      timeout,
    });
}
