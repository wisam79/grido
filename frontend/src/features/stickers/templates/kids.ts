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
];
