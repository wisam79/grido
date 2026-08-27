import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { HugeIcon } from "@/components/ui/huge-icon";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { LogFrontendError } from "../../wailsjs/go/main/App";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    // Send it to the backend log
    try {
      LogFrontendError("error", `React ErrorBoundary: ${error.message}`, error.stack + "\n\nComponent Stack:\n" + errorInfo.componentStack);
    } catch(e) {
      console.error("Failed to log to backend:", e);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center font-cairo" dir="rtl">
          <div className="max-w-md w-full bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 rounded-2xl p-6 shadow-xl space-y-4 fluent-specular">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
              <HugeIcon icon={Alert02Icon} size={24} />
            </div>
            <h1 className="text-base font-bold text-foreground">عذراً، حدث خطأ غير متوقع</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              واجه التطبيق خطأً أثناء محاولة عرض الواجهة. يمكنك محاولة إعادة تحميل الصفحة أو مسح المسودة لبدء جلسة جديدة.
            </p>
            {this.state.error && (
              <div className="text-[10px] font-mono bg-muted p-3 rounded-md text-left overflow-auto max-h-24 text-destructive border border-destructive/10">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex gap-2.5 justify-center pt-2">
              <Button onClick={this.handleReset} variant="default" size="sm" className="w-full h-8 rounded-md text-xs font-bold shadow-xs">
                إعادة تحميل التطبيق
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
