import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

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
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center font-cairo" dir="rtl">
          <div className="max-w-md w-full bg-card border rounded-2xl p-6 shadow-xl space-y-4">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-foreground">عذراً، حدث خطأ غير متوقع</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              واجه التطبيق خطأً أثناء محاولة عرض الواجهة. يمكنك محاولة إعادة تحميل الصفحة أو مسح المسودة لبدء جلسة جديدة.
            </p>
            {this.state.error && (
              <div className="text-[10px] font-mono bg-muted p-3 rounded-lg text-left overflow-auto max-h-24 text-destructive border border-destructive/10">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex gap-2.5 justify-center pt-2">
              <Button onClick={this.handleReset} variant="default" size="sm" className="w-full">
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
