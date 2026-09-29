/**
 * مولّد طبقة الأيقونات المركزية (Size-Aware Fluent Icon Layer)
 * ─────────────────────────────────────────────────────────────
 * المشكلة: كانت كل أيقونة تُستورَد بنسخة Fluent الواحدة غير المحدّدة المقاس
 * (شبكة 20×20 بقابلية تمدد) ثم يُصغّرها CSS إلى 12/14/16/24/40px، ما يُنتج
 * خطوطاً تحت-بكسلية تبدو رفيعة ومبكسلة.
 *
 * الحل: لكل أيقونة نستورد نسخ Fluent الأصلية للشبكات التي يستخدمها التطبيق
 * فعلاً (12/16/20/24/28/32/48)، وتختار الطبقة وقت العرض النسخة المطابقة
 * لمقاس العرض المطلوب بدل تصغير شبكة واحدة.
 *
 * الاستخدام:
 *   node scripts/generate-icons.mjs           # توليد فعلي
 *   node scripts/generate-icons.mjs --dry     # معاينة بدون كتابة
 *   node scripts/generate-icons.mjs --report  # تقرير مفصّل لكل أيقونة
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ICONS_PATH = join(ROOT, 'src/components/ui/icons.tsx');
const SRC = join(ROOT, 'src');

const GRIDS = [12, 16, 20, 24, 28, 32, 48];
const WEIGHTS = ['Regular', 'Filled'];

const require = createRequire(import.meta.url);
const fluentNames = new Set(Object.keys(require('@fluentui/react-icons')));
const has = (name) => fluentNames.has(name);
const aliasFor = (realName) => `_${realName}`;

/** يحوّل بكسل إلى أقرب شبكة (التعادل يفضّل الأكبر لأنها أوضح) */
function snapGrid(px, available) {
  let best = available[0];
  for (const g of available) {
    const d = Math.abs(g - px);
    const bd = Math.abs(best - px);
    if (d < bd || (d === bd && g > best)) best = g;
  }
  return best;
}

