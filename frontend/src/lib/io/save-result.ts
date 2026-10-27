export type SaveResultKind = 'success' | 'cancel' | 'error';

/**
 * نتيجة حفظ Wails (`SaveFileDialog` / `downloadBlob`): النص `'success'` للنجاح،
 * نص فارغ لإلغاء المستخدم من نافذة الحفظ، وأي نص آخر رسالة خطأ من الخلفية.
 */
export function classifySaveResult(result: string): SaveResultKind {
  if (result === 'success') return 'success';
  if (result === '') return 'cancel';
  return 'error';
}
