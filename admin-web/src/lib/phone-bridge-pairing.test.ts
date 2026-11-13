import { describe, expect, it } from 'vitest';
import {
  createPhoneBridgePairingState,
  getPhoneBridgePairingView,
  updatePhoneBridgePairing,
} from './phone-bridge-pairing';

const sessionId = 'user/session-a';

function subscribedState() {
  return updatePhoneBridgePairing(createPhoneBridgePairingState(sessionId), {
    type: 'channel-subscribed', sessionId,
  });
}

function acknowledgedState() {
  let state = subscribedState();
  state = updatePhoneBridgePairing(state, {
    type: 'server-ack', sessionId, channelGeneration: state.channelGeneration, ready: true,
  });
  return updatePhoneBridgePairing(state, {
    type: 'desktop-ack', sessionId, channelGeneration: state.channelGeneration, device: ' Studio PC ',
  });
}

describe('phone bridge readiness and optional desktop acknowledgement', () => {
  it('starts without transport or desktop confirmation and allows legacy uploads', () => {
    const view = getPhoneBridgePairingView(createPhoneBridgePairingState(sessionId), sessionId);
    expect(view.transportReady).toBe(false);
    expect(view.desktopAcked).toBe(false);
    expect(view.canUpload).toBe(true);
    expect(view.transportLabel).toBe('جارٍ تجهيز قناة الإرسال');
    expect(view.desktopAckLabel).toBe('لم يرد تأكيد سطح المكتب');
    expect(view.desktopAckDetail).toContain('غيابه لا يمنع التصوير أو رفع الصور');
  });

  it('does not infer readiness or desktop receipt from subscription alone', () => {
    const view = getPhoneBridgePairingView(subscribedState(), sessionId);
    expect(view.transportReady).toBe(false);
    expect(view.desktopAcked).toBe(false);
    expect(view.transportLabel).toBe('لم تُؤكد جاهزية الإرسال');
    expect(view.canUpload).toBe(true);
  });

  it('treats a successful server ack as transport readiness, not desktop pairing', () => {
    const state = subscribedState();
    const ready = updatePhoneBridgePairing(state, {
      type: 'server-ack', sessionId, channelGeneration: state.channelGeneration, ready: true,
    });
    const view = getPhoneBridgePairingView(ready, sessionId);
    expect(view.transportReady).toBe(true);
    expect(view.transportLabel).toBe('قناة الإرسال جاهزة');
    expect(view.desktopAcked).toBe(false);
    expect(ready.desktopDeviceName).toBe('');
    expect(view.canUpload).toBe(true);
  });

  it('records a sent storage handshake without claiming readiness or connection', () => {
    const sent = updatePhoneBridgePairing(createPhoneBridgePairingState(sessionId), {
      type: 'handshake-result', sessionId, error: null,
    });
    const view = getPhoneBridgePairingView(sent, sessionId);
    expect(view.handshakeLabel).toBe('أُرسلت مصافحة التخزين');
    expect(view.transportReady).toBe(false);
    expect(view.desktopAcked).toBe(false);
    expect(view.canUpload).toBe(true);
  });

  it('does not infer desktop receipt even when both transport and handshake succeed', () => {
    let state = subscribedState();
    state = updatePhoneBridgePairing(state, {
      type: 'server-ack', sessionId, channelGeneration: state.channelGeneration, ready: true,
    });
    state = updatePhoneBridgePairing(state, { type: 'handshake-result', sessionId, error: null });
    expect(getPhoneBridgePairingView(state, sessionId)).toMatchObject({
      transportReady: true, desktopAcked: false, canUpload: true,
    });
  });

  it('only an explicit desktop ack records desktop receipt without claiming liveness', () => {
    const state = subscribedState();
    const acked = updatePhoneBridgePairing(state, {
      type: 'desktop-ack', sessionId, channelGeneration: state.channelGeneration, device: ' Studio PC ',
    });
    const view = getPhoneBridgePairingView(acked, sessionId);
    expect(view.desktopAcked).toBe(true);
    expect(view.desktopAckLabel).toBe('ورد تأكيد سطح المكتب');
    expect(view.desktopAckDetail).toContain('(Studio PC)');
    expect(view.desktopAckDetail).toContain('لا يثبت استمرار اتصال سطح المكتب');
    expect(view.transportReady).toBe(false);
  });

  it.each([undefined, null, 42, {}, '   '])('does not invent a desktop name for payload %j', (device) => {
    const state = subscribedState();
    const acked = updatePhoneBridgePairing(state, {
      type: 'desktop-ack', sessionId, channelGeneration: state.channelGeneration, device,
    });
    expect(acked.desktopAcked).toBe(true);
    expect(acked.desktopDeviceName).toBe('');
    expect(getPhoneBridgePairingView(acked, sessionId).desktopAckDetail).not.toContain('(');
  });

  it('does not block upload when server ack fails or optional desktop ack is absent', () => {
    const state = subscribedState();
    const failed = updatePhoneBridgePairing(state, {
      type: 'server-ack', sessionId, channelGeneration: state.channelGeneration, ready: false,
    });
    expect(getPhoneBridgePairingView(failed, sessionId)).toMatchObject({
      transportReady: false, desktopAcked: false, canUpload: true,
    });
  });

  it.each([false, true])('reports JSON fallback rejection separately with transport ready=%s', (ready) => {
    let state = subscribedState();
    state = updatePhoneBridgePairing(state, {
      type: 'server-ack', sessionId, channelGeneration: state.channelGeneration, ready,
    });
    state = updatePhoneBridgePairing(state, {
      type: 'handshake-result', sessionId, error: 'mime type application/json is not supported',
    });
    const view = getPhoneBridgePairingView(state, sessionId);
    expect(view.handshakeLabel).toBe('تعذر رفع مصافحة JSON الاحتياطية');
    expect(view.handshakeError).toBe('mime type application/json is not supported');
    expect(view.transportReady).toBe(ready);
    expect(view.desktopAcked).toBe(false);
    expect(view.canUpload).toBe(true);
  });

  it('preserves the independent desktop observation when fallback or server ack fails', () => {
    let state = acknowledgedState();
    state = updatePhoneBridgePairing(state, {
      type: 'handshake-result', sessionId, error: 'JSON rejected',
    });
    state = updatePhoneBridgePairing(state, {
      type: 'server-ack', sessionId, channelGeneration: state.channelGeneration, ready: false,
    });
    expect(getPhoneBridgePairingView(state, sessionId)).toMatchObject({
      transportReady: false, desktopAcked: true, handshakeError: 'JSON rejected', canUpload: true,
    });
  });
});