/* ── كود وقت العرض المُولَّد ─────────────────────────────────────────────── */
const RUNTIME = `interface Def {
  /** شبكات Fluent الأصلية المتوفرة لهذه الأيقونة: [Regular, Filled] */
  [grid: number]: readonly [Icon, Icon | undefined] | undefined;
}

function isFilled(weight?: IconWeight): boolean {
  return weight === 'fill' || weight === 'bold' || weight === 'duotone';
}

/** الشبكات الأصلية التي صُمم عليها Fluent System Icons (بكسل) */
export const FLUENT_ICON_GRIDS = [12, 16, 20, 24, 28, 32, 48] as const;
/** حجم احتياطي يطابق قاعدة Button: [&_svg:not([class*='size-'])]:size-4 */
export const FALLBACK_ICON_PX = 16;

/** تقريب أي عرض إلى أقرب شبكة أصلية (التعادل يفضّل الأكبر) */
export function snapToFluentGrid(px: number): number {
  let best: number = FLUENT_ICON_GRIDS[0];
  for (const g of FLUENT_ICON_GRIDS) {
    const d = Math.abs(g - px);
    const bestD = Math.abs(best - px);
    if (d < bestD || (d === bestD && g > best)) best = g;
  }
  return best;
}

/**
 * يقرأ العرض المطلوب من أصناف Tailwind (w-4 / size-4 / w-[18px]) — مع تخزين
 * مؤقت لأن الأصناف ثابتة عملياً وتتكرر مئات المرات في كل إطار رسم.
 */
const pxClassCache = new Map<string, number | null>();
export function requestedPxFromClassName(className?: string): number | null {
  if (!className) return null;
  const cached = pxClassCache.get(className);
  if (cached !== undefined) return cached;

  let px: number | null = null;
  const spaced = className.match(/(?<![\\w-])(?:w|h|size)-(\\d+(?:\\.\\d+)?)(?![\\w-])/);
  if (spaced) px = Number(spaced[1]) * 4;
  if (px === null) {
    const arbitrary = className.match(/(?<![\\w-])(?:w|h|size)-\\[([\\d.]+)px\\]/);
    if (arbitrary) px = Number(arbitrary[1]);
  }
  pxClassCache.set(className, px);
  return px;
}

/**
 * أصناف ثابتة (نصّية) كي يكتشفها ماسح Tailwind — الأصناف المبنية ديناميكياً
 * لا تُولَّد في CSS. تحافظ على مربع العرض = الشبكة المختارة، وتحتوي "size-"
 * كي تتخطاها قاعدة Button التي تفرض size-4 على أي svg بلا صنف مقاس.
 */
const GRID_BOX_CLASS: Record<number, string> = {
  12: 'size-3',
  16: 'size-4',
  20: 'size-5',
  24: 'size-6',
  28: 'size-7',
  32: 'size-8',
  48: 'size-12',
};

export function alignIconBox(className: string | undefined, grid: number): string {
  const withoutSize = (className ?? '')
    .replace(
      /(?<![\\w-])(?:[\\w-]+:)*!?(?:w|h|size)-(?:\\d+(?:\\.\\d+)?|\\[[\\d.]+px\\])/g,
      ' ',
    )
    .replace(/\\s+/g, ' ')
    .trim();
  const box = GRID_BOX_CLASS[grid] ?? 'size-4';
  return withoutSize ? \`\${box} \${withoutSize}\` : box;
}

function createIcon(def: Def): Icon {
  // الشبكات المتوفرة تُحسب مرة واحدة عند إنشاء المكوّن — كانت تُبنى وتُرتَّب
  // داخل جسم المكوّن في كل إعادة رسم لكل أيقونة (تخصيصات بلا داعٍ).
  const grids = Object.keys(def)
    .map(Number)
    .sort((a, b) => a - b);

  /** يختار أنسب شبكة متوفرة لهذه الأيقونة */
  function pickGrid(requestedPx: number | null): number {
    if (grids.length === 0) return FALLBACK_ICON_PX;
    if (grids.length === 1) return grids[0];
    const target = requestedPx ?? FALLBACK_ICON_PX;
    let best = grids[0];
    for (const g of grids) {
      const d = Math.abs(g - target);
      const bestD = Math.abs(best - target);
      if (d < bestD || (d === bestD && g > best)) best = g;
    }
    return best;
  }

  const Comp: Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size, weight, color, mirrored, style, className, ...rest },
    ref,
  ) {
    const ctx = React.useContext(IconContext);
    const resolvedWeight = weight ?? ctx.weight ?? DEFAULT_CONTEXT.weight;
    const resolvedColor = color ?? ctx.color;

    const pxHint =
      typeof size === 'number'
        ? size
        : typeof size === 'string' && /^\\d+$/.test(size)
          ? Number(size)
          : (requestedPxFromClassName(className) ??
            (typeof ctx.size === 'number' ? ctx.size : requestedPxFromClassName(ctx.size)));

    const grid = pickGrid(pxHint);
    const pair = def[grid] ?? def[FALLBACK_ICON_PX] ?? def[grids[0]];
    const R = pair?.[0];
    const F = pair?.[1];
    if (!R) return null;

    const C = isFilled(resolvedWeight) ? (F ?? R) : R;
    return React.createElement(C, {
      ...rest,
      ref,
      className: alignIconBox(className, grid),
      primaryFill: resolvedColor,
      style: mirrored
        ? { ...style, transform: \`scaleX(-1) \${style?.transform ?? ''}\`.trim() }
        : style,
    });
  });
  return Comp;
}

`;

/* ── 1. قراءة الطبقة الحالية ─────────────────────────────────────────────── */
const source = readFileSync(ICONS_PATH, 'utf8');

const aliasToReal = new Map();
for (const m of source.matchAll(/^\s*([A-Za-z0-9_]+) as (_[A-Za-z0-9_]+),$/gm)) {
  aliasToReal.set(m[2], m[1]);
}
if (aliasToReal.size === 0) throw new Error('لم يتم العثور على استيرادات Fluent في icons.tsx');

/** يستخرج القاعدة (مثل DocumentText) من اسم Fluent كامل (DocumentText16Regular) */
function baseFromRealName(realName) {
  for (const g of [...GRIDS].sort((a, b) => b - a)) {
    for (const w of WEIGHTS) {
      const suffix = `${g}${w}`;
      if (realName.endsWith(suffix)) return realName.slice(0, -suffix.length);
    }
  }
  for (const w of WEIGHTS) {
    if (realName.endsWith(w)) return realName.slice(0, -w.length);
  }
  return realName;
}

