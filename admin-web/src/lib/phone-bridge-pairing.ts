export interface PhoneBridgePairingState {
  sessionId: string;
  channelGeneration: number;
  channelStatus: 'connecting' | 'subscribed' | 'disconnected';
  transportReady: boolean;
  desktopAcked: boolean;
  desktopDeviceName: string;
  handshakeStatus: 'pending' | 'sent' | 'failed';
  handshakeError: string | null;
}

export type PhoneBridgePairingEvent =
  | { type: 'session-changed'; sessionId: string }
  | { type: 'channel-subscribed' | 'channel-disconnected'; sessionId: string }
  | { type: 'server-ack'; sessionId: string; channelGeneration: number; ready: boolean }
  | { type: 'desktop-ack'; sessionId: string; channelGeneration: number; device?: unknown }
  | { type: 'handshake-result'; sessionId: string; error: string | null };

export function createPhoneBridgePairingState(sessionId: string): PhoneBridgePairingState {
  return {
    sessionId,
    channelGeneration: 0,
    channelStatus: 'connecting',
    transportReady: false,
    desktopAcked: false,
    desktopDeviceName: '',
    handshakeStatus: 'pending',
    handshakeError: null,
  };
}

// These are observations of transport/server receipt, not proof of desktop liveness.
export function updatePhoneBridgePairing(
  state: PhoneBridgePairingState,
  event: PhoneBridgePairingEvent,
): PhoneBridgePairingState {
  if (event.type === 'session-changed') {
    return {
      ...createPhoneBridgePairingState(event.sessionId),
      channelGeneration: state.channelGeneration + 1,
    };
  }
  if (event.sessionId !== state.sessionId) return state;

  switch (event.type) {
    case 'channel-subscribed':
    case 'channel-disconnected':
      return {
        ...state,
        channelGeneration: state.channelGeneration + 1,
        channelStatus: event.type === 'channel-subscribed' ? 'subscribed' : 'disconnected',
        transportReady: false,
        desktopAcked: false,
        desktopDeviceName: '',
      };
    case 'server-ack':
    case 'desktop-ack':
      // A send promise may settle after a disconnect or a subsequent subscription.
      if (state.channelStatus !== 'subscribed' || event.channelGeneration !== state.channelGeneration) {
        return state;
      }
      return event.type === 'server-ack'
        ? { ...state, transportReady: event.ready }
        : {
            ...state,
            desktopAcked: true,
            desktopDeviceName: typeof event.device === 'string' ? event.device.trim() : '',
          };
    case 'handshake-result':
      return {
        ...state,
        handshakeStatus: event.error === null ? 'sent' : 'failed',
        handshakeError: event.error,
      };
  }
}

export function getPhoneBridgePairingView(state: PhoneBridgePairingState, sessionId: string) {
  // Hide the old session immediately, before React runs the replacement effect.
  const current = state.sessionId === sessionId ? state : createPhoneBridgePairingState(sessionId);
  const transportReady = current.channelStatus === 'subscribed' && current.transportReady;
  const desktopAcked = current.channelStatus === 'subscribed' && current.desktopAcked;

  return {
    // Legacy desktop clients do not send paired-ack; uploads must not depend on it.
    canUpload: Boolean(sessionId),
    transportReady,
    transportLabel: !sessionId
      ? 'الجلسة مفقودة'
      : current.channelStatus === 'disconnected'
        ? 'القناة منقطعة'
        : transportReady
          ? 'قناة الإرسال جاهزة'
          : current.channelStatus === 'subscribed'
            ? 'لم تُؤكد جاهزية الإرسال'
            : 'جارٍ تجهيز قناة الإرسال',
    desktopAcked,
    desktopAckLabel: desktopAcked ? 'ورد تأكيد سطح المكتب' : 'لم يرد تأكيد سطح المكتب',
    desktopAckDetail: desktopAcked
      ? `تأكيد مستلم${current.desktopDeviceName ? ` (${current.desktopDeviceName})` : ''}؛ لا يثبت استمرار اتصال سطح المكتب.`
      : 'تأكيد سطح المكتب اختياري؛ غيابه لا يمنع التصوير أو رفع الصور.',
    handshakeLabel: current.handshakeStatus === 'sent'
      ? 'أُرسلت مصافحة التخزين'
      : current.handshakeStatus === 'failed'
        ? 'تعذر رفع مصافحة JSON الاحتياطية'
        : null,
    handshakeError: current.handshakeError,
  };
}
