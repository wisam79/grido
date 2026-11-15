import { scallopCirclePath, starPoints } from './svg-elements';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const KIDS_TEMPLATES: StickerTemplate[] = [
  {
    id: 'kids_birthday_star',
    name: 'عيد ميلاد نجم',
    nameEn: 'Birthday Star',
    category: 'kids',
    shape: 'circle',
    description: 'ملصق عيد ميلاد مرحن بنجوم منفوخة وحروف لعوب للأطفال',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 232 },
    defaultColors: {
      primary: '#4B438B',
      secondary: '#E8AF4A',
      background: '#F5F1FC',
    },
    fields: [
      { id: 'childName', label: 'اسم الطفل', type: 'text', defaultValue: 'يارا' },
      { id: 'age', label: 'العمر', type: 'text', defaultValue: '٦ سنوات' },
      { id: 'wishText', label: 'عبارة التمني', type: 'text', defaultValue: 'عيد ميلاد سعيد' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const name = escapeXml(fields.childName || 'يارا');
      const age = escapeXml(fields.age || '٦ سنوات');
      const wish = escapeXml(fields.wishText || 'عيد ميلاد سعيد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const scallops = scallopCirclePath(240, 240, 216, 12, 1.08);
      const star = starPoints(240, 140, 5, 59, 31);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <path d="${scallops}" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <polygon points="${star}" fill="${secondaryColor}" stroke="${secondaryColor}" stroke-width="8" stroke-linejoin="round" data-color-role="secondary"/>
  <path d="M 195,155 Q 178,156 176,143 M 285,155 Q 302,154 304,142 M 231,182 Q 218,191 222,202 M 254,182 Q 265,193 260,201" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" data-color-role="primary"/>
  <ellipse cx="228" cy="136" rx="3.2" ry="4.5" fill="${primaryColor}" data-color-role="primary"/>
  <ellipse cx="252" cy="136" rx="3.2" ry="4.5" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 230,150 Q 240,162 250,150" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 132,139 Q 143,130 138,119 M 340,163 Q 348,176 358,169 M 152,196 L 160,190 M 322,102 L 329,112" fill="none" stroke="${secondaryColor}" stroke-width="5" stroke-linecap="round" data-color-role="secondary"/>
  <path d="M 148,153 L 154,157 M 331,134 L 337,130" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" data-color-role="primary"/>
  <text data-field-id="childName" data-max-width="334" x="240" y="273" font-family="${fontFamily}, sans-serif" font-size="${Math.round(53 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${name}
  </text>
  <text data-field-id="age" data-max-width="272" x="240" y="326" font-family="${fontFamily}, sans-serif" font-size="${Math.round(27 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${age}
  </text>
  <path d="M 200,344 Q 240,352 280,344" fill="none" stroke="${secondaryColor}" stroke-width="3" stroke-linecap="round" data-color-role="secondary"/>
  <text data-field-id="wishText" data-max-width="294" x="240" y="382" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle">
    ${wish}
  </text>
</svg>`;
    },
  },
  {
    id: 'kids_party_dinosaur',
    name: 'حفلة الديناصور',
    nameEn: 'Dinosaur Party',
    category: 'kids',
    shape: 'rect',
    description: 'دعوة حفلة ديناصورات مغامرة للأطفال المحبين للاستكشاف',
    defaultWidth: 520,
    defaultHeight: 360,
    aspectRatio: 520 / 360,
    defaultMm: { width: 60, height: 42 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 496, height: 336, rx: 24 },
    defaultColors: {
      primary: '#286052',
      secondary: '#D9A34F',
      background: '#F4F5E5',
    },
    fields: [
      { id: 'title', label: 'عنوان الحفلة', type: 'text', defaultValue: 'حفلة الديناصورات' },
      { id: 'childName', label: 'اسم المدعو', type: 'text', defaultValue: 'البطل سيف' },
      {
        id: 'place',
        label: 'المكان والوقت',
        type: 'text',
        defaultValue: 'قاعة المغامرات • 5 عصراً',
      },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const title = escapeXml(fields.title || 'حفلة الديناصورات');
      const name = escapeXml(fields.childName || 'البطل سيف');
      const place = escapeXml(fields.place || 'قاعة المغامرات • 5 عصراً');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 360" width="520" height="360">
  <rect x="12" y="12" width="496" height="336" rx="24" fill="${bg}" data-color-role="background"/>
  <path d="M 42,261 V 182 A 84,84 0 0,1 210,182 V 261 Z" fill="${secondaryColor}" fill-opacity="0.12" data-color-role="secondary"/>
  <text data-field-id="title" data-max-width="418" x="260" y="75" font-family="${fontFamily}, sans-serif" font-size="${Math.round(33 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${title}
  </text>
  <path d="M 65,222 C 42,215 36,194 40,184 C 61,203 78,201 92,197 C 109,183 135,192 145,177 L 149,135 C 149,110 168,101 188,112 C 201,119 209,135 205,145 Q 201,155 181,151 L 179,205 Q 193,220 184,235 L 182,254 Q 174,261 165,254 L 164,240 H 125 L 121,254 Q 111,261 104,254 L 104,237 Q 82,236 65,222 Z" fill="${primaryColor}" fill-opacity="0.18" stroke="${primaryColor}" stroke-width="3" stroke-linejoin="round" data-color-role="primary"/>
  <path d="M 152,168 L 139,158 L 151,150 M 144,188 L 134,175 L 127,189 M 119,191 L 108,179 L 102,194" fill="${secondaryColor}" stroke="${secondaryColor}" stroke-width="2" stroke-linejoin="round" data-color-role="secondary"/>
  <path d="M 163,111 L 175,95 L 191,112 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="175" cy="94" r="4" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="188" cy="131" r="3.5" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 190,143 Q 195,147 201,142 M 111,250 H 119 M 170,250 H 180" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 143,215 C 127,199 109,211 113,224 C 119,237 143,235 143,215 Z" fill="${secondaryColor}" fill-opacity="0.6" data-color-role="secondary"/>
  <path d="M 61,260 V 240 M 61,254 Q 44,253 45,241 Q 59,240 61,254 M 61,248 Q 77,245 76,233 Q 63,232 61,248" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linejoin="round" data-color-role="primary"/>
  <text data-field-id="childName" data-max-width="238" x="350" y="187" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${name}
  </text>
  <path d="M 313,216 Q 350,225 387,216" fill="none" stroke="${secondaryColor}" stroke-width="3" stroke-linecap="round" data-color-role="secondary"/>
  <path d="M 48,279 H 472" stroke="${primaryColor}" stroke-opacity="0.25" stroke-width="1.5" data-color-role="primary"/>
  <text data-field-id="place" data-max-width="418" x="260" y="314" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${place}
  </text>
</svg>`;
    },
  },
  {
    id: 'kids_reward_chart',
    name: 'وسام إنجاز بطل',
    nameEn: 'Hero Achievement Medal',
    category: 'kids',
    shape: 'circle',
    description: 'وسام نجوم وإنجاز للتحفيز السلوكي ومكافآت المدارس والحضانات',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 45, height: 45 },
    defaultColors: {
      primary: '#345E7C',
      secondary: '#D8A145',
      background: '#FFF6DF',
    },
    fields: [
      { id: 'title', label: 'لقب الوسام', type: 'text', defaultValue: 'بطل الأسبوع' },
      { id: 'childName', label: 'اسم البطل', type: 'text', defaultValue: 'الأستاذ حسين' },
      { id: 'stars', label: 'عدد النجوم', type: 'text', defaultValue: '★★★★★' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const title = escapeXml(fields.title || 'بطل الأسبوع');
      const name = escapeXml(fields.childName || 'الأستاذ حسين');
      const stars = escapeXml(fields.stars || '★★★★★');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const edge = scallopCirclePath(240, 226, 189, 20, 1.04);
      const trophyStar = starPoints(240, 129, 5, 13, 6);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <path d="M 166,402 L 148,460 L 178,447 L 197,464 L 212,417 Z M 314,402 L 332,460 L 302,447 L 283,464 L 268,417 Z" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 176,411 L 164,446 M 304,411 L 316,446" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="secondary"/>
  <path d="${edge}" fill="${bg}" stroke="${secondaryColor}" stroke-width="5" data-color-role="background"/>
  <path d="M 205,111 H 188 C 184,135 196,148 216,146 M 275,111 H 292 C 296,135 284,148 264,146" fill="none" stroke="${secondaryColor}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" data-color-role="secondary"/>
  <path d="M 205,103 H 275 L 270,134 Q 265,155 240,159 Q 215,155 210,134 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 240,160 V 177 M 221,182 H 259" fill="none" stroke="${secondaryColor}" stroke-width="6" stroke-linecap="round" data-color-role="secondary"/>
  <polygon points="${trophyStar}" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 186,91 L 180,84 M 294,91 L 300,84 M 240,82 V 73" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round" data-color-role="primary"/>
  <text data-field-id="title" data-max-width="310" x="240" y="242" font-family="${fontFamily}, sans-serif" font-size="${Math.round(37 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${title}
  </text>
  <text data-field-id="stars" data-max-width="258" x="240" y="291" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${stars}
  </text>
  <text data-field-id="childName" data-max-width="292" x="240" y="337" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${name}
  </text>
  <path d="M 216,367 H 264" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="secondary"/>
</svg>`;
    },
  },
  {
    id: 'kids_space_astronaut',
    name: 'رحلة الفضاء والمستكشف',
    nameEn: 'Space Explorer Rocket Badge',
    category: 'kids',
    shape: 'circle',
    description: 'شارة فضائية مبهجة بصاروخ وكوكب زحل لحقائب الأطفال ودفاتر المدرسة',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 226 },
    defaultColors: {
      primary: '#1E293B',
      secondary: '#F59E0B',
      background: '#EEF4FF',
    },
    fields: [
      {
        id: 'explorerName',
        label: 'اسم الطفل / المستكشف',
        type: 'text',
        defaultValue: 'رائد الفضاء زيد',
      },
      {
        id: 'mission',
        label: 'المهمة أو الصف',
        type: 'text',
        defaultValue: 'نادي العلوم والاكتشاف',
      },
      { id: 'tag', label: 'عبارة تحفيزية', type: 'text', defaultValue: 'انطلق نحو النجوم!' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const explorerName = escapeXml(fields.explorerName || 'رائد الفضاء زيد');
      const mission = escapeXml(fields.mission || 'نادي العلوم والاكتشاف');
      const tag = escapeXml(fields.tag || 'انطلق نحو النجوم!');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const starA = starPoints(134, 152, 4, 12, 4.5);
      const starB = starPoints(348, 134, 4, 10, 4);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <radialGradient id="ksa-sky" cx="50%" cy="38%" r="54%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="240" cy="240" r="226" fill="${bg}" stroke="${primaryColor}" stroke-width="3" data-color-role="background"/>
  <circle cx="240" cy="240" r="212" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="8 6" data-color-role="secondary"/>
  <circle cx="240" cy="240" r="212" fill="url(#ksa-sky)"/>
  <polygon points="${starA}" fill="${secondaryColor}" data-color-role="secondary"/>
  <polygon points="${starB}" fill="${secondaryColor}"/>
  <!-- Rocket illustration -->
  <path d="M 240,86 C 266,112 272,150 264,192 H 216 C 208,150 214,112 240,86 Z" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="240" cy="144" r="14" fill="${backgroundColor}" stroke="${secondaryColor}" stroke-width="3.5"/>
  <path d="M 216,170 L 194,198 L 218,192 Z M 264,170 L 286,198 L 262,192 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 228,194 Q 240,226 252,194 Z" fill="${secondaryColor}"/>
  <!-- Orbit planet accent -->
  <circle cx="152" cy="204" r="14" fill="${secondaryColor}" fill-opacity="0.8"/>
  <ellipse cx="152" cy="204" rx="24" ry="7" transform="rotate(-18 152 204)" fill="none" stroke="${primaryColor}" stroke-width="2"/>
  <text data-field-id="explorerName" data-max-width="348" x="240" y="280" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${explorerName}
  </text>
  <text data-field-id="mission" data-max-width="322" x="240" y="324" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${mission}
  </text>
  <rect x="112" y="348" width="256" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="tag" data-max-width="224" x="240" y="376" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">
    ${tag}
  </text>
</svg>`;
    },
  },
  {
    id: 'kids_school_name_tag',
    name: 'بطاقة اسم للكتب والحقائب',
    nameEn: 'School Notebook Name Tag',
    category: 'kids',
    shape: 'rect',
    description: 'ملصق مدرسي عملي وممتع للدفاتر والكتب وعلب الطعام والزمزميات',
    defaultWidth: 520,
    defaultHeight: 300,
    aspectRatio: 520 / 300,
    defaultMm: { width: 75, height: 43 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 496, height: 276, rx: 22 },
    defaultColors: {
      primary: '#1D4ED8',
      secondary: '#F59E0B',
      background: '#FFFDF5',
    },
    fields: [
      {
        id: 'studentName',
        label: 'اسم الطالب / الطالبة',
        type: 'text',
        defaultValue: 'نور الهدى علي',
      },
      {
        id: 'gradeClass',
        label: 'الصف / الشعبة',
        type: 'text',
        defaultValue: 'الصف الرابع الابتدائي — أ',
      },
      {
        id: 'subject',
        label: 'المادة أو المدرسة',
        type: 'text',
        defaultValue: 'مدرسة دجلة الأهلية',
      },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const studentName = escapeXml(fields.studentName || 'نور الهدى علي');
      const gradeClass = escapeXml(fields.gradeClass || 'الصف الرابع الابتدائي — أ');
      const subject = escapeXml(fields.subject || 'مدرسة دجلة الأهلية');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300" width="520" height="300">
  <defs>
    <clipPath id="ksn-clip">
      <rect x="12" y="12" width="496" height="276" rx="22"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="496" height="276" rx="22" fill="${bg}" stroke="${primaryColor}" stroke-width="3" data-color-role="background"/>
  <g clip-path="url(#ksn-clip)">
    <rect x="12" y="12" width="496" height="66" fill="${primaryColor}" data-color-role="primary"/>
    <rect x="12" y="78" width="496" height="10" fill="${secondaryColor}" data-color-role="secondary"/>
  </g>
  <!-- Pencil vector emblem -->
  <g transform="translate(52 24) rotate(-25 20 20)">
    <rect x="10" y="4" width="16" height="32" rx="3" fill="${secondaryColor}" stroke="${backgroundColor}" stroke-width="2"/>
    <polygon points="10,36 26,36 18,48" fill="${backgroundColor}"/>
  </g>
  <text data-field-id="subject" data-max-width="350" x="284" y="54" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${subject}
  </text>
  <text data-field-id="studentName" data-max-width="430" x="260" y="166" font-family="${fontFamily}, sans-serif" font-size="${Math.round(42 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${studentName}
  </text>
  <path d="M 68,186 H 452" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="7 5" data-color-role="secondary"/>
  <rect x="86" y="210" width="348" height="46" rx="23" fill="${secondaryColor}" fill-opacity="0.2" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <text data-field-id="gradeClass" data-max-width="318" x="260" y="239" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${gradeClass}
  </text>
</svg>`;
    },
  },
  {
    id: 'kids_rainbow_cloud',
    name: 'قوس قزح والغيمة السعيدة',
    nameEn: 'Rainbow & Cloud Sticker',
    category: 'kids',
    shape: 'circle',
    description: 'ملصق لطيف بألوان قوس قزح وغيمة مبتسمة لغرف الأطفال والهدايا',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 226 },
    defaultColors: {
      primary: '#7C3AED',
      secondary: '#F472B6',
      background: '#FFF9FC',
    },
    fields: [
      { id: 'childName', label: 'الاسم', type: 'text', defaultValue: 'مريم الصغيرة' },
      { id: 'phrase', label: 'العبارة اللطيفة', type: 'text', defaultValue: 'عالم مليء بالألوان' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const childName = escapeXml(fields.childName || 'مريم الصغيرة');
      const phrase = escapeXml(fields.phrase || 'عالم مليء بالألوان');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="226" fill="${bg}" stroke="${secondaryColor}" stroke-width="3" data-color-role="background"/>
  <circle cx="240" cy="240" r="210" fill="none" stroke="${primaryColor}" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="8 6" data-color-role="primary"/>
  <!-- Rainbow arcs + smiling clouds -->
  <path d="M 142,208 A 98,98 0 0,1 338,208" fill="none" stroke="${secondaryColor}" stroke-width="18" stroke-linecap="round" data-color-role="secondary"/>
  <path d="M 164,208 A 76,76 0 0,1 316,208" fill="none" stroke="${primaryColor}" stroke-opacity="0.65" stroke-width="16" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 186,208 A 54,54 0 0,1 294,208" fill="none" stroke="${secondaryColor}" stroke-opacity="0.45" stroke-width="14" stroke-linecap="round"/>
  <!-- Left & right fluffy clouds -->
  <path d="M 114,226 A 20,20 0 0,1 142,204 A 24,24 0 0,1 182,212 A 18,18 0 0,1 174,238 H 124 A 16,16 0 0,1 114,226 Z" fill="${backgroundColor}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="primary"/>
  <path d="M 298,226 A 20,20 0 0,1 326,204 A 24,24 0 0,1 366,212 A 18,18 0 0,1 358,238 H 308 A 16,16 0 0,1 298,226 Z" fill="${backgroundColor}" stroke="${primaryColor}" stroke-width="2.5"/>
  <text data-field-id="childName" data-max-width="352" x="240" y="308" font-family="${fontFamily}, sans-serif" font-size="${Math.round(42 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${childName}
  </text>
  <rect x="96" y="334" width="288" height="46" rx="23" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="phrase" data-max-width="256" x="240" y="364" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">
    ${phrase}
  </text>
</svg>`;
    },
  },
];
