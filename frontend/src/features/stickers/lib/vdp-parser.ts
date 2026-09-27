import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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

export async function parseVdpFile(file: File): Promise<VdpDataset> {
  const name = file.name.toLowerCase();

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
  // رأس الصفحة لا يهمنا — papaparse يستنتج الفاصل تلقائياً
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: 'greedy',
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error('تعذّر قراءة ملف CSV — تأكد من صياغته');
  }

  return buildDataset(result.data, file.name);
}

async function parseExcelFile(file: File): Promise<VdpDataset> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('ملف Excel فارغ');

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
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

  // عناوين الأعمدة: نص غير فارغ، وإلا "عمود N"
  const headerRow = rawRows[0].map((cell, i) => {
    const trimmed = String(cell ?? '').trim();
    return trimmed || `عمود ${i + 1}`;
  });

  const columns = headerRow.filter(
    (h, i) =>
      h !== `عمود ${i + 1}` || rawRows.slice(1).some((r) => String(r[i] ?? '').trim() !== ''),
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
