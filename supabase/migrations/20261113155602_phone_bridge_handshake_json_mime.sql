-- مصافحة الهاتف تستخدم JSON؛ لا يغيّر هذا الإصلاح خصوصية الحاوية أو سياسات الوصول.
-- هجرة محلية جاهزة للمراجعة، ولم تُطبّق على خدمة حية ضمن جلسة الإصلاح.
DO $$
DECLARE
    updated_count integer;
BEGIN
    UPDATE storage.buckets
    SET allowed_mime_types = CASE
        WHEN allowed_mime_types IS NULL THEN NULL
        WHEN 'application/json' = ANY(allowed_mime_types) THEN allowed_mime_types
        ELSE array_append(allowed_mime_types, 'application/json')
    END
    WHERE id = 'phone-bridge';

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> 1 THEN
        RAISE EXCEPTION 'phone-bridge bucket must exist before enabling JSON handshakes';
    END IF;
END $$;
