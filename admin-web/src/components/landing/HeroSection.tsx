import { useState } from 'react';
import {
  MousePointer,
  Crop,
  Crosshair,
  Grid,
  Image as ImageIcon,
  Settings,
  FileText,
  Minus,
  Plus,
  ChevronDown,
} from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';
const PASSPORT_SAMPLE = '/biometric-cutout-blend.jpg';

type PaperType = 'A4' | '10x15' | '13x18';
type BgColorType = 'white' | 'blue' | 'gray';

export function HeroSection() {
  const [paper, setPaper] = useState<PaperType>('A4');
  const [bgColor, setBgColor] = useState<BgColorType>('blue');
  const [columns, setColumns] = useState<number>(4);
  const [rows, setRows] = useState<number>(2);
  const [photoSize] = useState<string>('35 × 45 ملم');
  const [gap] = useState<string>('2.00 ملم');
  const [margins] = useState<string>('10.00 ملم');
  const [resolution] = useState<string>('300 DPI');
  const [activeTool, setActiveTool] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const getBgClass = () => {
    switch (bgColor) {
      case 'white': return 'bg-[#ffffff]';
      case 'gray': return 'bg-[#4b5563]';
      default: return 'bg-[#1d4ed8]';
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      window.open(GITHUB_RELEASE_DOWNLOAD_URL, '_blank');
    }, 800);
  };

  const totalSlots = columns * rows;

  return (
    <section id="top" className="relative pt-6 pb-16 sm:pt-10 sm:pb-24 bg-[#000000] light:bg-[#faf9f6] text-[#f0f0f0] light:text-[#111827] overflow-hidden transition-colors duration-200" dir="rtl">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Hero 2-Column Split: Editorial Serif Headline on Right + Studio Window on Left */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Leading Column: Swiss Editorial Serif Typography */}
          <div className="lg:col-span-4 space-y-6 text-start flex flex-col justify-between self-center">
            <div className="space-y-4">
              
              {/* Thmanyah Editorial Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-[#191b1e] light:bg-[#ffffff] border border-[rgba(214,235,253,0.19)] light:border-black/10 text-xs font-mono text-[#00a3ff] shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00a3ff]" />
                <span>الجيل الجديد لمعالجة وطباعة صور الهوية</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-normal text-[#f0f0f0] light:text-[#111827] leading-[1.1] tracking-tight">
                اطبــع <span className="text-highlight">بدقـــة</span><br />متناهيـــة.
              </h1>

              <div className="text-xs font-mono tracking-widest text-[#a1a4a5] light:text-[#6b7280] uppercase pt-2 flex flex-wrap gap-1.5 items-center">
                <span className="bg-[#141517] light:bg-[#f3f4f6] px-2 py-0.5 rounded border border-[rgba(214,235,253,0.1)] light:border-black/5">توزيع ذكي</span>
                <span className="text-[#52595b]">/</span>
                <span className="bg-[#141517] light:bg-[#f3f4f6] px-2 py-0.5 rounded border border-[rgba(214,235,253,0.1)] light:border-black/5">300 DPI</span>
                <span className="text-[#52595b]">/</span>
                <span className="bg-[#141517] light:bg-[#f3f4f6] px-2 py-0.5 rounded border border-[rgba(214,235,253,0.1)] light:border-black/5">ألوان CMYK</span>
              </div>
            </div>

            {/* Bottom Sheet Spec Tag with Editorial Background */}
            <div className="pt-6 text-xs font-mono text-[#a1a4a5] light:text-[#6b7280] tracking-wider">
              <div className="inline-flex items-center gap-2 bg-[#141517] light:bg-[#ffffff] border border-[rgba(214,235,253,0.15)] light:border-black/10 px-3 py-1.5 rounded-[4px] shadow-sm">
                <span>{paper === 'A4' ? 'ورقة A4 / 210 × 297 ملم' : paper === '10x15' ? 'ورقة 10×15 سم / 102 × 152 ملم' : 'ورقة 13×18 سم / 127 × 178 ملم'}</span>
                <span className="text-[#52595b]">/</span>
                <span className="text-[#00a3ff] font-semibold">{totalSlots} صور</span>
              </div>
            </div>
          </div>

          {/* Master Desktop Studio Window */}
          <div className="lg:col-span-8">
            <div className="rounded-lg bg-[#191b1e] border border-[rgba(214,235,253,0.19)] overflow-hidden shadow-2xl">

              
              {/* OS Window Bar */}
              <div className="h-9 bg-[#141517] border-b border-[rgba(214,235,253,0.15)] px-4 flex items-center justify-between text-xs font-mono select-none" dir="ltr">
                <span className="text-[#f0f0f0] text-xs font-semibold tracking-wider">
                  GRIDO STUDIO PRO
                </span>
                <div className="flex items-center gap-3 text-[#a1a4a5] text-xs">
                  <span className="hover:text-white cursor-pointer">—</span>
                  <span className="hover:text-white cursor-pointer">□</span>
                  <span className="hover:text-white cursor-pointer">✕</span>
                </div>
              </div>

              {/* Window Main Area (3 Columns: Toolbar, Canvas with Rulers, Inspector) */}
              <div className="grid grid-cols-12 bg-[#191b1e]">
                
                {/* 1. Left Vertical Icon Toolbar */}
                <div className="col-span-1 border-e border-[rgba(214,235,253,0.15)] bg-[#141517] p-2 flex flex-col items-center gap-3">
                  {[MousePointer, Crop, Crosshair, Grid, ImageIcon, Settings].map((Icon, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTool(idx)}
                      className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
                        activeTool === idx
                          ? 'text-[#00a3ff] bg-[#00a3ff]/10'
                          : 'text-[#a1a4a5] hover:text-[#f0f0f0]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>

                {/* 2. Center Canvas Area with Millimeter Rulers */}
                <div className="col-span-7 p-3 sm:p-4 bg-[#0a0a0c] flex flex-col justify-between relative overflow-hidden" dir="ltr">
                  
                  {/* Top Horizontal Ruler */}
                  <div className="flex items-end justify-between ps-6 pe-2 h-5 text-[8px] font-mono text-[#52595b] border-b border-[#222] select-none">
                    <span>0</span>
                    <span>10</span>
                    <span>20</span>
                    <span>30</span>
                    <span>40</span>
                    <span>50</span>
                    <span>60</span>
                    <span>70</span>
                    <span>80</span>
                    <span>90</span>
                    <span>100</span>
                    <span>120</span>
                    <span>140</span>
                    <span>160</span>
                    <span>180</span>
                    <span>200</span>
                    <span>210</span>
                  </div>

                  {/* Canvas + Left Vertical Ruler Wrapper */}
                  <div className="flex items-center justify-center my-2 relative">
                    
                    {/* Left Vertical Ruler */}
                    <div className="w-5 flex flex-col justify-between py-2 text-[7px] font-mono text-[#52595b] border-e border-[#222] select-none h-[280px]">
                      <span>0</span>
                      <span>20</span>
                      <span>40</span>
                      <span>60</span>
                      <span>80</span>
                      <span>100</span>
                      <span>120</span>
                      <span>140</span>
                      <span>160</span>
                      <span>180</span>
                      <span>200</span>
                      <span>220</span>
                      <span>240</span>
                      <span>260</span>
                      <span>280</span>
                      <span>300</span>
                    </div>

                    {/* Physical White Print Sheet */}
                    <div className="relative bg-white p-3.5 rounded-sm shadow-2xl mx-auto my-1 border border-neutral-300">
                      
                      {/* Top Dimension Indicator Line */}
                      <div className="absolute -top-3.5 inset-x-4 flex items-center justify-between text-[8px] font-mono text-[#00a3ff] select-none">
                        <span className="w-1.5 h-1.5 border-s border-t border-[#00a3ff]" />
                        <span className="bg-[#0a0a0c] px-1">210 mm</span>
                        <span className="w-1.5 h-1.5 border-e border-t border-[#00a3ff]" />
                      </div>

                      {/* Right Dimension Indicator Line */}
                      <div className="absolute -end-4 inset-y-4 flex flex-col items-center justify-between text-[8px] font-mono text-[#00a3ff] select-none">
                        <span className="w-1.5 h-1.5 border-t border-e border-[#00a3ff]" />
                        <span className="bg-[#0a0a0c] px-1 rotate-90">297 mm</span>
                        <span className="w-1.5 h-1.5 border-b border-e border-[#00a3ff]" />
                      </div>

                      {/* Corner Crop Marks */}
                      <span aria-hidden className="absolute -top-1.5 -start-1.5 w-3 h-3 border-t border-s border-black" />
                      <span aria-hidden className="absolute -top-1.5 -end-1.5 w-3 h-3 border-t border-e border-black" />
                      <span aria-hidden className="absolute -bottom-1.5 -start-1.5 w-3 h-3 border-b border-s border-black" />
                      <span aria-hidden className="absolute -bottom-1.5 -end-1.5 w-3 h-3 border-b border-e border-black" />

                      {/* Photos Grid */}
                      <div
                        className="grid gap-1.5"
                        style={{
                          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                        }}
                      >
                        {Array.from({ length: totalSlots }).map((_, i) => (
                          <div
                            key={i}
                            className={`aspect-[35/45] w-12 sm:w-14 ${getBgClass()} border border-neutral-300 relative overflow-hidden flex items-center justify-center`}
                          >
                            <img
                              src={PASSPORT_SAMPLE}
                              alt="Biometric Portrait"
                              className="w-full h-full object-cover"
                            />

                            {/* Biometric SVG Overlay Crosshairs on all photos */}
                            <svg
                              className="absolute inset-0 w-full h-full pointer-events-none stroke-[#00a3ff]/90"
                              viewBox="0 0 100 130"
                              fill="none"
                            >
                              <line x1="10" y1="46" x2="90" y2="46" strokeWidth="0.75" />
                              <line x1="50" y1="20" x2="50" y2="90" strokeWidth="0.75" />
                              <circle cx="38" cy="46" r="2.5" strokeWidth="0.75" />
                              <circle cx="62" cy="46" r="2.5" strokeWidth="0.75" />
                            </svg>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Coordinate HUD Bar */}
                  <div className="flex items-center justify-between text-[9px] font-mono text-[#a1a4a5] pt-2 border-t border-[#222]">
                    <div className="flex items-center gap-3">
                      <span>X: <strong className="text-[#f0f0f0]">105.00 mm</strong></span>
                      <span>Y: <strong className="text-[#f0f0f0]">148.50 mm</strong></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>W: <strong className="text-[#f0f0f0]">35.00 mm</strong></span>
                      <span>H: <strong className="text-[#f0f0f0]">45.00 mm</strong></span>
                    </div>
                  </div>
                </div>

                {/* 3. Right Inspector Control Panel */}
                <div className="col-span-4 border-s border-[rgba(214,235,253,0.15)] bg-[#141517] p-3.5 flex flex-col justify-between text-xs font-mono space-y-4 text-start">
                  <div className="space-y-3.5">
                    
                    {/* Formats Selector */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-[#52595b] uppercase tracking-wider">حجم الورقة (FORMAT)</div>
                      
                      {/* A4 Button */}
                      <button
                        onClick={() => { setPaper('A4'); setColumns(4); setRows(2); }}
                        className={`w-full flex items-center justify-between p-2 rounded-[4px] border text-[11px] transition-all cursor-pointer ${
                          paper === 'A4'
                            ? 'border-[#00a3ff] bg-[#00a3ff]/10 text-[#f0f0f0]'
                            : 'border-[rgba(214,235,253,0.15)] bg-[#191b1e] text-[#a1a4a5] hover:text-[#f0f0f0]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-[#00a3ff]" />
                          <span>A4</span>
                        </div>
                        <span className="text-[10px] text-[#a1a4a5]" dir="ltr">210 × 297 mm</span>
                      </button>

                      {/* 10x15 Button */}
                      <button
                        onClick={() => { setPaper('10x15'); setColumns(2); setRows(2); }}
                        className={`w-full flex items-center justify-between p-2 rounded-[4px] border text-[11px] transition-all cursor-pointer ${
                          paper === '10x15'
                            ? 'border-[#00a3ff] bg-[#00a3ff]/10 text-[#f0f0f0]'
                            : 'border-[rgba(214,235,253,0.15)] bg-[#191b1e] text-[#a1a4a5] hover:text-[#f0f0f0]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-[#a1a4a5]" />
                          <span>10×15 سم</span>
                        </div>
                        <span className="text-[10px] text-[#a1a4a5]" dir="ltr">102 × 152 mm</span>
                      </button>

                      {/* 13x18 Button */}
                      <button
                        onClick={() => { setPaper('13x18'); setColumns(3); setRows(2); }}
                        className={`w-full flex items-center justify-between p-2 rounded-[4px] border text-[11px] transition-all cursor-pointer ${
                          paper === '13x18'
                            ? 'border-[#00a3ff] bg-[#00a3ff]/10 text-[#f0f0f0]'
                            : 'border-[rgba(214,235,253,0.15)] bg-[#191b1e] text-[#a1a4a5] hover:text-[#f0f0f0]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-[#a1a4a5]" />
                          <span>13×18 سم</span>
                        </div>
                        <span className="text-[10px] text-[#a1a4a5]" dir="ltr">127 × 178 mm</span>
                      </button>
                    </div>

                    {/* Steppers & Parameter Inputs */}
                    <div className="space-y-2 pt-1 border-t border-[rgba(214,235,253,0.1)] text-[11px]">
                      
                      {/* Columns */}
                      <div className="flex items-center justify-between">
                        <span className="text-[#a1a4a5]">الأعمدة</span>
                        <div className="flex items-center gap-2 bg-[#191b1e] border border-[rgba(214,235,253,0.15)] px-2 py-0.5 rounded-[4px]" dir="ltr">
                          <button onClick={() => setColumns((c) => Math.max(1, c - 1))} className="text-[#a1a4a5] hover:text-white cursor-pointer"><Minus className="w-3 h-3" /></button>
                          <span className="text-white font-mono w-3 text-center">{columns}</span>
                          <button onClick={() => setColumns((c) => Math.min(6, c + 1))} className="text-[#a1a4a5] hover:text-white cursor-pointer"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>

                      {/* Rows */}
                      <div className="flex items-center justify-between">
                        <span className="text-[#a1a4a5]">الصفوف</span>
                        <div className="flex items-center gap-2 bg-[#191b1e] border border-[rgba(214,235,253,0.15)] px-2 py-0.5 rounded-[4px]" dir="ltr">
                          <button onClick={() => setRows((r) => Math.max(1, r - 1))} className="text-[#a1a4a5] hover:text-white cursor-pointer"><Minus className="w-3 h-3" /></button>
                          <span className="text-white font-mono w-3 text-center">{rows}</span>
                          <button onClick={() => setRows((r) => Math.min(4, r + 1))} className="text-[#a1a4a5] hover:text-white cursor-pointer"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>

                      {/* Photo size */}
                      <div className="flex items-center justify-between">
                        <span className="text-[#a1a4a5]">مقاس الصورة</span>
                        <div className="flex items-center gap-1 bg-[#191b1e] border border-[rgba(214,235,253,0.15)] px-2 py-0.5 rounded-[4px] text-[#f0f0f0]">
                          <span>{photoSize}</span>
                          <ChevronDown className="w-3 h-3 text-[#a1a4a5]" />
                        </div>
                      </div>

                      {/* Gap */}
                      <div className="flex items-center justify-between">
                        <span className="text-[#a1a4a5]">المسافة البينية</span>
                        <span className="text-[#f0f0f0] bg-[#191b1e] border border-[rgba(214,235,253,0.15)] px-2 py-0.5 rounded-[4px]">{gap}</span>
                      </div>

                      {/* Margins */}
                      <div className="flex items-center justify-between">
                        <span className="text-[#a1a4a5]">الهوامش</span>
                        <span className="text-[#f0f0f0] bg-[#191b1e] border border-[rgba(214,235,253,0.15)] px-2 py-0.5 rounded-[4px]">{margins}</span>
                      </div>

                      {/* Resolution */}
                      <div className="flex items-center justify-between">
                        <span className="text-[#a1a4a5]">دقة الطباعة</span>
                        <div className="flex items-center gap-1 bg-[#191b1e] border border-[rgba(214,235,253,0.15)] px-2 py-0.5 rounded-[4px] text-[#00a3ff]">
                          <span>{resolution}</span>
                          <ChevronDown className="w-3 h-3 text-[#a1a4a5]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Primary Export Button */}
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full bg-[#00a3ff] hover:bg-[#008fe0] text-white font-mono text-xs tracking-wider font-semibold py-2.5 rounded-[4px] transition-colors cursor-pointer uppercase shadow-lg shadow-[#00a3ff]/20"
                  >
                    {isExporting ? 'جاري التصدير...' : 'تصدير ورقة الطباعة'}
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* 4-Card Technical Bento Strip (Directly Below Studio Window) */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: MULTI-FORMAT */}
          <div className="rounded-lg bg-[#141517] border border-[rgba(214,235,253,0.15)] p-4 flex flex-col justify-between min-h-[170px] text-start">
            <div className="text-[10px] font-mono tracking-wider text-[#a1a4a5] uppercase">
              تعدد المقاسات (MULTI-FORMAT)
            </div>

            <div className="flex items-end justify-center gap-3 py-2">
              <div className="w-14 h-20 border border-[rgba(214,235,253,0.35)] rounded-sm flex items-center justify-center text-[10px] font-mono text-[#f0f0f0] relative">
                <span className="absolute top-0 right-0 w-2.5 h-2.5 border-b border-s border-[rgba(214,235,253,0.35)] bg-[#000]" />
                A4
              </div>
              <div className="w-11 h-16 border border-[rgba(214,235,253,0.25)] rounded-sm flex items-center justify-center text-[9px] font-mono text-[#a1a4a5] relative">
                <span className="absolute top-0 right-0 w-2 h-2 border-b border-s border-[rgba(214,235,253,0.25)] bg-[#000]" />
                10×15
              </div>
              <div className="w-12 h-18 border border-[rgba(214,235,253,0.25)] rounded-sm flex items-center justify-center text-[9px] font-mono text-[#a1a4a5] relative">
                <span className="absolute top-0 right-0 w-2 h-2 border-b border-s border-[rgba(214,235,253,0.25)] bg-[#000]" />
                13×18
              </div>
            </div>
          </div>

          {/* Card 2: MILLIMETER CONTROL */}
          <div className="rounded-lg bg-[#141517] border border-[rgba(214,235,253,0.15)] p-4 flex flex-col justify-between min-h-[170px] text-start">
            <div className="text-[10px] font-mono tracking-wider text-[#a1a4a5] uppercase">
              تحكم بالمليمتر (PRECISION)
            </div>

            <div className="relative h-20 bg-[#0a0a0c] rounded border border-[#222] p-2 flex items-center justify-center">
              {/* SVG Coordinate Grid with Crosshair */}
              <svg className="w-full h-full" viewBox="0 0 160 70" fill="none">
                <line x1="0" y1="35" x2="160" y2="35" stroke="#00a3ff" strokeWidth="0.8" strokeDasharray="2 2" />
                <line x1="80" y1="0" x2="80" y2="70" stroke="#00a3ff" strokeWidth="0.8" strokeDasharray="2 2" />
                <rect x="74" y="29" width="12" height="12" stroke="#00a3ff" strokeWidth="1" fill="#00a3ff" fillOpacity="0.2" />
              </svg>

              <div className="absolute bottom-1.5 left-2 bg-[#141517] border border-[rgba(214,235,253,0.15)] px-1.5 py-0.5 rounded text-[8px] font-mono text-[#a1a4a5]" dir="ltr">
                <div>X: <span className="text-[#00a3ff]">25.00 mm</span></div>
                <div>Y: <span className="text-[#00a3ff]">18.00 mm</span></div>
              </div>
            </div>
          </div>

          {/* Card 3: BACKGROUND SWAP */}
          <div className="rounded-lg bg-[#141517] border border-[rgba(214,235,253,0.15)] p-4 flex flex-col justify-between min-h-[170px] text-start">
            <div className="text-[10px] font-mono tracking-wider text-[#a1a4a5] uppercase">
              عزل الخلفية (BG SWAP)
            </div>

            {/* 3-Segment Switcher Bar */}
            <div className="grid grid-cols-3 gap-1 bg-[#0a0a0c] p-0.5 rounded border border-[#222]">
              <button
                onClick={() => setBgColor('white')}
                className={`py-1 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                  bgColor === 'white' ? 'bg-[#00a3ff] text-white' : 'text-[#a1a4a5]'
                }`}
              >
                أبيض
              </button>
              <button
                onClick={() => setBgColor('blue')}
                className={`py-1 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                  bgColor === 'blue' ? 'bg-[#00a3ff] text-white' : 'text-[#a1a4a5]'
                }`}
              >
                أزرق
              </button>
              <button
                onClick={() => setBgColor('gray')}
                className={`py-1 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                  bgColor === 'gray' ? 'bg-[#00a3ff] text-white' : 'text-[#a1a4a5]'
                }`}
              >
                رمادي
              </button>
            </div>

            {/* Avatar Silhouettes */}
            <div className="flex items-center justify-center gap-2 py-1 text-xs text-[#52595b]">
              <div className="w-8 h-10 rounded bg-white/10 border border-white/20 flex items-center justify-center text-[8px] text-white">
                👤
              </div>
              <span>←</span>
              <div className="w-8 h-10 rounded bg-[#1d4ed8] border border-[#00a3ff] flex items-center justify-center text-[8px] text-white">
                👤
              </div>
              <span>←</span>
              <div className="w-8 h-10 rounded bg-[#4b5563] border border-neutral-400 flex items-center justify-center text-[8px] text-white">
                👤
              </div>
            </div>
          </div>

          {/* Card 4: CMYK OUTPUT */}
          <div className="rounded-lg bg-[#141517] border border-[rgba(214,235,253,0.15)] p-4 flex flex-col justify-between min-h-[170px] text-start">
            <div className="text-[10px] font-mono tracking-wider text-[#a1a4a5] uppercase">
              ألوان المطابع (CMYK 300DPI)
            </div>

            {/* 4 Swatches */}
            <div className="grid grid-cols-4 gap-2 py-1">
              <div className="flex flex-col items-center gap-1">
                <div className="w-full h-8 bg-[#00a3ff] rounded-sm" />
                <span className="text-[9px] font-mono text-[#a1a4a5]">C</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-full h-8 bg-[#e91e63] rounded-sm" />
                <span className="text-[9px] font-mono text-[#a1a4a5]">M</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-full h-8 bg-[#ffd600] rounded-sm" />
                <span className="text-[9px] font-mono text-[#a1a4a5]">Y</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-full h-8 bg-[#111111] border border-white/30 rounded-sm" />
                <span className="text-[9px] font-mono text-[#a1a4a5]">K</span>
              </div>
            </div>

            {/* Slider with crosshair target */}
            <div className="relative flex items-center justify-center pt-1">
              <div className="w-full h-0.5 bg-[#222]" />
              <div className="absolute w-5 h-5 rounded-full border border-[#00a3ff] bg-[#000] flex items-center justify-center">
                <Crosshair className="w-3 h-3 text-[#00a3ff]" />
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}




