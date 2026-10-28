import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import {
  createStudioScene,
  type StudioFrame,
  type StudioScene,
} from "../../lib/landing/studio-scene";
import type { StudioView } from "../../lib/landing/scene-math";

interface StudioSceneFrameProps {
  label: string;
  fallbackImage: string;
  camera: [number, number, number];
  view: StudioView;
  build: (studio: StudioScene) => (frame: StudioFrame) => void;
}

export function StudioSceneFrame({
  label,
  fallbackImage,
  camera,
  view,
  build,
}: StudioSceneFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const studioRef = useRef<StudioScene | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [motion, setMotion] = useState({ playing: false, reduced: false });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let studio: StudioScene | undefined;
    try {
      studio = createStudioScene(container, {
        camera,
        view,
        onUnavailable: () => setUnavailable(true),
        onMotionChange: (playing, reduced) => setMotion({ playing, reduced }),
      });
      studioRef.current = studio;
      const update = build(studio);
      studio.start(update);
    } catch {
      studio?.dispose();
      setUnavailable(true);
    }
    return () => {
      studioRef.current = null;
      studio?.dispose();
    };
  }, [build, camera, view]);

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_35%,#34373d_0%,#1c1e23_48%,#141518_100%)]">
      {unavailable ? (
        <div className="absolute inset-0 flex flex-col">
          <img
            src={fallbackImage}
            alt={label}
            className="min-h-0 w-full flex-1 object-contain p-6"
          />
          <p
            role="status"
            className="px-4 pb-4 text-center text-xs leading-relaxed text-text-secondary"
          >
            تُعرض المعاينة المصوّرة لأن العرض ثلاثي الأبعاد غير متاح.
          </p>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            role="group"
            aria-label={`${label}. اسحب أو استخدم الأسهم لإمالة المجسم، ومفتاح Home لإعادة العرض.`}
            tabIndex={0}
            className="absolute inset-x-0 top-0 bottom-14 outline-offset-[-4px]"
          />
          <div className="absolute inset-x-0 bottom-0 flex min-h-14 items-center justify-between gap-2 border-t border-white/[0.06] bg-black/15 px-3">
            <span className="text-[11px] leading-relaxed text-text-secondary">
              اسحب أو استخدم الأسهم
            </span>
            <div
              role="group"
              aria-label="أدوات العرض ثلاثي الأبعاد"
              className="flex shrink-0 items-center gap-1"
            >
              <button
                type="button"
                onClick={() => studioRef.current?.toggleMotion()}
                disabled={motion.reduced}
                aria-label={motion.playing ? "إيقاف الحركة" : "تشغيل الحركة"}
                title={
                  motion.reduced
                    ? "الحركة متوقفة وفق إعدادات النظام"
                    : motion.playing
                      ? "إيقاف الحركة"
                      : "تشغيل الحركة"
                }
                className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-40"
              >
                {motion.playing ? (
                  <Pause aria-hidden="true" className="size-4" />
                ) : (
                  <Play aria-hidden="true" className="size-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => studioRef.current?.resetView()}
                aria-label="إعادة زاوية العرض"
                title="إعادة زاوية العرض"
                className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-white/10 hover:text-white"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
