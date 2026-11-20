import React, { Component } from 'react';

import { LogFrontendError } from '@bindings/grido/app';

import { Button } from '@/components/ui/button';
import { WarningOctagon } from '@/components/ui/icons';
import { clearAutoSave } from '@/hooks/use-autosave';
import { createLogger } from '@/lib/logger';

import type { ErrorInfo, ReactNode } from 'react';

const log = createLogger('ErrorBoundary');

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isClearing: boolean;
  clearError: string | null;
  showClearConfirmation: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isClearing: false,
    clearError: null,
    showClearConfirmation: false,
  };
  private isMounted = false;
  private clearingDraft = false;

  public componentDidMount() {
    this.isMounted = true;
  }

  public componentWillUnmount() {
    this.isMounted = false;
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error('Uncaught error:', error, errorInfo);
    void LogFrontendError(
      'error',
      `React ErrorBoundary: ${error.message}`,
      error.stack + '\n\nComponent Stack:\n' + errorInfo.componentStack,
    ).catch((backendError) => {
      log.error('Failed to log to backend:', backendError);
    });
  }

  private handleReset = () => {
    window.location.reload();
  };

  private handleClearDraftAndReload = async () => {
    if (this.clearingDraft || !this.state.showClearConfirmation) return;
    this.clearingDraft = true;
    this.setState({ isClearing: true, clearError: null });
    try {
      const cleared = await clearAutoSave();
      if (!this.isMounted) return;
      if (!cleared) {
        this.setState({ clearError: 'تغيّر المستند أثناء الانتظار. لم تُحذف المسودة.' });
        return;
      }
      window.location.reload();
    } catch (error) {
      log.error('Failed to clear autosave draft:', error);
      if (this.isMounted) {
        this.setState({ clearError: 'تعذّر مسح المسودة. لم تُعَد تهيئة التطبيق؛ حاول مرة أخرى.' });
      }
    } finally {
      this.clearingDraft = false;
      if (this.isMounted) this.setState({ isClearing: false });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center font-cairo"
          dir="rtl"
        >
          <div className="max-w-md w-full bg-card border border-border/80 dark:border-white/10 rounded-xl p-6 shadow-fluent-16 space-y-4 fluent-specular">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
              <WarningOctagon className="w-6 h-6 shrink-0" weight="duotone" />
            </div>
            <h1 className="text-base font-bold text-foreground">حدث خطأ غير متوقع</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              فشل عرض الواجهة. أعد التحميل أو امسح المسودة.
            </p>
            {this.state.error && (
              // ltr-island: نص تقني إنجليزي (stack) — dir ثابت ومحاذاة فيزيائية عمداً
              <div
                dir="ltr"
                className="text-micro font-mono bg-muted p-3 rounded-md text-left overflow-auto max-h-24 text-destructive border border-destructive/10"
              >
                {this.state.error.toString()}
              </div>
            )}
            {this.state.showClearConfirmation && (
              <div className="space-y-2 border border-destructive/30 rounded-md p-3">
                <p className="text-xs text-muted-foreground">
                  سيُحذف ملف الحفظ التلقائي للعمل غير المحفوظ. المشاريع المحفوظة لن تُحذف.
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={this.state.isClearing}
                    onClick={() => this.setState({ showClearConfirmation: false })}
                  >
                    إلغاء
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={this.state.isClearing}
                    onClick={() => void this.handleClearDraftAndReload()}
                  >
                    تأكيد مسح المسودة
                  </Button>
                </div>
              </div>
            )}
            {this.state.clearError && (
              <p role="alert" className="text-xs text-destructive">
                {this.state.clearError}
              </p>
            )}
            <div className="flex gap-2.5 justify-center pt-2">
              <Button
                onClick={this.handleReset}
                disabled={this.state.isClearing}
                variant="default"
                size="sm"
                className="flex-1 h-8 rounded-md text-xs font-bold shadow-xs"
              >
                إعادة تحميل التطبيق
              </Button>
              <Button
                onClick={() => this.setState({ showClearConfirmation: true, clearError: null })}
                disabled={this.state.isClearing}
                variant="outline"
                size="sm"
                className="h-8 rounded-md text-xs font-semibold"
              >
                مسح المسودة وإعادة التحميل
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
