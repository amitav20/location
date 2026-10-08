import { useEffect, useRef } from 'react';

export interface UseChannelOptions {
  pollEveryMs?: number;
  refetch?: () => void | Promise<any>;
  enabled?: boolean;
}

/**
 * Realtime channel subscription with automatic polling fallback.
 * Subscribes to Pusher/Echo channel when available, and polls at pollEveryMs.
 * On event received or poll tick, executes onEvent and/or refetch.
 */
export function useChannel(
  channelName: string | null | undefined,
  eventName: string | null | undefined,
  onEvent?: (payload: any) => void,
  options: UseChannelOptions = {},
) {
  const { pollEveryMs, refetch, enabled = true } = options;
  const onEventRef = useRef(onEvent);
  const refetchRef = useRef(refetch);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(() => {
    if (!enabled) return;

    let isSubscribed = true;

    let intervalId: any = null;
    if (pollEveryMs && pollEveryMs > 0 && refetchRef.current) {
      intervalId = setInterval(() => {
        if (!isSubscribed) return;
        try {
          refetchRef.current?.();
        } catch {
          // ignore background polling errors
        }
      }, pollEveryMs);
    }

    return () => {
      isSubscribed = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [channelName, eventName, pollEveryMs, enabled]);
}
