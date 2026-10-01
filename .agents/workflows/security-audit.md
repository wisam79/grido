# خطة وإجراءات الجولة الأمنية الدورية (Security Audit Workflow)

> **الهدف:** توفير مسار تدقيق دوري شامل للتحقق من أمان المصادقة، وتطهير السجلات، وفصل الأسرار، وسلامة الجلسات.

---

## 1. فحص حظر طباعة استجابات المصادقة في السجلات (Auth Log Sanitization)
تأكد من عدم وجود أي تمرير لنصوص الاستجابات الخام في مسارات المصادقة وتدوير التوكنات:
- ابحث عن أي استخدام لـ `string(body)` أو `resp.Body` في مسارات:
  - `internal/service/auth_flows.go`
  - `internal/service/license_service.go`
  - `internal/service/oauth_server.go`
- القاعدة: الاكتفاء بتسجيل نوع الخطأ، رمز الحالة، وطول الاستجابة بالبايتات (`bytes: len(body)`).

---

## 2. فحص تطابق سياسة كلمات المرور (Password Policy Parity)
تأكد من أن الحد الأدنى 8 أحرف واشتراط الحروف والأرقام معاً مطبق بتطابق تام في 3 مواضع:
1. الباك إند: `internal/service/auth_flows.go` (`validatePasswordStrength`).
2. الواجهة: `frontend/src/components/editor/dialogs/account/use-auth-forms.ts` (`validatePassword`).
3. تعريب الأخطاء: `internal/service/supabase_client.go` (`TranslateAuthError`).

---

## 3. فحص الجلسة الواحدة النشطة (Single Active Session Verification)
تأكد من سلامة آلية الطرد بنموذج (Last-Wins) وسماح عدم الاتصال:
- جدول `public.user_sessions` محمي بسياسة `FOR ALL USING (false)`.
- دالتا `claim_session` و `check_session` تعملان بصلاحية `SECURITY DEFINER` مع `auth.uid()`.
- انقطاع الشبكة في Go backend لا يطرد المستخدم (سماح عدم الاتصال).
- الطرد يحدث فقط عند إثبات استبدال الجلسة بجلسة أحدث (`ErrSessionSuperseded`).

---

## 4. فحص الأسرار المشتركة في الثنائي (No Shared Secrets Audit)
تأكد من عدم وجود أي مفاتيح أو أسرار مشتركة محقونة في الثنائي عبر `ldflags` أو الكود:
- التوثيق لخدمات الذكاء الاصطناعي (Modal) يعتمد حصراً على توكن المستخدم الفردي (`Authorization: Bearer <JWT>`).
- لا توجد متغيرات `MODAL_AI_KEY` أو `GetModalAIKey` في البناء أو الكود.

---

## 5. فحص الثغرات الأمنية في الاعتماديات (Dependency Security Audit)
فحص اعتماديات npm و Go:
```bash
npm --prefix frontend audit
npm --prefix admin-web audit
go vet ./internal/...
```
