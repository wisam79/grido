package service

import (
	"fmt"
	"os"
	"os/exec"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// crash_restart.go — إعادة تشغيل التطبيق تلقائياً بعد انهيار مُميت
//
// العقد: العملية المنهارة تكتب تقريرها ثم تُطلق نسخة جديدة من نفس التنفيذي في
// عملية مستقلة تماماً، ثم تُنهي نفسها. النسخة الجديدة تحمل وسم
// CrashRelaunchFlag وتنتظر قليلاً قبل تهيئة Wails — وإلا سبقت العملية الميتة
// إلى قفل النسخة الواحدة (SingleInstance) فظنّت نفسها نسخة ثانية وهربت صامتة
// وحُرم المستخدم من التعافي. تقرير الانهيار يبقى على القرص، فيُعرض حوار
// استعادة المسودة في النسخة الجديدة.
// ─────────────────────────────────────────────────────────────────────────────

// CrashRelaunchFlag وسم سطر الأوامر الذي يميّز عملية أعيد تشغيلها بعد انهيار.
// أي إقلاع لا يحمل هذا الوسم يُعدّ إقلاعاً يدوياً ⇒ انتهت سلسلة الانهيارات.
const CrashRelaunchFlag = "--crash-relaunch"

// CrashRelaunchSettleDelay مهلة إفلات قفل النسخة الواحدة قبل تهيئة Wails.
// العملية المنهارة تُطلق الطفل ثم تُنهي نفسها عبر os.Exit فوراً (بلا انتظار
// ولا تنظيف)، فهذه المهلة هامش سخي يضمن أن القفل صار حراً — وتُدفع مرة واحدة
// فقط في مسار الانهيار.
const CrashRelaunchSettleDelay = 1500 * time.Millisecond

// IsCrashRelaunch يفحص وسائط سطر الأوامر لمعرفة إن كانت هذه عملية أعيد
// تشغيلها تلقائياً بعد انهيار.
func IsCrashRelaunch(args []string) bool {
	for _, arg := range args {
		if arg == CrashRelaunchFlag {
			return true
		}
	}
	return false
}

// defaultRestartProcess يُطلق نسخة جديدة من التطبيق مع نفس وسائط التشغيل
// (ملف مفتوح عبر «فتح بواسطة» مثلاً) في عملية معزولة لا تموت بموت العملية
// المنهارة. لا ينتظر الابن: لحظة إعادته صار مستقلاً.
func defaultRestartProcess() error {
	exe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve executable: %w", err)
	}

	// وسائط التشغيل الأصلية بلا تكرار للوسم (العملية الحالية قد تكون هي نفسها
	// إعادة تشغيل سابقة).
	args := make([]string, 0, len(os.Args))
	for _, arg := range os.Args[1:] {
		if arg == CrashRelaunchFlag {
			continue
		}
		args = append(args, arg)
	}
	args = append(args, CrashRelaunchFlag)

	cmd := exec.Command(exe, args...)
	cmd.Env = os.Environ()
	cmd.SysProcAttr = detachedSysProcAttr()
	// Stdin/Stdout/Stderr nil ⇒ /dev/null: الطفل بلا طرفية موروثة.

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start relaunch process: %w", err)
	}
	// المقبض يُحرَّر فوراً كي لا يبقى الطفل مرتبطاً بعمرنا؛ العملية نفسها تُنهى
	// بعد أسطر قليلة، فتحرير المقبض ليس شرطاً لبقاء الطفل حياً.
	_ = cmd.Process.Release()
	return nil
}
