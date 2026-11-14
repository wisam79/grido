import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import {
  createPhoneBridgePairingState,
  getPhoneBridgePairingView,
  updatePhoneBridgePairing,
  type PhoneBridgePairingEvent,
} from '../lib/phone-bridge-pairing';
import {
  Camera, SwitchCamera, Images, CheckCircle2, AlertCircle, RefreshCw,
  Info, Zap, ZapOff, Volume2, VolumeX, Sun, ShieldCheck,
} from 'lucide-react';

// القيم تُخبز وقت البناء من أسرار المستودع؛ لا سقوط مخبوز في المصدر.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface FocusPoint {
  x: number;
  y: number;
  id: number;
}
interface SessionOwner {
  sessionId: string;
}
interface PendingPhoto {
  blob: Blob;
  filename: string;
}

function detectDeviceModel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) {
    if (/iPhone1[4-6]/i.test(ua)) return 'iPhone Pro';
    return 'iPhone';
  } else if (/iPad/i.test(ua)) {
    return 'iPad';
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*?; ([^;)]+)\s*Build/i) || ua.match(/Android.*?; ([^;)]+)\)/i);
    if (match && match[1]) {
      const model = match[1].trim();
      return model.length > 20 ? model.substring(0, 20) : model;
    }
    return 'Android Phone';
  } else if (/Macintosh/i.test(ua)) {
    return 'Mac';
  } else if (/Windows/i.test(ua)) {
    return 'Windows PC';
  }
  return 'هاتف محمول';
}

function playShutterSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1600, now);
    osc1.frequency.exponentialRampToValueAtTime(180, now + 0.035);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.035);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(700, now + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(100, now + 0.075);
    gain2.gain.setValueAtTime(0.35, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.075);
  } catch {
    // قد يحجب المتصفح الصوت قبل تفاعل المستخدم.
  }
}

export default function PhoneCameraPage() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-400" aria-hidden="true" />
          <h1 className="text-lg font-bold">إعداد ناقص لصفحة الكاميرا</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            متغيرا البيئة{' '}
            <code className="font-mono text-amber-300">VITE_SUPABASE_URL</code> و{' '}
            <code className="font-mono text-amber-300">VITE_SUPABASE_ANON_KEY</code> مطلوبان وقت
            بناء الصفحة — يُضبطان من أسرار المستودع (SUPABASE_URL / SUPABASE_ANON_KEY).
          </p>
        </div>
      </div>
    );
  }
  return <PhoneCameraPageInner />;
}