// يدعم الصيغتين: { R: _X, F: _Y } (القديمة) و{ 16: [_X16R, _X16F], … } (المُولَّدة)
const defs = [];
for (const m of source.matchAll(/export const (\w+): Icon = createIcon\(([\s\S]*?)\);/g)) {
  const aliases = [...m[2].matchAll(/(_[A-Za-z0-9]+)/g)].map((a) => a[1]);
  if (aliases.length === 0) throw new Error(`لا توجد أسماء Fluent للأيقونة ${m[1]}`);
  const realName = aliasToReal.get(aliases[0]);
  if (!realName) throw new Error(`alias مجهول للأيقونة ${m[1]}: ${aliases[0]}`);
  defs.push({ name: m[1], base: baseFromRealName(realName) });
}
if (defs.length === 0) throw new Error('لم يتم العثور على تعريفات createIcon');

/* ── 2. مسح الاستخدامات الفعلية ──────────────────────────────────────────── */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}
const files = walk(SRC).map((path) => ({ path, code: readFileSync(path, 'utf8') }));

function requestedPx(code, iconName) {
  const px = [];
  const jsx = new RegExp(`<${iconName}(?=[\\s/>])([^>]{0,400})`, 'g');
  for (const m of code.matchAll(jsx)) {
    const attrs = m[1];
    const sizeAttr = attrs.match(/\bsize=\{(\d+)\}|\bsize="(\d+)"/);
    if (sizeAttr) px.push(Number(sizeAttr[1] ?? sizeAttr[2]));
    const cls = attrs.match(/className="([^"]*)"/)?.[1] ?? '';
    for (const t of cls.matchAll(/(?<![\w-])(?:w|h|size)-(\d+(?:\.\d+)?)(?![\w-])/g)) {
      px.push(Number(t[1]) * 4);
    }
    for (const t of cls.matchAll(/(?<![\w-])(?:w|h|size)-\[([\d.]+)px\]/g)) {
      px.push(Number(t[1]));
    }
  }
  return px;
}

/**
 * المراجع الديناميكية (`icon: X` / `Icon: X`) — ماسح JSX أعلاه يرى الوسوم فقط،
 * وسجلات الأدوات تحقن الأيقونات كقيم بيانات (شريط الأدوات يرسمها size-5 = 20px،
 * ومجموعات النصوص/التكرار ترسمها 16px) فلا يراها. نعدّ كل مرجع مستهلكاً
 * للشبكتين الشائعتين (16 الاحتياطية و20) — تكلفة شبكة إضافية بدل انكماش صامت.
 */
function referencedPx(code, iconName) {
  const pattern = new RegExp(`\\b(?:icon|Icon)\\s*[:=]\\s*\\{?\\s*${iconName}(?![\\w$])`);
  return pattern.test(code) ? [16, 20] : [];
}

for (const def of defs) {
  const available = GRIDS.filter((g) => WEIGHTS.some((w) => has(`${def.base}${g}${w}`)));
  if (available.length === 0) throw new Error(`لا توجد نسخ متاحة للقاعدة ${def.base}`);

  let usage = [];
  for (const f of files) {
    if (!f.code.includes(def.name)) continue;
    usage = usage.concat(requestedPx(f.code, def.name), referencedPx(f.code, def.name));
  }

  const needed = new Set();
  for (const px of usage) needed.add(snapGrid(px, available));
  if (needed.size === 0) {
    // أيقونة بلا أي استخدام نصّي مرئي (اختيار ديناميكي بالكامل عبر مفاتيح أخرى)
    needed.add(snapGrid(20, available));
  } else {
    // أمان لمستهلكين ديناميكيين غير مكتشَفين بالماسح: شبكة 16 هي الحجم
    // الاحتياطي الافتراضي (FALLBACK_ICON_PX) وشبكة 20 مقاس شريط الأدوات.
    if (Math.min(...needed) <= 20) needed.add(snapGrid(16, available));
    if (Math.max(...needed) > 20) needed.add(snapGrid(20, available));
  }

  def.available = available;
  def.usage = [...new Set(usage)].sort((a, b) => a - b);
  def.grids = [...needed].sort((a, b) => a - b);
}

