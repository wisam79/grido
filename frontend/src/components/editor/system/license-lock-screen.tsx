import { useState } from "react";
import { LockSimple, Key, Moon, Sun } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/huge-icon";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { WindowControls } from "@/components/editor/system/window-controls";
import { WindowResizeHandles } from "@/components/editor";
import { AccountLicenseModal } from "@/components/editor";
import { toast } from "sonner";

/**
 * LicenseLockScreen — شاشة قفل الترخيص المستقلة (رأس نافذة مختصر + نموذج التفعيل)
 * 🧭 كانت مضمّنة في App.tsx (كان هذا يعني تكرار ترميز رأس النافذة بالكامل).
 */
interface LicenseLockScreenProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  isMaximized: boolean;
  isFocused: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onActivate: (key: string) => Promise<unknown>;
  onOpenAccount: () => void;
  onLogout: () => void;
  user: { token?: string } | null;
}

export function LicenseLockScreen({
  theme,
  onToggleTheme,
  isMaximized,
  isFocused,
  onMinimize,
  onMaximize,
  onClose,
  onActivate,
  onOpenAccount,
  onLogout,
  user,
}: LicenseLockScreenProps) {
  const [lockKey, setLockKey] = useState("");
  const [lockLoading, setLockLoading] = useState(false);

  return (
    <TooltipProvider delayDuration={650} skipDelayDuration={150}>
      <div
        className="h-screen flex flex-col overflow-hidden font-cairo bg-background select-none"
        dir="rtl"
      >
        {!isMaximized && <WindowResizeHandles />}
        {/* الرأس الموحد للنافذة */}
        <header
          className={`border-b bg-card/85 backdrop-blur-xl no-print title-bar-draggable select-none transition-opacity duration-200 fluent-specular ${
            !isFocused ? "opacity-75" : ""
          }`}
          onDoubleClick={onMaximize}
        >
          <div className="flex items-center justify-between px-4 py-1.5 relative">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
              <h1 className="text-xs font-bold text-foreground/80">
                Grido Studio | تفعيل الترخيص
              </h1>
            </div>

            <div className="flex items-center gap-2 title-bar-controls">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleTheme}
                    className="gap-1.5 h-7 w-7 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted"
                  >
                    {theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-cairo text-xs font-semibold py-1 px-2.5">
                  {theme === "light" ? "الوضع الداكن" : "الوضع المضيء"}
                </TooltipContent>
              </Tooltip>

              <div className="w-px h-5 bg-border mx-1" />

              <WindowControls
                isMaximized={isMaximized}
                onMinimize={onMinimize}
                onMaximize={onMaximize}
                onClose={onClose}
              />
            </div>
          </div>
        </header>

        {/* شاشة التفعيل المركزية */}
        <div className="flex-1 flex items-center justify-center bg-background/95 backdrop-blur-2xl text-right p-6">
          <div className="w-full max-w-md bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 p-8 rounded-2xl shadow-xl space-y-6 text-center fluent-specular">
            <div className="inline-flex p-4 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 animate-pulse">
              <LockSimple className="w-10 h-10" weight="duotone" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-extrabold text-foreground">النسخة مقفلة</h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                انتهت الفترة التجريبية. يرجى إدخال مفتاح التفعيل للمتابعة.
              </p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!lockKey) return;
              setLockLoading(true);
              try {
                await onActivate(lockKey);
                toast.success("تم تفعيل الترخيص بنجاح! شكراً لك.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "فشل تفعيل الترخيص");
              } finally {
                setLockLoading(false);
              }
            }} className="space-y-4 text-right">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="license-key-input" className="text-xs font-semibold text-foreground">مفتاح الترخيص</label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setLockKey(text.trim().toUpperCase());
                          toast.success("تم لصق المفتاح من الحافظة");
                        }
                      } catch {
                        toast.error("يرجى لصق المفتاح يدوياً");
                      }
                    }}
                    className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    لصق من الحافظة
                  </button>
                </div>
                <div className="relative">
                  <Key className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-4 h-4" />
                  <input
                    id="license-key-input"
                    type="text"
                    required
                    placeholder="GRIDO-PRO-XXXX-XXXX-XXXX"
                    value={lockKey}
                    onChange={(e) => setLockKey(e.target.value.toUpperCase())}
                    className="w-full pr-9 pl-4 h-8 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono uppercase text-foreground"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs cursor-pointer shadow-xs gap-1.5 rounded-md" disabled={lockLoading}>
                {lockLoading ? (
                  <>
                    <Spinner className="w-3.5 h-3.5" size={14} />
                    <span>جاري التفعيل ...</span>
                  </>
                ) : (
                  "تفعيل الترخيص الفوري"
                )}
              </Button>
            </form>

            <div className="border-t border-border/40 pt-4 flex flex-col gap-2">
              <Button variant="outline" className="w-full text-xs font-semibold h-8 rounded-md cursor-pointer" onClick={onOpenAccount}>
                إدارة الحساب
              </Button>

              {user && user.token && (
                <Button variant="ghost" className="w-full text-xs text-red-500 hover:bg-red-500/5 h-8 rounded-md cursor-pointer" onClick={onLogout}>
                  تسجيل الخروج
                </Button>
              )}
            </div>
          </div>
          <AccountLicenseModal />
        </div>
      </div>
    </TooltipProvider>
  );
}
