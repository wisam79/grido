import { describe, it, expect } from 'vitest';

import { withDocumentRotation } from '../core/doc-rotation';

import type { DetectedDocument } from '../core/types';

const docs: DetectedDocument[] = [
  { id: 'a', corners: [], confidence: 1, label: 'A', aspectType: 'free', rotation: 0 },
  { id: 'b', corners: [], confidence: 1, label: 'B', aspectType: 'free', rotation: 90 },
];

describe('withDocumentRotation', () => {
  it('يضبط دوران المستند النشط فقط ويحافظ على ترتيب المستندات', () => {
    const result = withDocumentRotation(docs, 1, 180);

    expect(result.map((d) => d.id)).toEqual(['a', 'b']);
    expect(result[0].rotation).toBe(0);
    expect(result[1].rotation).toBe(180);
  });

  it('يعيد نفس المرجع للمستندات غير المستهدفة', () => {
    const result = withDocumentRotation(docs, 1, 270);

    expect(result[0]).toBe(docs[0]);
    expect(result[1]).not.toBe(docs[1]);
  });

  it('يتجاهل فهرساً خارج النطاق دون إسقاط أي مستند', () => {
    const result = withDocumentRotation(docs, 5, 90);

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(docs[0]);
    expect(result[1]).toBe(docs[1]);
  });
});