describe('phone bridge session and disconnect lifecycle', () => {
  it('clears readiness, ack and device on disconnect even after a sent handshake', () => {
    let state = acknowledgedState();
    state = updatePhoneBridgePairing(state, { type: 'handshake-result', sessionId, error: null });
    state = updatePhoneBridgePairing(state, { type: 'channel-disconnected', sessionId });
    const view = getPhoneBridgePairingView(state, sessionId);
    expect(state.desktopDeviceName).toBe('');
    expect(view).toMatchObject({
      transportReady: false,
      desktopAcked: false,
      transportLabel: 'القناة منقطعة',
      handshakeLabel: 'أُرسلت مصافحة التخزين',
      canUpload: true,
    });
  });

  it('ignores late server and desktop ack after disconnect', () => {
    const old = acknowledgedState();
    const disconnected = updatePhoneBridgePairing(old, { type: 'channel-disconnected', sessionId });
    expect(updatePhoneBridgePairing(disconnected, {
      type: 'server-ack', sessionId, channelGeneration: old.channelGeneration, ready: true,
    })).toBe(disconnected);
    expect(updatePhoneBridgePairing(disconnected, {
      type: 'desktop-ack', sessionId, channelGeneration: old.channelGeneration, device: 'Old PC',
    })).toBe(disconnected);
  });

  it('ignores a previous subscription send result after reconnection', () => {
    const old = acknowledgedState();
    const disconnected = updatePhoneBridgePairing(old, { type: 'channel-disconnected', sessionId });
    const reconnected = updatePhoneBridgePairing(disconnected, { type: 'channel-subscribed', sessionId });
    expect(updatePhoneBridgePairing(reconnected, {
      type: 'server-ack', sessionId, channelGeneration: old.channelGeneration, ready: true,
    })).toBe(reconnected);
    expect(updatePhoneBridgePairing(reconnected, {
      type: 'desktop-ack', sessionId, channelGeneration: old.channelGeneration, device: 'Old PC',
    })).toBe(reconnected);
    expect(getPhoneBridgePairingView(reconnected, sessionId)).toMatchObject({
      transportReady: false, desktopAcked: false,
    });
    const ready = updatePhoneBridgePairing(reconnected, {
      type: 'server-ack', sessionId, channelGeneration: reconnected.channelGeneration, ready: true,
    });
    expect(getPhoneBridgePairingView(ready, sessionId)).toMatchObject({
      transportReady: true, desktopAcked: false,
    });
  });

  it('keeps disconnect status when an in-flight storage handshake subsequently succeeds', () => {
    const disconnected = updatePhoneBridgePairing(acknowledgedState(), {
      type: 'channel-disconnected', sessionId,
    });
    const sent = updatePhoneBridgePairing(disconnected, { type: 'handshake-result', sessionId, error: null });
    expect(getPhoneBridgePairingView(sent, sessionId)).toMatchObject({
      transportReady: false, desktopAcked: false, transportLabel: 'القناة منقطعة',
    });
  });

  it.each(['user/session-b', sessionId])('resets every observation for a replacement session %s', (nextSession) => {
    let state = acknowledgedState();
    state = updatePhoneBridgePairing(state, { type: 'handshake-result', sessionId, error: 'Old error' });
    const next = updatePhoneBridgePairing(state, { type: 'session-changed', sessionId: nextSession });
    expect(next).toMatchObject({
      sessionId: nextSession, channelStatus: 'connecting', transportReady: false,
      desktopAcked: false, desktopDeviceName: '', handshakeStatus: 'pending', handshakeError: null,
    });
    expect(next.channelGeneration).toBeGreaterThan(state.channelGeneration);
  });

  it('hides previous-session indicators immediately before the replacement effect runs', () => {
    let state = acknowledgedState();
    state = updatePhoneBridgePairing(state, { type: 'handshake-result', sessionId, error: 'Old JSON error' });
    expect(getPhoneBridgePairingView(state, 'user/session-b')).toMatchObject({
      transportReady: false, desktopAcked: false, handshakeLabel: null,
      handshakeError: null, canUpload: true,
    });
  });

  it('ignores old-session events even if the room token suffix matches', () => {
    const nextSession = 'another-user/session-a';
    const state = createPhoneBridgePairingState(nextSession);
    expect(updatePhoneBridgePairing(state, { type: 'channel-subscribed', sessionId })).toBe(state);
    expect(updatePhoneBridgePairing(state, { type: 'channel-disconnected', sessionId })).toBe(state);
    expect(updatePhoneBridgePairing(state, { type: 'handshake-result', sessionId, error: null })).toBe(state);
    expect(updatePhoneBridgePairing(state, {
      type: 'server-ack', sessionId, channelGeneration: state.channelGeneration, ready: true,
    })).toBe(state);
    expect(updatePhoneBridgePairing(state, {
      type: 'desktop-ack', sessionId, channelGeneration: state.channelGeneration, device: 'Old PC',
    })).toBe(state);
  });

  it('only blocks upload for missing session, not missing ack', () => {
    expect(getPhoneBridgePairingView(acknowledgedState(), '')).toMatchObject({
      canUpload: false, transportReady: false, desktopAcked: false,
      transportLabel: 'الجلسة مفقودة', handshakeLabel: null, handshakeError: null,
    });
  });
});
