import { useState } from 'react';
import { ShieldCheck, Printer, Scan } from 'lucide-react';

const PASSPORT_SAMPLE = '/biometric-cutout-blend.jpg';

type PaperType = 'A4' | '10x15' | '13x18';
type BgColorType = 'white' | 'blue' | 'gray' | 'red';

export function LiveStudioSimulator() {
  const [paper, setPaper] = useState<PaperType>('A4');
  const [bgColor, setBgColor] = useState<BgColorType>('white');
  const [showBiometricGuides, setShowBiometricGuides] = useState(true);
  const [isSimulatingPrint, setIsSimulatingPrint] = useState(false);

  const getBgClass = () => {
    switch (bgColor) {
      case 'blue': return 'bg-[#1d4ed8]';
      case 'gray': return 'bg-[#4b5563]';
      case 'red': return 'bg-[#991b1b]';
      default: return 'bg-[#ffffff]';
    }
  };

  const getPhotoSlots = () => {
    switch (paper) {
      case '10x15': return [1, 2, 3, 4];
      case '13x18': return [1, 2, 3, 4, 5, 6];
      default: return [1, 2, 3, 4, 5, 6, 7, 8];
    }
  };

  const handleSimulatePrint = () => {
    setIsSimulatingPrint(true);
    setTimeout(() => {
      setIsSimulatingPrint(false);
    }, 1800);
  };

  return (
    <div className="w-full relative rounded-lg bg-[#191b1e] border border-[rgba(214,235,253,0.19)] overflow-hidden">
      {/* Studio Header Bar */}
      <div className="h-11 bg-[#000000] border-b border-[rgba(214,235,253,0.19)] px-4 flex items-center justify-between text-xs font-mono select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00a3ff]" />
          <span className="text-[#f0f0f0] font-medium text-xs">
            استوديو المحاكاة التفاعلي الحي
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-[#191b1e] text-[#a1a4a5] border border-[rgba(214,235,253,0.19)] text-[10px]">
            300 DPI • CMYK
          </span>
          <span className="px-2 py-0.5 rounded bg-[#ffffff] text-[#000000] text-[10px] font-semibold">
            {paper === 'A4' ? '210×297 مم' : paper === '10x15' ? '100×150 مم' : '130×180 مم'}
          </span>
        </div>
      </div>

      {/* Control Quick Strip */}
      <div className="p-3 bg-[#191b1e] border-b border-[rgba(214,235,253,0.19)] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Paper switch */}
        <div className="flex items-center gap-2">
          <span className="text-[#a1a4a5] text-xs">المقاس:</span>
          <div className="flex bg-[#000000] p-0.5 rounded border border-[rgba(214,235,253,0.19)]">
            {(['A4', '10x15', '13x18'] as PaperType[]).map((p) => (
              <button
                key={p}
                onClick={() => setPaper(p)}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                  paper === p ? 'bg-[#00a3ff] text-white' : 'text-[#a1a4a5] hover:text-[#f0f0f0]'
                }`}
              >
                {p === 'A4' ? 'ورقة A4' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Background color switch */}
        <div className="flex items-center gap-2">
          <span className="text-[#a1a4a5] text-xs">الخلفية:</span>
          <div className="flex items-center gap-1.5 bg-[#000000] p-1 rounded border border-[rgba(214,235,253,0.19)]">
            <button
              onClick={() => setBgColor('white')}
              className={`w-4 h-4 rounded bg-white cursor-pointer transition-transform ${bgColor === 'white' ? 'ring-2 ring-[#00a3ff]' : 'opacity-70'}`}
              title="أبيض رسمي"
            />
            <button
              onClick={() => setBgColor('blue')}
              className={`w-4 h-4 rounded bg-[#1d4ed8] cursor-pointer transition-transform ${bgColor === 'blue' ? 'ring-2 ring-[#00a3ff]' : 'opacity-70'}`}
              title="أزرق رسمي"
            />
            <button
              onClick={() => setBgColor('gray')}
              className={`w-4 h-4 rounded bg-[#4b5563] cursor-pointer transition-transform ${bgColor === 'gray' ? 'ring-2 ring-[#00a3ff]' : 'opacity-70'}`}
              title="رمادي"
            />
            <button
              onClick={() => setBgColor('red')}
              className={`w-4 h-4 rounded bg-[#991b1b] cursor-pointer transition-transform ${bgColor === 'red' ? 'ring-2 ring-[#00a3ff]' : 'opacity-70'}`}
              title="أحمر وثائق"
            />
          </div>
        </div>

        {/* Biometric Toggle & Print trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBiometricGuides((v) => !v)}
            className={`px-3 py-1 rounded border text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
              showBiometricGuides
                ? 'bg-[#00a3ff]/20 text-[#00a3ff] border-[#00a3ff]/50'
                : 'bg-[#000000] text-[#a1a4a5] border-[rgba(214,235,253,0.19)]'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>الشبكة البيومترية</span>
          </button>

          <button
            onClick={handleSimulatePrint}
            disabled={isSimulatingPrint}
            className="button-primary text-xs !py-1.5 !px-3"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isSimulatingPrint ? 'جاري التوزيع...' : 'محاكاة الطباعة'}</span>
          </button>
        </div>
      </div>

      {/* Main Sheet Workspace View */}
      <div className="p-4 sm:p-6 bg-[#000000] relative min-h-[300px] flex items-center justify-center overflow-hidden">
        {/* Laser Print Scanline Animation when simulating print */}
        {isSimulatingPrint && (
          <div
            className="absolute inset-x-0 h-0.5 bg-[#00a3ff] z-40"
          />
        )}

        {/* Floating Sheet Preview */}
        <div className="w-full max-w-md bg-white p-4 sm:p-5 rounded relative transition-all duration-300">
          {/* Corner Precision Registration Marks */}
          <span aria-hidden className="absolute -top-1.5 -start-1.5 w-3 h-3 border-t-2 border-s-2 border-black" />
          <span aria-hidden className="absolute -top-1.5 -end-1.5 w-3 h-3 border-t-2 border-e-2 border-black" />
          <span aria-hidden className="absolute -bottom-1.5 -start-1.5 w-3 h-3 border-b-2 border-s-2 border-black" />
          <span aria-hidden className="absolute -bottom-1.5 -end-1.5 w-3 h-3 border-b-2 border-e-2 border-black" />

          {/* Sheet Header Metadata */}
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-800 border-b border-neutral-200 pb-2 mb-3">
            <span className="font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-900" />
              ورقة معاملات {paper}
            </span>
            <span className="bg-neutral-900 text-white px-2 py-0.5 rounded text-[9px]">
              40 × 32 ملم • قص ليزري
            </span>
          </div>

          {/* Photos Grid */}
          <div
            className={`grid gap-2.5 ${
              paper === 'A4'
                ? 'grid-cols-4'
                : paper === '13x18'
                ? 'grid-cols-3'
                : 'grid-cols-2'
            }`}
          >
            {getPhotoSlots().map((n) => (
              <div
                key={n}
                className={`aspect-[3/4] ${getBgClass()} rounded border border-neutral-300 overflow-hidden relative group/slot transition-colors flex items-center justify-center p-0.5`}
              >
                <img
                  src={PASSPORT_SAMPLE}
                  alt="Passport Sample"
                  width={120}
                  height={160}
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-contain"
                />

                {/* Millimeter Label */}
                <div className="absolute bottom-0 inset-x-0 bg-black/85 text-[6.5px] font-mono text-center text-white py-0.5">
                  40×32 ملم
                </div>

                {/* Biometric Guide Overlay on first slot */}
                {showBiometricGuides && n === 1 && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-8 h-10 rounded-full border border-dashed border-[#00a3ff] opacity-90" />
                    <div className="absolute top-1 px-1 bg-black/90 text-[5.5px] font-mono text-white rounded">
                      توسيط آلي
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sheet Footer Metric */}
          <div className="mt-3 pt-2 border-t border-neutral-200 flex items-center justify-between text-[9px] font-mono text-neutral-600">
            <span>DPI: 300</span>
            <span className="text-[#00a3ff] font-semibold">استغلال الورقة: 100% (صفر هدر)</span>
            <span>K=100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

