// 🚀 تحميل كسول (dynamic import) — كانت papaparse وxlsx تُسحبان إلى الحزمة
// الرئيسية عبر السلسلة الثابتة features/stickers ← index ← vdp-parser، فيحمّل
// المستخدم SheetJS (421KB) عند الإقلاع وإن لم يفتح الطباعة بالبيانات المتغيرة
// قط. الاستيراد هنا يجعل مكتبتي التفكيك chunk منفصلاً يُجلب عند أول ملف VDP.
import type { StickerParams } from '@/features/stickers';

/**
 * مُحلِّل الطباعة بالبيانات المتغيرة (VDP) — يقرأ Excel (xlsx/xls) أو CSV
 * ويحوّله إلى صفوف مفاتيح-قيم جاهزة للربط بحقول قالب الملصق.
 * القراءة كاملة على العميل — لا يُرفع أي ملف لأي خادم.
 */

export interface VdpDataset {
  /** أسماء الأعمدة كما وردت في الصف الأول */
  columns: string[];
  /** الصفوف كمفاتيح-قيم (القيم نصوص مُهذّبة، الخلايا الفارغة سلسلة فارغة) */
  rows: Record<string, string>[];
  /** اسم الملف المصدر للعرض في الواجهة */
  fileName: string;
}

/** سقف الصفوف — حماية من ملفات ضخمة تتجمد عليها الواجهة (بطاقات تُصيَّر بدفعات) */
export const VDP_MAX_ROWS = 500;

/**
 * سقف حجم الملف قبل القراءة إطلاقاً (حماية ذاكرة/معالج). البيانات المتغيرة
 * جداول نصوص — ملف أكبر من هذا ليس ملف بيانات مشروع واقعي.
 */
export const VDP_MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * سقف صفوف **التفكيك نفسه** (صف العناوين + صفوف البيانات) — يُمرَّر لمحرك
 * القراءة ليتوقف مبكراً بدل تفكيك ملف ضخم كاملاً في الذاكرة ثم قصّ النتيجة.
 */
export const VDP_PARSE_ROW_LIMIT = VDP_MAX_ROWS + 1;

/**
 * أسماء أعمدة ممنوعة: تُستخدم كمفاتيح كائنات الصفوف، فاسم مثل `__proto__`
 * يجعل الإسناد يلوّث النموذج الأولي (`Object.prototype`) — وهو نفس صنف ثغرة
 * SheetJS المعروفة بلا إصلاح متاح من npm (GHSA-4r6h-8v6p-xvw6).
 */
const DANGEROUS_COLUMN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export async function parseVdpFile(file: File): Promise<VdpDataset> {
  const name = file.name.toLowerCase();

  if (file.size > VDP_MAX_FILE_BYTES) {
    const maxMB = Math.round(VDP_MAX_FILE_BYTES / (1024 * 1024));
    throw new Error(`الملف كبير جداً — الحد ${maxMB} ميجابايت`);
  }

  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    return parseCsvFile(file);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseExcelFile(file);
  }
  throw new Error('صيغة غير مدعومة — استخدم CSV أو Excel (xlsx/xls)');
}

async function parseCsvFile(file: File): Promise<VdpDataset> {
  const text = await file.text();
  const { default: Papa } = await import('papaparse');
  // رأس الصفحة لا يهمنا — papaparse يستنتج الفاصل تلقائياً.
  // `preview` يوقف التفكيك عند سقف الصفوف بدل تحليل ملف ضخم كاملاً ثم قصّه.
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: 'greedy',
    preview: VDP_PARSE_ROW_LIMIT,
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error('تعذّر قراءة ملف CSV — تأكد من صياغته');
  }

  return buildDataset(result.data, file.name);
}