/* ── 3. بناء الاستيرادات ─────────────────────────────────────────────────── */
const importNames = new Set();
for (const def of defs) {
  for (const g of def.grids) {
    for (const w of WEIGHTS) {
      const real = `${def.base}${g}${w}`;
      if (has(real)) importNames.add(real);
    }
  }
}
const importLines = [...importNames]
  .sort((a, b) => a.localeCompare(b))
  .map((n) => `  ${n} as ${aliasFor(n)},`)
  .join('\n');

/* ── 4. تعديل الملف ─────────────────────────────────────────────────────── */
let out = source;

const HEADER = `/* GENERATED FILE — central icon layer replacing @phosphor-icons/react with @fluentui/react-icons. Do not edit by hand.
 *
 * سياسة الدقة (Icon Resolution Policy):
 * كل أيقونة تُرسم بنسخة Fluent الأصلية المطابقة لمقاس العرض المطلوب بدل تصغير
 * شبكة واحدة، لأن تصغير شبكة 20 إلى 12/14/16px يُنتج خطوطاً تحت-بكسلية تبدو
 * رفيعة ومبكسلة. المصدر الحقيقي للمقاس هو صنف Tailwind (w-4 / size-4) أو خاصية
 * \`size\`، والمقاسات خارج شبكات Fluent (12/16/20/24/28/32/48) تُقرَّب لأقرب شبكة.
 *
 * لإعادة التوليد: npm run icons:generate
 */`;
out = out.replace(/^\/\* GENERATED FILE[\s\S]*?\*\//, HEADER);

const importBlockRe = /import \{[\s\S]*?\} from '@fluentui\/react-icons';/;
if (!importBlockRe.test(out)) throw new Error('لم يتم العثور على كتلة استيراد Fluent');
out = out.replace(importBlockRe, `import {\n${importLines}\n} from '@fluentui/react-icons';`);

const runtimeStart = out.indexOf('interface Def {');
const runtimeEnd = out.indexOf('export const CircleNotch: Icon = React.forwardRef');
if (runtimeStart < 0 || runtimeEnd < 0 || runtimeEnd < runtimeStart) {
  throw new Error('لم يتم العثور على منطقة createIcon');
}
out = out.slice(0, runtimeStart) + RUNTIME + out.slice(runtimeEnd);

for (const def of defs) {
  const variantMap = `{ ${def.grids
    .map((g) => {
      const r = has(`${def.base}${g}Regular`) ? aliasFor(`${def.base}${g}Regular`) : 'undefined';
      const f = has(`${def.base}${g}Filled`) ? aliasFor(`${def.base}${g}Filled`) : 'undefined';
      return `${g}: [${r}, ${f}]`;
    })
    .join(', ')} }`;
  const match = out.match(
    new RegExp(`export const ${def.name}: Icon = createIcon\\(\\{[\\s\\S]*?\\}\\);`),
  );
  if (!match) throw new Error(`لم يتم العثور على تعريف ${def.name}`);
  out = out.replace(match[0], `export const ${def.name}: Icon = createIcon(${variantMap});`);
}

if (!process.argv.includes('--dry')) writeFileSync(ICONS_PATH, out);

/* ── 5. تقرير ───────────────────────────────────────────────────────────── */
const variants = defs.reduce((sum, d) => sum + d.grids.length, 0);
const multi = defs.filter((d) => d.grids.length > 1);
console.log(
  `أيقونات: ${defs.length} | استيرادات Fluent: ${importNames.size} | نسخ شبكات: ${variants}`,
);
console.log(`شبكة واحدة: ${defs.length - multi.length} | متعددة الشبكات: ${multi.length}`);
const renamed = defs.filter((d) => !d.available.includes(16));
console.log(`قواعد بلا شبكة 16: ${renamed.length}`);
if (process.argv.includes('--report')) {
  for (const d of defs) {
    console.log(
      `  ${d.name.padEnd(26)} base=${d.base.padEnd(26)} used=[${d.usage.join(',')}] → grids=[${d.grids.join(',')}] avail=[${d.available.join(',')}]`,
    );
  }
}
console.log(
  `تم ${process.argv.includes('--dry') ? 'المعاينة' : 'التوليد'} → ${relative(ROOT, ICONS_PATH)}`,
);
