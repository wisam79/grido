import { useState, type CSSProperties } from "react";
import { CURRENCIES, type CurrencyCode } from "../../data/landing-content";
import { SectionHeader } from "./SectionHeader";

interface RoiCalculatorProps {
  currency?: CurrencyCode;
  onCurrencyChange?: (c: CurrencyCode) => void;
}

const CLIENT_MIN = 5;
const CLIENT_MAX = 150;
const CLIENT_STEP = 5;
// Illustrative assumptions, not measured product performance.
const MINUTES_SAVED_PER_CLIENT = 5.5;
const WORK_DAYS_PER_MONTH = 26;
const EXTRA_CLIENT_SHARE = 0.25;

interface RoiEstimateProps {
  currency: CurrencyCode;
  dailyClients: number;
  onDailyClientsChange: (value: number) => void;
}

function RoiEstimate({
  currency,
  dailyClients,
  onDailyClientsChange,
}: RoiEstimateProps) {
  const currentCurr = CURRENCIES[currency];
  const [sheetPrice, setSheetPrice] = useState(currentCurr.defaultRoiPrice);
  const savedHoursPerMonth = Math.round(
    (dailyClients * MINUTES_SAVED_PER_CLIENT * WORK_DAYS_PER_MONTH) / 60,
  );
  const monthlyExtraRevenue = Math.round(
    dailyClients * sheetPrice * WORK_DAYS_PER_MONTH * EXTRA_CLIENT_SHARE,
  );

  const clientsFill = Math.round(
    ((dailyClients - CLIENT_MIN) / (CLIENT_MAX - CLIENT_MIN)) * 100,
  );
  const priceSpan = currentCurr.roiMaxPrice - currentCurr.roiMinPrice;
  const priceFill =
    priceSpan > 0
      ? Math.round(((sheetPrice - currentCurr.roiMinPrice) / priceSpan) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
      <div className="md:col-span-6 space-y-6">
        <div>
          <div className="flex flex-wrap justify-between items-center gap-2">
            <label
              htmlFor="roi-clients"
              className="text-sm font-medium text-text-primary"
            >
              زبائن صور الهوية يومياً
            </label>
            <span className="text-sm text-text-primary">
              <bdi dir="ltr" className="font-mono tabular-nums">
                {dailyClients}
              </bdi>{" "}
              زبون
            </span>
          </div>
          <input
            id="roi-clients"
            type="range"
            min={CLIENT_MIN}
            max={CLIENT_MAX}
            step={CLIENT_STEP}
            value={dailyClients}
            onChange={(event) =>
              onDailyClientsChange(Number(event.target.value))
            }
            aria-valuetext={`${dailyClients} زبون يومياً`}
            aria-describedby="roi-assumptions"
            style={{ "--range-fill": `${clientsFill}%` } as CSSProperties}
            className="ds-range w-full h-11 border-0 bg-transparent bg-no-repeat [background-size:100%_8px] [background-position:center] [--range-accent:var(--grido-brand-primary)]"
          />
        </div>

        <div>
          <div className="flex flex-wrap justify-between items-center gap-2">
            <label
              htmlFor="roi-price"
              className="text-sm font-medium text-text-primary"
            >
              سعر طقم الصور للزبون
            </label>
            <span className="text-sm text-text-primary">
              <bdi dir="ltr" className="font-mono tabular-nums">
                {sheetPrice.toLocaleString("en-US")}
              </bdi>{" "}
              <bdi>{currentCurr.unit}</bdi>
            </span>
          </div>
          <input
            id="roi-price"
            type="range"
            min={currentCurr.roiMinPrice}
            max={currentCurr.roiMaxPrice}
            step={currentCurr.roiStep}
            value={sheetPrice}
            onChange={(event) => setSheetPrice(Number(event.target.value))}
            aria-valuetext={`${sheetPrice.toLocaleString("en-US")} ${currentCurr.unit}`}
            aria-describedby="roi-assumptions"
            style={{ "--range-fill": `${priceFill}%` } as CSSProperties}
            className="ds-range w-full h-11 border-0 bg-transparent bg-no-repeat [background-size:100%_8px] [background-position:center] [--range-accent:var(--grido-brand-primary)]"
          />
        </div>
      </div>

      <dl className="md:col-span-6 border-t md:border-t-0 md:border-s border-border-subtle pt-6 md:pt-0 md:ps-8 divide-y divide-border-subtle">
        <div className="pb-5">
          <dt id="roi-time-label" className="text-sm text-text-secondary">
            الوقت الموفر شهرياً، بافتراض الحسبة
          </dt>
          <dd className="mt-3 text-text-primary">
            <output htmlFor="roi-clients" aria-labelledby="roi-time-label">
              <bdi
                dir="ltr"
                className="text-2xl sm:text-3xl font-mono font-semibold tabular-nums"
              >
                {savedHoursPerMonth}
              </bdi>{" "}
              <span className="text-sm text-text-secondary">ساعة</span>
            </output>
          </dd>
        </div>
        <div className="pt-5">
          <dt id="roi-revenue-label" className="text-sm text-text-secondary">
            إيراد إضافي تقديري، قبل التكاليف
          </dt>
          <dd className="mt-3 text-text-primary">
            <output
              htmlFor="roi-clients roi-price"
              aria-labelledby="roi-revenue-label"
            >
              <bdi
                dir="ltr"
                className="text-2xl sm:text-3xl font-mono font-semibold tabular-nums"
              >
                {monthlyExtraRevenue.toLocaleString("en-US")}
              </bdi>{" "}
              <bdi className="text-sm text-text-secondary">
                {currentCurr.unit}
              </bdi>
            </output>
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function RoiCalculator({
  currency = "IQD",
  onCurrencyChange,
}: RoiCalculatorProps) {
  const currentCurr = CURRENCIES[currency] || CURRENCIES.IQD;
  const [dailyClients, setDailyClients] = useState(25);

  return (
    <section id="roi" className="landing-section relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="حاسبة الوقت والعائد التقديري"
          description="عدّل المدخلات لاستكشاف سيناريو عمل افتراضي، وليس وعداً بالتوفير أو الربح."
        />

        <div className="landing-card p-5 sm:p-8">
          {onCurrencyChange && (
            <div className="mb-6 flex justify-center">
              <div
                className="landing-switch"
                role="group"
                aria-label="عملة حاسبة العائد"
              >
                {(["IQD", "SAR", "USD"] as CurrencyCode[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onCurrencyChange(code)}
                    className="min-h-11 min-w-11 px-3 py-2 text-sm font-medium leading-relaxed"
                    aria-pressed={currentCurr.code === code}
                  >
                    <bdi>{CURRENCIES[code].symbol}</bdi> {CURRENCIES[code].name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reset denomination-specific input synchronously; retain the daily client count. */}
          <RoiEstimate
            key={currentCurr.code}
            currency={currentCurr.code}
            dailyClients={dailyClients}
            onDailyClientsChange={setDailyClients}
          />

          <p
            id="roi-assumptions"
            className="mt-6 pt-5 border-t border-border-subtle text-xs text-text-secondary leading-7"
          >
            تفترض الحسبة توفير <bdi dir="ltr">{MINUTES_SAVED_PER_CLIENT}</bdi>{" "}
            دقيقة لكل زبون على مدار <bdi dir="ltr">{WORK_DAYS_PER_MONTH}</bdi>{" "}
            يوماً شهرياً، وزيادة{" "}
            <bdi dir="ltr">{EXTRA_CLIENT_SHARE * 100}%</bdi> في عدد الزبائن
            لحساب الإيراد الإضافي. لا تُخصم التكاليف؛ هذه افتراضات توضيحية وليست
            قياساً لأداء البرنامج.
          </p>
        </div>
      </div>
    </section>
  );
}
