import { useEffect, useRef, useState } from 'react';
import { Ban, Check, CheckCircle2, Clock, Copy } from 'lucide-react';
import type { DerivedAccountState } from '../../../lib/admin-utils';
import type { UserProfile } from '../types';

const PLAN_META: Record<string, { label: string; badgeClass: string }> = {
  enterprise: {
    label: 'مؤسسات',
    badgeClass: 'bg-purple-500/12 text-purple-300 border-purple-500/30',
  },
  pro: {
    label: 'احترافي',
    badgeClass: 'bg-blue-500/12 text-blue-300 border-blue-500/30',
  },
  trial: {
    label: 'تجريبي',
    badgeClass: 'bg-amber-500/12 text-amber-300 border-amber-500/30',
  },
  free: {
    label: 'مجاني',
    badgeClass: 'bg-white/[0.04] text-[#a9afaf] border-[#333333]',
  },
};

function getPlanMeta(plan?: string | null): { label: string; badgeClass: string } {
  return PLAN_META[(plan || 'free').toLowerCase()] ?? PLAN_META.free;
}

export function PlanBadge({ plan }: { plan?: string | null }) {
  const meta = getPlanMeta(plan);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium border ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

const STATE_META: Record<
  DerivedAccountState,
  { label: string; badgeClass: string; Icon: typeof CheckCircle2 }
> = {
  banned: {
    label: 'محظور',
    badgeClass: 'bg-red-500/12 text-red-300 border-red-500/30',
    Icon: Ban,
  },
  expired: {
    label: 'منتهي',
    badgeClass: 'bg-amber-500/12 text-amber-300 border-amber-500/30',
    Icon: Clock,
  },
  active: {
    label: 'نشط',
    badgeClass: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30',
    Icon: CheckCircle2,
  },
};

export function AccountStateBadge({ state }: { state: DerivedAccountState }) {
  const { label, badgeClass, Icon } = STATE_META[state];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-medium border ${badgeClass}`}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

interface CopyButtonProps {
  value: string;
  label: string;
  text?: string;
  className?: string;
  onCopied?: () => void;
}

export function CopyButton({ value, label, text, className = '', onCopied }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // المتصفح أو الإذن رفض الوصول للحافظة دون كسر الواجهة
    }
  };

  return (
    <button
      type="button"
      onClick={() => {
        void handleCopy();
      }}
      aria-label={label}
      title={copied ? 'تم النسخ' : label}
      className={`inline-flex items-center justify-center gap-1.5 rounded-sm border border-[#454545] bg-[#171717] hover:bg-white/[0.08] text-[#c9cfcf] hover:text-[#f5f5f5] transition-colors cursor-pointer ${
        text ? 'h-7 px-2.5 text-[11px] font-medium' : 'w-7 h-7'
      } ${className}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
      ) : (
        <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      )}
      {text && <span>{copied ? 'تم النسخ' : text}</span>}
    </button>
  );
}

interface UserIdentityLinkProps {
  user?: UserProfile;
  fallbackText?: string;
  emptyText?: string;
  maxWidthClass?: string;
  onInspectUser?: (user: UserProfile) => void;
}

export function UserIdentityLink({
  user,
  fallbackText,
  emptyText = '—',
  maxWidthClass = 'max-w-48',
  onInspectUser,
}: UserIdentityLinkProps) {
  if (!user) {
    if (!fallbackText) {
      return <span className="text-[#a9afaf] text-[11px]">{emptyText}</span>;
    }
    return (
      <code
        dir="ltr"
        title={fallbackText}
        className={`text-[11px] font-mono text-[#c9cfcf] truncate inline-block align-middle ${maxWidthClass}`}
      >
        {fallbackText}
      </code>
    );
  }

  const content = (
    <>
      <div className="text-xs font-medium text-[#f5f5f5] truncate group-hover:text-[#60a5fa] transition-colors">
        {user.name || 'بدون اسم'}
      </div>
      <div className={`text-[11px] font-mono text-[#a9afaf] truncate ${maxWidthClass}`} dir="ltr">
        {user.email}
      </div>
    </>
  );

  if (onInspectUser) {
    return (
      <button
        type="button"
        onClick={() => onInspectUser(user)}
        className="text-right group cursor-pointer block min-w-0 max-w-full"
      >
        {content}
      </button>
    );
  }

  return <div className="text-right min-w-0 max-w-full">{content}</div>;
}