function PhoneCameraPageInner() {
  const [session, setSession] = useState<SessionOwner>({ sessionId: '' });
  const sessionId = session.sessionId;
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [uploadQueueCount, setUploadQueueCount] = useState(0);
  const isUploading = uploadQueueCount > 0;
  const [failedUploadCount, setFailedUploadCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | null>(null);
  const [photosSent, setPhotosSent] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [recentThumbnail, setRecentThumbnail] = useState<string | null>(null);
  const [pairingState, setPairingState] = useState(() => createPhoneBridgePairingState(''));
  const pairingView = getPhoneBridgePairingView(pairingState, sessionId);
  const canChoosePhoto = Boolean(supabase) && pairingView.canUpload;
  const [zoomLevel, setZoomLevel] = useState(1);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCapturingRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef(false);
  // Object identity also invalidates A → B → A, before React's reset effects.
  const sessionOwnerRef = useRef<SessionOwner>({ sessionId: '' });
  const failedUploadsRef = useRef<PendingPhoto[]>([]);
  const retryOwnerRef = useRef<SessionOwner | null>(null);
  const thumbnailRef = useRef<string | null>(null);
  const cameraRequestRef = useRef(0);
  const isCurrentSession = useCallback((owner: SessionOwner) =>
    mountedRef.current && sessionOwnerRef.current === owner, []);

  useEffect(() => {
    mountedRef.current = true;
    const parseSessionId = () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const sessionFromHash = hashParams.get('session') || hashParams.get('token');
      if (sessionFromHash) return sessionFromHash;
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get('session') || searchParams.get('token') || '';
    };
    const updateSession = () => {
      const nextSessionId = parseSessionId();
      if (sessionOwnerRef.current.sessionId !== nextSessionId) {
        sessionOwnerRef.current = { sessionId: nextSessionId };
        failedUploadsRef.current = [];
        retryOwnerRef.current = null;
        setFailedUploadCount(0);
        setIsRetrying(false);
        setUploadQueueCount(0);
        setPhotosSent(0);
        if (thumbnailRef.current) URL.revokeObjectURL(thumbnailRef.current);
        thumbnailRef.current = null;
        setRecentThumbnail(null);
      }
      setSession(sessionOwnerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      setStatusMessage('');
      setStatusType(null);
    };
    updateSession();
    window.addEventListener('hashchange', updateSession);
    window.addEventListener('popstate', updateSession);
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      });
      setSupabase(client);
    }
    return () => {
      mountedRef.current = false;
      sessionOwnerRef.current = { sessionId: '' };
      failedUploadsRef.current = [];
      if (thumbnailRef.current) URL.revokeObjectURL(thumbnailRef.current);
      thumbnailRef.current = null;
      window.removeEventListener('hashchange', updateSession);
      window.removeEventListener('popstate', updateSession);
    };
  }, []);

  useEffect(() => {
    let wakeLockSentinel: { release: () => Promise<void> } | null = null;
    let active = true;
    const requestWakeLock = async () => {
      const nav = navigator as unknown as { wakeLock?: { request: (type: string) => Promise<{ release: () => Promise<void> }> } };
      if (nav.wakeLock && typeof nav.wakeLock.request === 'function') {
        try {
          const sentinel = await nav.wakeLock.request('screen');
          if (!active) { void sentinel.release().catch(() => {}); return; }
          if (wakeLockSentinel) void wakeLockSentinel.release().catch(() => {});
          wakeLockSentinel = sentinel;
        } catch {
          // يمكن أن يفشل إذا كانت البطارية منخفضة جداً.
        }
      }
    };
    void requestWakeLock();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockSentinel) void wakeLockSentinel.release().catch(() => {});
    };
  }, []);

  const showStatus = useCallback((msg: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage(msg);
    setStatusType(type);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage('');
      setStatusType(null);
    }, 3500);
  }, []);
  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
  }, []);

  // جاهزية النقل وإقرار سطح المكتب الاختياري مستقلان عن مصافحة التخزين.
  useEffect(() => {
    let isMounted = true;
    const owner = session;
    const isCurrent = () => isMounted && isCurrentSession(owner);
    let pairing = updatePhoneBridgePairing(createPhoneBridgePairingState(''), {
      type: 'session-changed', sessionId,
    });
    setPairingState(pairing);
    if (!supabase || !sessionId) return;
    const roomToken = sessionId.split('/').pop() || sessionId;
    const channel = supabase.channel(`phone-bridge:${roomToken}`, {
      config: { broadcast: { self: false, ack: true } },
    });
    channelRef.current = channel;
    const updatePairing = (event: PhoneBridgePairingEvent) => {
      if (!isCurrent()) return;
      pairing = updatePhoneBridgePairing(pairing, event);
      setPairingState(pairing);
    };
    // نستقبل paired-ack اختيارياً دون حجب العملاء القدامى.
    channel.on('broadcast', { event: 'paired-ack' }, (msg) => {
      updatePairing({
        type: 'desktop-ack', sessionId,
        channelGeneration: pairing.channelGeneration,
        device: msg?.payload?.device,
      });
    });
    channel.subscribe(async (status, subErr) => {
      if (!isCurrent()) return;
      if (status === 'SUBSCRIBED') {
        updatePairing({ type: 'channel-subscribed', sessionId });
        const channelGeneration = pairing.channelGeneration;
        const isCurrentSend = () => isCurrent()
          && pairing.channelStatus === 'subscribed'
          && pairing.channelGeneration === channelGeneration;
        // ack:true يؤكد استلام الخادم، وليس وصول الإشارة إلى سطح المكتب.
        try {
          const sendRes = await channel.send({
            type: 'broadcast', event: 'paired', payload: { device: detectDeviceModel() },
          });
          if (!isCurrentSend()) return;
          updatePairing({ type: 'server-ack', sessionId, channelGeneration, ready: sendRes === 'ok' });
          if (sendRes !== 'ok') {
            console.warn('Phone bridge broadcast ack failed:', sendRes);
            showStatus('تعذر تأكيد جاهزية قناة الإرسال؛ يمكنك محاولة رفع الصور', 'info');
          }
        } catch (sendErr) {
          if (!isCurrentSend()) return;
          updatePairing({ type: 'server-ack', sessionId, channelGeneration, ready: false });
          console.warn('Phone bridge broadcast error:', sendErr);
          showStatus('تعذر إرسال إشارة المصافحة عبر القناة؛ يمكنك محاولة رفع الصور', 'info');
        }
        return;
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        updatePairing({ type: 'channel-disconnected', sessionId });
        if (status !== 'CLOSED') console.warn('Phone bridge channel status error:', status, subErr);
        showStatus('قناة الإرسال منقطعة؛ يمكنك محاولة رفع الصور إلى التخزين', 'info');
      }
    });
    const performHandshake = async () => {
      const reportHandshakeFailure = (message: string) => {
        if (!isCurrent()) return;
        updatePairing({ type: 'handshake-result', sessionId, error: message });
        showStatus('تعذر رفع مصافحة JSON الاحتياطية', 'info');
      };
      try {
        const handshakeData = {
          device: detectDeviceModel(), platform: navigator.platform,
          userAgent: navigator.userAgent,
          screen: `${window.screen.width}x${window.screen.height}`,
          timestamp: Date.now(),
        };
        const blob = new Blob([JSON.stringify(handshakeData)], { type: 'application/json' });
        const { error } = await supabase.storage.from('phone-bridge')
          .upload(`${sessionId}/handshake_${Date.now()}.handshake.json`, blob, {
            contentType: 'application/json', upsert: false,
          });
        if (!isCurrent()) return;
        if (!error) {
          updatePairing({ type: 'handshake-result', sessionId, error: null });
        } else {
          console.warn('Pairing handshake upload failed:', error);
          reportHandshakeFailure(error.message || 'رفض الخادم رفع ملف مصافحة JSON');
        }
      } catch (err) {
        if (!isCurrent()) return;
        console.warn('Pairing handshake error:', err);
        reportHandshakeFailure(err instanceof Error ? err.message : 'خطأ في رفع مصافحة JSON');
      }
    };
    void performHandshake();
    return () => {
      isMounted = false;
      void channel.unsubscribe();
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [supabase, session, sessionId, showStatus, isCurrentSession]);

  const startCamera = useCallback(async () => {
    const request = ++cameraRequestRef.current;
    setHasCameraPermission(null);
    setTorchAvailable(false);
    setTorchActive(false);
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 3840 }, height: { ideal: 2160 },
        },
        audio: false,
      });
      if (!mountedRef.current || request !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setHasCameraPermission(true);
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && 'getCapabilities' in videoTrack) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const capabilities = (videoTrack as any).getCapabilities?.();
        setTorchAvailable(Boolean(capabilities?.torch));
      }
      setZoomLevel(1);
    } catch (err) {
      if (!mountedRef.current || request !== cameraRequestRef.current) return;
      console.warn('Live camera viewfinder not available, fallback to native camera input:', err);
      setHasCameraPermission(false);
    }
  }, [facingMode]);
  useEffect(() => {
    const requests = cameraRequestRef;
    void startCamera();
    return () => {
      ++requests.current;
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [startCamera]);
  // The video mounts only after permission resolves; attach the stream at that mount.
  const attachVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node) node.srcObject = streamRef.current;
  }, []);

  const toggleTorch = async () => {
    const stream = streamRef.current;
    const request = cameraRequestRef.current;
    const track = stream?.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        const next = !torchActive;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({ advanced: [{ torch: next }] });
        if (!mountedRef.current || streamRef.current !== stream || cameraRequestRef.current !== request) return;
        setTorchActive(next);
        if (typeof navigator.vibrate === 'function') navigator.vibrate(10);
      } catch (err) {
        console.warn('Torch toggle failed:', err);
      }
    }
  };
  const applyZoom = async (level: number) => {
    setZoomLevel(level);
    if (typeof navigator.vibrate === 'function') navigator.vibrate(8);
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({ advanced: [{ zoom: level }] });
      } catch {
        // التكبير الرقمي عبر CSS وCanvas بديل عند عدم دعم المستشعر.
      }
    }
  };
  const handleViewfinderTap = async (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    if (!hasCameraPermission) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let clientX: number;
    let clientY: number;
    if ('touches' in e) {
      const touch = e.touches.length > 0 ? e.touches[0] : e.changedTouches?.[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const pointId = Date.now();
    setFocusPoint({ x, y, id: pointId });
    if (typeof navigator.vibrate === 'function') navigator.vibrate(12);
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && 'applyConstraints' in track && rect.width > 0 && rect.height > 0) {
      try {
        const relX = Math.max(0, Math.min(1, x / rect.width));
        const relY = Math.max(0, Math.min(1, y / rect.height));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({
          advanced: [{ pointsOfInterest: [{ x: relX, y: relY }], focusMode: 'continuous' }],
        });
      } catch {
        // تجاهل القيود إن لم تكن مدعومة.
      }
    }
    setTimeout(() => {
      if (mountedRef.current) setFocusPoint((prev) => (prev?.id === pointId ? null : prev));
    }, 1800);
  };

  // Keep the original Blob and stable path for a manual retry; no automatic retry.
  const uploadImageBlob = async (photo: PendingPhoto, owner: SessionOwner): Promise<boolean> => {
    if (!supabase || !owner.sessionId || !isCurrentSession(owner)) return false;
    setUploadQueueCount((prev) => prev + 1);
    const filePath = `${owner.sessionId}/${photo.filename}`;
    try {
      const thumbUrl = URL.createObjectURL(photo.blob);
      if (thumbnailRef.current) URL.revokeObjectURL(thumbnailRef.current);
      thumbnailRef.current = thumbUrl;
      setRecentThumbnail(thumbUrl);
      const { error } = await supabase.storage.from('phone-bridge').upload(filePath, photo.blob, {
        contentType: photo.blob.type || 'image/jpeg', cacheControl: 'no-cache', upsert: false,
      });
      if (!isCurrentSession(owner)) return false;
      if (error) throw error;
      failedUploadsRef.current = failedUploadsRef.current.filter((entry) => entry !== photo);
      setFailedUploadCount(failedUploadsRef.current.length);
      setPhotosSent((prev) => prev + 1);
      // Broadcast failure must not requeue an already confirmed storage upload.
      try {
        if (channelRef.current) {
          void channelRef.current.send({
            type: 'broadcast', event: 'photo-ready', payload: { path: filePath },
          }).catch(() => {});
        }
      } catch {
        // Legacy desktop storage polling remains available.
      }
      try {
        if (typeof navigator.vibrate === 'function') navigator.vibrate([15, 35, 15]);
      } catch {
        // Optional haptics cannot turn confirmed storage success into a retry.
      }
      showStatus('تم رفع الصورة إلى التخزين', 'success');
      return true;
    } catch (err: unknown) {
      if (!isCurrentSession(owner)) return false;
      console.error('Upload error:', err);
      if (!failedUploadsRef.current.includes(photo)) failedUploadsRef.current.push(photo);
      setFailedUploadCount(failedUploadsRef.current.length);
      showStatus('تعذر رفع الصورة؛ احتُفظ بها لإعادة المحاولة ما دامت هذه الجلسة مفتوحة', 'error');
      return false;
    } finally {
      if (isCurrentSession(owner)) setUploadQueueCount((prev) => Math.max(0, prev - 1));
    }
  };
  const retryFailedUploads = async () => {
    const owner = sessionOwnerRef.current;
    if (!canChoosePhoto || !isCurrentSession(owner) || retryOwnerRef.current === owner) return;
    retryOwnerRef.current = owner;
    setIsRetrying(true);
    // Snapshot only failures, never successful images or a later session's queue.
    const pending = [...failedUploadsRef.current];
    try {
      for (const photo of pending) {
        if (!isCurrentSession(owner)) break;
        await uploadImageBlob(photo, owner);
      }
    } finally {
      if (retryOwnerRef.current === owner) {
        retryOwnerRef.current = null;
        if (isCurrentSession(owner)) setIsRetrying(false);
      }
    }
  };
  const handleCapture = async () => {
    const owner = sessionOwnerRef.current;
    if (!canChoosePhoto || !isCurrentSession(owner) || isCapturingRef.current) return;
    isCapturingRef.current = true;
    try {
      setFlashActive(true);
      setTimeout(() => { if (mountedRef.current) setFlashActive(false); }, 85);
      if (soundEnabled) playShutterSound();
      if (typeof navigator.vibrate === 'function') navigator.vibrate(18);
      if (hasCameraPermission && videoRef.current && videoRef.current.videoWidth > 0) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        let outW = vw;
        let outH = vh;
        const maxDim = 2048;
        if (outW > maxDim || outH > maxDim) {
          if (outW > outH) {
            outH = Math.round((vh * maxDim) / vw);
            outW = maxDim;
          } else {
            outW = Math.round((vw * maxDim) / vh);
            outH = maxDim;
          }
        }
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (zoomLevel > 1) {
            const cropW = vw / zoomLevel;
            const cropH = vh / zoomLevel;
            ctx.drawImage(video, (vw - cropW) / 2, (vh - cropH) / 2, cropW, cropH, 0, 0, outW, outH);
          } else {
            ctx.drawImage(video, 0, 0, vw, vh, 0, 0, outW, outH);
          }
          canvas.toBlob((blob) => {
            if (!isCurrentSession(owner)) return;
            if (blob) {
              void uploadImageBlob({
                blob, filename: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`,
              }, owner);
            } else {
              nativeCameraInputRef.current?.click();
            }
          }, 'image/jpeg', 0.82);
          return;
        }
      }
      nativeCameraInputRef.current?.click();
    } finally {
      setTimeout(() => { isCapturingRef.current = false; }, 350);
    }
  };
  const handleMultipleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const owner = sessionOwnerRef.current;
    const files = e.target.files;
    if (!e.target.disabled && canChoosePhoto && isCurrentSession(owner) && files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        void uploadImageBlob({
          blob: file, filename: `photo_${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
        }, owner);
      }
    }
    e.target.value = '';
  };
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    if (typeof navigator.vibrate === 'function') navigator.vibrate(10);
  };

  return (
    <div
      className="fixed inset-0 bg-black text-white font-sans select-none overflow-x-hidden overflow-y-auto flex flex-col justify-between"
      style={{
        paddingTop: 'max(8px, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(12px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(12px, env(safe-area-inset-right, 0px))',
        touchAction: 'manipulation',
      }}
      dir="rtl"
    >
      <div className={`fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150 ${flashActive ? 'opacity-100' : 'opacity-0'}`} />
      <input ref={nativeCameraInputRef} type="file" accept="image/*" capture="environment"
        aria-label="صور كاميرا النظام" disabled={!canChoosePhoto} className="hidden" onChange={handleMultipleFilesChange} />
      <input ref={galleryInputRef} type="file" accept="image/*" multiple
        aria-label="ملفات الصور" disabled={!canChoosePhoto} className="hidden" onChange={handleMultipleFilesChange} />

      <header className="w-full max-w-xl mx-auto flex flex-col items-center gap-2 z-30 shrink-0">
        <div className="w-full flex items-center justify-between gap-2 px-2">
          {torchAvailable ? (
            <button type="button" onClick={toggleTorch} aria-label="الفلاش" aria-pressed={torchActive}
              className={`coarse-touch-target shrink-0 w-9 h-9 rounded-full flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white transition-colors ${torchActive ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30' : 'bg-white/10 text-white/80'}`}>
              {torchActive ? <Zap className="w-4 h-4 fill-black" aria-hidden="true" /> : <ZapOff className="w-4 h-4" aria-hidden="true" />}
            </button>
          ) : <div className="w-9 h-9 shrink-0" />}
          <div className="min-w-0 flex flex-wrap justify-center items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/95 border border-white/15 shadow-2xl backdrop-blur-2xl transition-all duration-300">
            <span aria-hidden="true" className={`inline-flex rounded-full h-2 w-2 ${pairingView.transportReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-xs font-semibold tracking-wide text-neutral-100">Grido Studio</span>
            <span className="text-[10px] font-medium text-neutral-300" role="status">{pairingView.transportLabel}</span>
            {pairingView.desktopAcked && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                <span>{pairingView.desktopAckLabel}</span>
              </span>
            )}
          </div>
          <button type="button" onClick={() => {
            setSoundEnabled((prev) => !prev);
            if (typeof navigator.vibrate === 'function') navigator.vibrate(8);
          }} aria-label="صوت الغالق" aria-pressed={soundEnabled}
            className="coarse-touch-target shrink-0 w-9 h-9 rounded-full bg-white/10 text-white/80 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white">
            {soundEnabled ? <Volume2 className="w-4 h-4" aria-hidden="true" /> : <VolumeX className="w-4 h-4 text-neutral-400" aria-hidden="true" />}
          </button>
        </div>
        <p className="text-[10px] text-neutral-300 text-center">{pairingView.desktopAckDetail}</p>
        {pairingView.handshakeError && (
          <p className="text-xs text-amber-300 text-center">{pairingView.handshakeLabel}: {pairingView.handshakeError}</p>
        )}
        {statusMessage && (
          <div role={statusType === 'error' ? 'alert' : 'status'}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl text-xs font-semibold shadow-2xl backdrop-blur-3xl ${statusType === 'success' ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/40' : statusType === 'error' ? 'bg-rose-500/25 text-rose-200 border border-rose-500/40' : 'bg-white/15 text-neutral-100 border border-white/20'}`}>
            {statusType === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />}
            {statusType === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />}
            {statusType === 'info' && <Info className="w-4 h-4 text-neutral-300 shrink-0" aria-hidden="true" />}
            <span>{statusMessage}</span>
          </div>
        )}
        {isUploading && (
          <div role="status" className="flex items-center gap-2 text-xs text-neutral-300">
            <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <span>جارٍ رفع {uploadQueueCount} إلى التخزين...</span>
          </div>
        )}
        {failedUploadCount > 0 && (
          <button type="button" onClick={retryFailedUploads} disabled={isRetrying || !canChoosePhoto}
            className="coarse-touch-target px-4 py-2 rounded-full border border-amber-400/40 text-xs text-amber-200 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white">
            {isRetrying ? `جارٍ إعادة رفع الصور (${failedUploadCount})` : `إعادة رفع الصور المتعذرة (${failedUploadCount})`}
          </button>
        )}
      </header>

      <main onClick={handleViewfinderTap}
        className="relative flex-1 min-h-52 w-full my-2 rounded-[32px] overflow-hidden bg-neutral-950 border border-white/10 shadow-2xl flex items-center justify-center touch-pan-y select-none">
        {hasCameraPermission ? (
          <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
            <video ref={attachVideo} autoPlay playsInline muted
              className="w-full h-full object-cover transition-transform duration-200 ease-out" style={{ transform: `scale(${zoomLevel})` }} />
          </div>
        ) : (
          <div onClick={(e) => e.stopPropagation()} className="relative z-10 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <Camera className="w-10 h-10 text-white/80" aria-hidden="true" />
            <p role="status" className="text-sm font-semibold text-white">
              {hasCameraPermission === null ? 'جارٍ طلب إذن الكاميرا' : 'المعاينة غير متاحة: تحقق من إذن الكاميرا ودعم المتصفح'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={startCamera} disabled={hasCameraPermission === null}
                className="coarse-touch-target px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white">إعادة محاولة الكاميرا</button>
              <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={!canChoosePhoto}
                className="coarse-touch-target px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white">اختيار ملف صورة</button>
            </div>
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20">
          <div className="border-r border-b border-white/30" /><div className="border-r border-b border-white/30" /><div className="border-b border-white/30" />
          <div className="border-r border-b border-white/30" /><div className="border-r border-b border-white/30" /><div className="border-b border-white/30" />
          <div className="border-r border-white/30" /><div className="border-r border-white/30" /><div />
        </div>
        {focusPoint && (
          <div className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-150 animate-in fade-in zoom-in-75" style={{ left: focusPoint.x, top: focusPoint.y }}>
            <div className="w-14 h-14 border border-amber-400 rounded-xs shadow-md shadow-amber-400/20 relative">
              <Sun className="w-3.5 h-3.5 text-amber-400 absolute -right-5 top-0.5 opacity-90 animate-pulse" aria-hidden="true" />
            </div>
          </div>
        )}
        {hasCameraPermission && (
          <div onClick={(e) => e.stopPropagation()} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1 rounded-full bg-black/50 border border-white/15 backdrop-blur-md shadow-xl">
            {[1, 2, 3].map((lvl) => (
              <button key={lvl} type="button" onClick={() => applyZoom(lvl)} aria-label={`تكبير ${lvl}x`} aria-pressed={zoomLevel === lvl}
                className={`coarse-touch-target w-7 h-7 rounded-full text-[11px] font-bold transition-colors duration-150 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white ${zoomLevel === lvl ? 'bg-amber-400 text-black shadow-md' : 'text-neutral-300 hover:text-white'}`}>
                {lvl}x
              </button>
            ))}
          </div>
        )}
      </main>

      <div className="w-full max-w-md mx-auto flex justify-center py-1 z-30 shrink-0">
        <button type="button" onClick={() => {
          if (typeof navigator.vibrate === 'function') navigator.vibrate(12);
          nativeCameraInputRef.current?.click();
        }} disabled={!canChoosePhoto}
          className="coarse-touch-target flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-900 border border-white/20 text-neutral-200 text-xs font-medium backdrop-blur-2xl shadow-xl disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white">
          <Camera className="w-3.5 h-3.5 text-neutral-300 shrink-0" aria-hidden="true" /><span>كاميرا النظام</span>
        </button>
      </div>
      <footer className="w-full max-w-md mx-auto flex items-center justify-between gap-4 px-6 py-2 z-30 shrink-0">
        <button type="button" onClick={() => galleryInputRef.current?.click()} aria-label="اختيار من الصور" disabled={!canChoosePhoto}
          className="coarse-touch-target relative shrink-0 w-12 h-12 rounded-2xl bg-neutral-900 border border-white/20 flex items-center justify-center shadow-lg disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white">
          {recentThumbnail ? <img src={recentThumbnail} alt="" className="w-full h-full object-cover rounded-2xl" /> : <Images className="w-5 h-5 text-neutral-300" aria-hidden="true" />}
          {photosSent > 0 && <span aria-label={`رُفعت ${photosSent} صور إلى التخزين`} className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-black shadow">{photosSent}</span>}
        </button>
        <div className="relative flex items-center justify-center">
          <button type="button" onClick={handleCapture} aria-label="التقاط صورة" disabled={!canChoosePhoto}
            className="coarse-touch-target shrink-0 w-[76px] h-[76px] rounded-full border-[3.5px] border-white p-[3px] flex items-center justify-center shadow-2xl cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white">
            <div className="w-full h-full rounded-full bg-white shadow-md flex items-center justify-center">
              {isUploading && <RefreshCw className="w-6 h-6 text-black animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            </div>
          </button>
        </div>
        <button type="button" onClick={toggleCameraFacing} aria-label="تبديل الكاميرا"
          className="coarse-touch-target shrink-0 w-12 h-12 rounded-full bg-neutral-900/90 border border-white/20 flex items-center justify-center shadow-lg focus-visible:outline-2 focus-visible:outline-white">
          <SwitchCamera className="w-5 h-5 text-neutral-300" aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
}
