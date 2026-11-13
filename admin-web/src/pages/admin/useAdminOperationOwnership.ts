import { useCallback, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminSessionOwner {
  epoch: number;
  client: SupabaseClient | null;
  authenticated: boolean;
}

export type AdminSessionOwnerRef = RefObject<AdminSessionOwner>;

/** Session revocation is synchronous; hook resets/unmounts have a separate lifecycle epoch.
 * Ordinary fetch request IDs must never invalidate a mutation in the same session.
 */
export function useAdminOperationOwnership(
  supabase: SupabaseClient | null,
  sessionOwnerRef: AdminSessionOwnerRef,
) {
  const lifecycleEpochRef = useRef(0);
  const mountedRef = useRef(false);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      lifecycleEpochRef.current += 1;
    };
  }, [supabase, sessionOwnerRef]);

  const invalidateOwnership = useCallback(() => {
    lifecycleEpochRef.current += 1;
  }, []);

  const captureOwner = useCallback(() => {
    const sessionEpoch = sessionOwnerRef.current.epoch;
    const lifecycleEpoch = lifecycleEpochRef.current;
    return () =>
      mountedRef.current &&
      lifecycleEpoch === lifecycleEpochRef.current &&
      sessionEpoch === sessionOwnerRef.current.epoch &&
      sessionOwnerRef.current.authenticated &&
      sessionOwnerRef.current.client === supabase &&
      supabase !== null;
  }, [supabase, sessionOwnerRef]);

  return { captureOwner, invalidateOwnership };
}
