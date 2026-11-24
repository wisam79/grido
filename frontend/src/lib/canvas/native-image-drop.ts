export type NativeImageDropPayload =
  | { phase: 'start'; dropId: string; x?: number; y?: number }
  | { phase: 'complete'; dropId: string; images: string[] }
  | { phase?: undefined; images: string[]; x?: number; y?: number };

type NativeImageDropHandler = (payload: NativeImageDropPayload) => boolean;

let currentOwner: { handler: NativeImageDropHandler } | undefined;

/** The mounted canvas is the sole owner; stale cleanup cannot unregister its successor. */
export function registerNativeImageDropHandler(handler: NativeImageDropHandler): () => void {
  const owner = { handler };
  currentOwner = owner;
  return () => {
    if (currentOwner === owner) currentOwner = undefined;
  };
}

/**
 * Phased requests never fall back to receipt-time imports, even without an owner.
 * Handler errors propagate to the runtime listener's logger, never to a second importer.
 */
export function dispatchNativeImageDrop(payload: NativeImageDropPayload): boolean {
  const handled = currentOwner?.handler(payload) ?? false;
  return payload.phase === 'start' || payload.phase === 'complete' || handled;
}
