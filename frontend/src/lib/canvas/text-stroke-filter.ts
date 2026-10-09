/**
 * Utility to create and manage SVG filters for clean, artifact-free text outlines.
 * Uses morphological dilation (feMorphology operator="dilate") so that the stroke
 * wraps around the unified silhouette of connected letters (e.g. Arabic ligatures)
 * without slicing or distorting at character intersections.
 *
 * 🛡️ M18: كل فلتر يُبنى في الـ DOM مرة واحدة فقط لكل (radius, color) وتُحفظ
 * نتيجته في كاش على مستوى الوحدة. المشكلة كانت أن `sceneFunc` ينادي
 * `ensureTextStrokeFilter` في كل إطار سحب/زوم/تحويل (getElementById + بناء
 * عقد SVG لكل إطار). الآن النداء المتكرر O(1) بلا أي لمس للـ DOM.
 */

const SVG_CONTAINER_ID = 'grido-text-stroke-filters-container';

interface BuiltFilter {
  id: string;
  container: SVGSVGElement;
}

/** 🛡️ M18: الفلاتر المبنية فعلياً — المفتاح `${radius}|${color}` */
const builtFilters = new Map<string, BuiltFilter>();

export function getTextStrokeFilterId(radius: number, color: string): string {
  const cleanColor = color.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanRadius = Math.round(radius * 10) / 10;
  return `grido-text-stroke-${cleanRadius}-${cleanColor}`;
}

/**
 * يبني فلتر الحد المموّج مسبقاً من مسار الرندر (أو أي مسار غير sceneFunc)
 * ويعيد معرّفه. نداء متكرر بنفس الوسائط يعيد النتيجة من الكاش بلا بناء.
 */
export function warmTextStrokeFilter(radius: number, color: string): string {
  return ensureTextStrokeFilter(radius, color);
}

export function ensureTextStrokeFilter(radius: number, color: string): string {
  if (typeof document === 'undefined' || radius <= 0) return '';

  const cacheKey = `${radius}|${color}`;
  const cached = builtFilters.get(cacheKey);
  // 🛡️ M18: الفلتر مبني وحاويته ما زالت موصولة بالوثيقة — لا شيء يُبنى
  if (cached && cached.container.isConnected) return cached.id;

  const filterId = getTextStrokeFilterId(radius, color);

  let container = document.getElementById(SVG_CONTAINER_ID) as SVGSVGElement | null;
  if (!container) {
    container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    container.id = SVG_CONTAINER_ID;
    container.setAttribute('width', '0');
    container.setAttribute('height', '0');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.pointerEvents = 'none';
    container.style.opacity = '0';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    container.appendChild(defs);
    document.body.appendChild(container);
  }

  const defs = container.querySelector('defs');
  if (!defs) return filterId;

  const filter = document.getElementById(filterId) as SVGFilterElement | null;
  if (!filter) {
    const newFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    newFilter.id = filterId;
    newFilter.setAttribute('x', '-50%');
    newFilter.setAttribute('y', '-50%');
    newFilter.setAttribute('width', '200%');
    newFilter.setAttribute('height', '200%');

    // Dilation: expands the alpha mask of the unified text
    const morph = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology');
    morph.setAttribute('in', 'SourceAlpha');
    morph.setAttribute('result', 'dilated');
    morph.setAttribute('operator', 'dilate');
    morph.setAttribute('radius', String(Math.max(0.5, radius)));
    newFilter.appendChild(morph);

    // Flood with stroke color
    const flood = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
    flood.setAttribute('flood-color', color);
    flood.setAttribute('result', 'strokeColor');
    newFilter.appendChild(flood);

    // Composite color into dilated mask
    const compIn = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
    compIn.setAttribute('in', 'strokeColor');
    compIn.setAttribute('in2', 'dilated');
    compIn.setAttribute('operator', 'in');
    compIn.setAttribute('result', 'strokeLayer');
    newFilter.appendChild(compIn);

    // Merge stroke behind original crisp text graphic
    const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const mergeStroke = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeStroke.setAttribute('in', 'strokeLayer');
    merge.appendChild(mergeStroke);

    const mergeSource = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeSource.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mergeSource);

    newFilter.appendChild(merge);
    defs.appendChild(newFilter);

    builtFilters.set(cacheKey, { id: filterId, container });
  }

  return filterId;
}