async function parseExcelFile(file: File): Promise<VdpDataset> {
  const buffer = await file.arrayBuffer();
  // xlsx يصدّر `read`/`utils` كنائج مسماة — لا default export
  const { read, utils } = await import('xlsx');
  // 🛡️ تقوية مسار التفكيك (لا نثق بشكل الملف):
  // - `sheetRows`: حد أقصى لصفوف التفكيك نفسه (بدل تفكيك كل الصفوف ثم قصّها).
  // - تعطيل الصيغ والأنماط و HTML و VBA: سطح هجوم أقل بلا أي فقدان للبيانات النصية.
  // - `dense`: تمثيل مُدمج أقل استهلاكاً للذاكرة في الأوراق الكبيرة.
  // ملاحظة: مكتبة `xlsx` من npm تحمل ثغرة تلوّث نموذج أولي بلا إصلاح متاح
  // (GHSA-4r6h-8v6p-xvw6، وReDoS في GHSA-5pgg-2g8v-p4x9)؛ هذا تخفيف للتأثير،
  // والإزالة الكاملة تتطلب نسخة SheetJS المصونة من cdn.sheetjs.com — انظر SECURITY_NOTICE.md.
  const workbook = read(buffer, {
    type: 'array',
    sheetRows: VDP_PARSE_ROW_LIMIT,
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
    cellNF: false,
    bookVBA: false,
    dense: true,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('ملف Excel فارغ');

  const sheet = workbook.Sheets[sheetName];
  const rows = utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false, // كل القيم نصوص — التواريخ والأرقام كما تُعرض في Excel
    defval: '',
    blankrows: false,
  });

  return buildDataset(rows as string[][], file.name);
}

/**
 * بناء مجموعة البيانات من مصفوفة صفوف خام (الصف الأول = العناوين).
 * مُصدَّر للاختبار مباشرة (منطق نقي بلا ملف) — الاستخدام الإنتاجي عبر parseVdpFile.
 */
export function buildDatasetForTest(rawRows: string[][]): VdpDataset {
  return buildDataset(rawRows, 'test');
}

/** يوحّد بناء مجموعة البيانات من مصفوفة صفوف خام (الصف الأول = العناوين) */
function buildDataset(rawRows: string[][], fileName: string): VdpDataset {
  if (rawRows.length === 0) throw new Error('الملف لا يحتوي بيانات');

  // عناوين الأعمدة: نص غير فارغ، وإلا "عمود N".
  // 🛡️ أي عنوان يطابق مفتاحاً خطيراً (`__proto__` …) يُعامل كعنوان بلا اسم —
  // لأنه يصير مفتاح إسناد في كائن الصف (`row[col] = value`).
  const seenHeaders = new Map<string, number>();
  const headerRow = rawRows[0].map((cell, i) => {
    const trimmed = String(cell ?? '').trim();
    let name = !trimmed || DANGEROUS_COLUMN_KEYS.has(trimmed) ? `عمود ${i + 1}` : trimmed;
    const count = seenHeaders.get(name) || 0;
    seenHeaders.set(name, count + 1);
    if (count > 0) {
      name = `${name} (${count + 1})`;
    }
    return name;
  });

  const columns = headerRow.filter(
    (h, i) =>
      !h.startsWith(`عمود ${i + 1}`) ||
      rawRows.slice(1).some((r) => String(r[i] ?? '').trim() !== ''),
  );

  const rows: Record<string, string>[] = [];
  for (const raw of rawRows.slice(1, VDP_MAX_ROWS + 1)) {
    const row: Record<string, string> = {};
    let hasValue = false;
    headerRow.forEach((col, i) => {
      const value = String(raw[i] ?? '').trim();
      if (value) hasValue = true;
      row[col] = value;
    });
    if (hasValue) rows.push(row);
  }

  if (rows.length === 0) throw new Error('الملف لا يحتوي صفوف بيانات');

  return { columns: columns.length > 0 ? columns : headerRow, rows, fileName };
}

/**
 * يملأ حقول قالب الملصق من صف بيانات وفق خريطة الأعمدة.
 * الأعمدة غير المرتبطة تُتجاهل؛ الحقول بلا عمود تبقى على قيمتها الحالية في params الأساس.
 */
export function applyRowToParams(
  base: StickerParams,
  mapping: Record<string, string>,
  row: Record<string, string>,
): StickerParams {
  const fields = { ...base.fields };
  for (const [fieldId, column] of Object.entries(mapping)) {
    if (column && row[column] !== undefined) {
      fields[fieldId] = row[column];
    }
  }
  return { ...base, fields };
}
