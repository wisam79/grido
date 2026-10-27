import type { DetectedDocument } from './types';

/** يعيد المستندات مع ضبط دوران المستند النشط فقط — بلا مساس بباقي العناصر. */
export function withDocumentRotation(
  docs: DetectedDocument[],
  docIndex: number,
  rotation: number,
): DetectedDocument[] {
  return docs.map((doc, idx) => (idx === docIndex ? { ...doc, rotation } : doc));
}
