import { useId } from 'react';

import { Button } from '@/components/ui/button';

import { GRIDO_BRAND_GEOMETRY } from './grido-brand-mark';

import type { AppInitializationStatus } from '@/hooks/use-app-bootstrap';
import './startup-splash.css';

interface StartupSplashProps {
  status?: AppInitializationStatus;
  onRetry?: () => void;
  onClose?: () => void;
}

export function StartupSplash({ status = 'checking', onRetry, onClose }: StartupSplashProps) {
  const logoId = useId();
  const { clipRect, colors } = GRIDO_BRAND_GEOMETRY;
  const needsAttention = status === 'slow' || status === 'error';
  const message =
    status === 'error'
      ? 'تعذّر التحقق من الجلسة. أعد المحاولة.'
      : status === 'slow'
        ? 'التهيئة تستغرق وقتًا أطول. يرجى الانتظار.'
        : 'جاري التهيئة ...';

  return (
    <main
      className="startup-splash select-none"
      data-status={status}
      dir="rtl"
      aria-labelledby="startup-splash-title"
    >
      <div className="startup-splash__content">
        <div className="startup-splash__art" aria-hidden="true">
          <div className="startup-splash__grid" />
          <div className="startup-splash__plate">
            <span className="startup-splash__light" />
          </div>
          <svg
            className="startup-splash__guides"
            width="288"
            height="240"
            viewBox="0 0 288 240"
            fill="none"
            focusable="false"
          >
            <path
              className="startup-splash__axis"
              d="M144 12V26M144 214V228M36 120H50M238 120H252"
            />
            <g className="startup-splash__corner startup-splash__corner--top-start">
              <path d="M58 60V38C58 35.7909 59.7909 34 62 34H84" pathLength="1" />
            </g>
            <g className="startup-splash__corner startup-splash__corner--top-end">
              <path d="M204 34H226C228.209 34 230 35.7909 230 38V60" pathLength="1" />
            </g>
            <g className="startup-splash__corner startup-splash__corner--bottom-start">
              <path d="M58 180V202C58 204.209 59.7909 206 62 206H84" pathLength="1" />
            </g>
            <g className="startup-splash__corner startup-splash__corner--bottom-end">
              <path d="M204 206H226C228.209 206 230 204.209 230 202V180" pathLength="1" />
            </g>
          </svg>
          {/* هندسة SVG المورّدة واحدة للأجزاء وقناع اللمعة؛ بلا خلفية سوداء. */}
          <svg
            className="startup-splash__mark"
            viewBox={GRIDO_BRAND_GEOMETRY.viewBox}
            width={96}
            height={96}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <clipPath id={`${logoId}-clip`}>
                <rect
                  x={clipRect.x}
                  y={clipRect.y}
                  width={clipRect.width}
                  height={clipRect.height}
                  rx={clipRect.rx}
                />
              </clipPath>
              <linearGradient id={`${logoId}-fold`} x1="15%" y1="85%" x2="65%" y2="35%">
                <stop offset="0%" stopColor={colors.foldStart} />
                <stop offset="100%" stopColor={colors.foldEnd} />
              </linearGradient>
              <linearGradient id={`${logoId}-sheen`}>
                <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                <stop offset="50%" stopColor="#fff" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <path
                id={`${logoId}-body`}
                d={GRIDO_BRAND_GEOMETRY.bodyPath}
                fill={colors.primaryFace}
              />
              <path
                id={`${logoId}-fold-shape`}
                d={GRIDO_BRAND_GEOMETRY.foldPath}
                fill={`url(#${logoId}-fold)`}
              />
              <path
                id={`${logoId}-fold-edge`}
                d={GRIDO_BRAND_GEOMETRY.foldEdgePath}
                fill="none"
                stroke={colors.foldEdge}
                strokeWidth="3"
                opacity="0.7"
              />
              <path
                id={`${logoId}-arm`}
                d={GRIDO_BRAND_GEOMETRY.armPath}
                fill={colors.primaryFace}
              />
              <clipPath id={`${logoId}-silhouette`}>
                <use href={`#${logoId}-body`} />
                <use href={`#${logoId}-fold-shape`} />
                <use href={`#${logoId}-arm`} />
              </clipPath>
            </defs>
            <g className="startup-splash__piece startup-splash__piece--body">
              <g clipPath={`url(#${logoId}-clip)`}>
                <use href={`#${logoId}-body`} />
              </g>
            </g>
            <g className="startup-splash__piece startup-splash__piece--fold">
              <g clipPath={`url(#${logoId}-clip)`}>
                <use href={`#${logoId}-fold-shape`} />
                <use href={`#${logoId}-fold-edge`} />
              </g>
            </g>
            <g className="startup-splash__piece startup-splash__piece--arm">
              <g clipPath={`url(#${logoId}-clip)`}>
                <use href={`#${logoId}-arm`} />
              </g>
            </g>
            <g clipPath={`url(#${logoId}-clip)`}>
              <g clipPath={`url(#${logoId}-silhouette)`}>
                <rect
                  className="startup-splash__sheen"
                  x="-520"
                  y="-120"
                  width="260"
                  height="1240"
                  fill={`url(#${logoId}-sheen)`}
                />
              </g>
            </g>
          </svg>
        </div>
        <h1 id="startup-splash-title" className="startup-splash__title" dir="ltr">
          Grido Studio
        </h1>
        <div className="startup-splash__status" role="status" aria-live="polite" aria-atomic="true">
          <p>{message}</p>
          {status !== 'error' && <div className="startup-splash__activity" aria-hidden="true" />}
        </div>
        {needsAttention && (
          <div className="startup-splash__actions">
            {status === 'error' && onRetry && (
              <Button
                type="button"
                onClick={onRetry}
                className="h-8 px-4 rounded-md text-xs font-bold"
              >
                إعادة المحاولة
              </Button>
            )}
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-8 px-4 rounded-md text-xs font-semibold"
              >
                إغلاق التطبيق
              </Button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
