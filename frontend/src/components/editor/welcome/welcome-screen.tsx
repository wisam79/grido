import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { WorkflowCard } from "./workflow-card";
import type { WorkflowMode } from "@/lib/store";

// ─── الأيقونات (SVG مدمج لتجنب الاعتمادية) ──────────────────────────────

function QuickIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function StudioIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function BatchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

// ─── بيانات المسارات ──────────────────────────────────────────────────────

const WORKFLOW_DEFINITIONS = [
  {
    id: "quick" as WorkflowMode,
    title: "إنتاج سريع",
    subtitle: "صور هوية، جوازات سفر، وطباعة فورية",
    description: "الأنسب لاستوديوهات التصوير ومحلات الطباعة. افتح صورة، اختر قالباً جاهزاً، واطبع خلال دقيقة.",
    icon: <QuickIcon />,
    badge: "الأكثر استخداماً",
    badgeVariant: "primary" as const,
    features: [
      "قوالب جاهزة للهوية والجواز والتأشيرة",
      "ضبط الوجه تلقائياً بالذكاء الاصطناعي",
      "طباعة بدقة عالية على أي حجم ورق",
      "عزل الخلفية بضغطة واحدة",
    ],
    delay: 0.1,
  },
  {
    id: "studio" as WorkflowMode,
    title: "استوديو التصميم",
    subtitle: "كولاج حر، ملصقات، وتصميم إبداعي",
    description: "للمصممين الذين يريدون التحكم الكامل. أضف نصوصاً وأشكالاً وملصقات وأنشئ تصاميم احترافية.",
    icon: <StudioIcon />,
    badge: "متقدم",
    badgeVariant: "amber" as const,
    features: [
      "محرر حر مع طبقات وعناصر متعددة",
      "استوديو ملصقات وأشكال متجهة",
      "نصوص فنية وتدرجات لونية",
      "باركود QR وأدوات تجارية",
    ],
    delay: 0.2,
  },
  {
    id: "batch" as WorkflowMode,
    title: "معالجة دفعية",
    subtitle: "قص وعزل وطباعة بالجملة",
    description: "لمن يتعامل مع عشرات الصور يومياً. أدرج صوراً متعددة دفعة واحدة ومعالجتها وطباعتها تلقائياً.",
    icon: <BatchIcon />,
    badge: "متخصص",
    badgeVariant: "emerald" as const,
    features: [
      "إدراج عشرات الصور دفعة واحدة",
      "توزيع تلقائي على قوالب الطباعة",
      "عزل الخلفية الجماعي بالذكاء الاصطناعي",
      "تصدير وطباعة دفعية",
    ],
    delay: 0.3,
  },
] as const;

// ─── شاشة الترحيب الرئيسية ────────────────────────────────────────────────

interface WelcomeScreenProps {
  onSelect: (mode: WorkflowMode) => void;
}

export function WelcomeScreen({ onSelect }: WelcomeScreenProps) {
  const [selected, setSelected] = useState<WorkflowMode | null>(null);

  const handleConfirm = () => {
    if (selected) onSelect(selected);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="welcome"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/98 backdrop-blur-sm font-cairo"
        dir="rtl"
      >
        {/* الخلفية التزيينية */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/4 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/3 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>

        {/* البطاقة الرئيسية */}
        <div className="relative w-full max-w-2xl mx-4 flex flex-col gap-6">
          {/* العنوان */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.1, 0.9, 0.2, 1] }}
            className="text-center flex flex-col gap-2"
          >
            <div className="flex items-center justify-center gap-2.5 mb-1">
              <span className="w-3 h-3 rounded-full bg-primary shadow-xs shadow-primary/40 ring-2 ring-primary/20" />
              <span className="text-xs font-black text-foreground/40 tracking-widest font-mono uppercase">
                Grido Studio
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              كيف تريد البدء اليوم؟
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              اختر مسار العمل المناسب. يمكنك التبديل في أي وقت من القائمة العلوية.
            </p>
          </motion.div>

          {/* بطاقات المسارات */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {WORKFLOW_DEFINITIONS.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                {...workflow}
                isSelected={selected === workflow.id}
                onSelect={setSelected}
              />
            ))}
          </div>

          {/* زر التأكيد */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.35 }}
            className="flex items-center justify-between gap-3"
          >
            <p className="text-xs text-muted-foreground/70">
              سيُحفظ اختيارك ويُطبَّق تلقائياً في المرات القادمة
            </p>
            <Button
              onClick={handleConfirm}
              disabled={!selected}
              className="h-9 px-6 font-bold text-sm rounded-lg transition-all"
              id="welcome-confirm-btn"
            >
              ابدأ العمل
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
