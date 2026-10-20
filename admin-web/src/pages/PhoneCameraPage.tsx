import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { 
  Camera, 
  SwitchCamera, 
  Images, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Info,
  Zap,
  ZapOff,
  Volume2,
  VolumeX,
  Sun,
  ShieldCheck
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mvovehnyvoiawvwaurav.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12b3ZlaG55dm9pYXd2d2F1cmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Nzg2MjQsImV4cCI6MjA5OTM1NDYyNH0.DrZxhJkwjHrk1qP1kJ6JtwAo5AJZegOvFol2L-pGuUg';

interface FocusPoint {
  x: number;
  y: number;
  id: number;
}

// دالة التعرف الذكي على نوع وطراز الجهاز للمصادقة وتأكيد الاقتران
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

// صوت نقرة غالق الكاميرا الفيزيائي الميكانيكي عبر Web Audio API
function playShutterSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // النقرة الأولى: صوت تحرير شفرات الغالق المعدنية (High Snap)
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

    // النقرة الثانية: صوت إغلاق ستارة الغالق الميكانيكية بعد 40ms
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
    // تجاهل القيود إن حجب المتصفح الصوت قبل تفاعل المستخدم
  }
}

export default function PhoneCameraPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadQueueCount, setUploadQueueCount] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | null>(null);
  const [photosSent, setPhotosSent] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [recentThumbnail, setRecentThumbnail] = useState<string | null>(null);

  // إعدادات الكاميرا المتقدمة (Apple Camera Features)
  const [isPaired, setIsPaired] = useState<boolean>(false);
  const [pairedDeviceName, setPairedDeviceName] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchActive, setTorchActive] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCapturingRef = useRef<boolean>(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 1. استخراج معرف الجلسة من رابط الصفحة وتفعيل عميل Supabase
  useEffect(() => {
    const parseSessionId = () => {
      // قراءة الـ hash أولاً (#session=xyz) لخصوصية تامة بدون إرسالها للهيدر
      const hash = window.location.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hash);
      const sessionFromHash = hashParams.get('session') || hashParams.get('token');

      if (sessionFromHash) {
        return sessionFromHash;
      }

      // بديل عبر معاملات البحث (?session=xyz)
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get('session') || searchParams.get('token') || '';
    };

    const token = parseSessionId();
    setSessionId(token);

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      });
      setSupabase(client);
    }
  }, []);

  // 2. قفل الشاشة لمنع الإغلاق التلقائي أثناء جلسة التصوير (Screen Wake Lock API)
  useEffect(() => {
    let wakeLockSentinel: { release: () => Promise<void> } | null = null;
    const requestWakeLock = async () => {
      const nav = navigator as unknown as { wakeLock?: { request: (type: string) => Promise<{ release: () => Promise<void> }> } };
      if (nav.wakeLock && typeof nav.wakeLock.request === 'function') {
        try {
          wakeLockSentinel = await nav.wakeLock.request('screen');
        } catch {
          // يمكن أن يفشل إذا كانت البطارية منخفضة جداً
        }
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, []);

  // 3. ربط قناة Realtime اللحظية (Push Events مثل WhatsApp) ومصافحة الاقتران
  useEffect(() => {
    if (!supabase || !sessionId) return;

    let isMounted = true;
    const roomToken = sessionId.split('/').pop() || sessionId;
    const channelTopic = `phone-bridge:${roomToken}`;
    const channel = supabase.channel(channelTopic, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = channel;

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' && isMounted) {
        const device = detectDeviceModel();
        setPairedDeviceName(device);
        setIsPaired(true);

        // إرسال إشعار الاقتران اللحظي المباشر للكمبيوتر عبر WebSocket
        channel.send({
          type: 'broadcast',
          event: 'paired',
          payload: { device },
        });
      }
    });

    const performHandshake = async () => {
      try {
        const device = detectDeviceModel();
        if (isMounted) {
          setPairedDeviceName(device);
        }

        const handshakeData = {
          device,
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          screen: `${window.screen.width}x${window.screen.height}`,
          timestamp: Date.now(),
        };

        const blob = new Blob([JSON.stringify(handshakeData)], { type: 'application/json' });
        const { error } = await supabase.storage
          .from('phone-bridge')
          .upload(`${sessionId}/.handshake.json`, blob, {
            contentType: 'application/json',
            upsert: true,
          });

        if (!error && isMounted) {
          setIsPaired(true);
        }
      } catch (err) {
        console.warn('Pairing handshake error:', err);
      }
    };

    performHandshake();

    return () => {
      isMounted = false;
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [supabase, sessionId]);

  // 4. تفعيل كاميرا الهاتف المباشرة (Live Viewfinder) مع قراءة قدرات المستشعر
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);

      // استكشاف قدرات الفلاش (Torch) والزوم الميكانيكي
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && 'getCapabilities' in videoTrack) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const capabilities = (videoTrack as any).getCapabilities?.();
        setTorchAvailable(Boolean(capabilities?.torch));
      } else {
        setTorchAvailable(false);
      }
      setTorchActive(false);
      setZoomLevel(1);
    } catch (err) {
      console.warn('Live camera viewfinder not available, fallback to native camera input:', err);
      setHasCameraPermission(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // إشعار Dynamic Island منبثق بأسلوب Apple HIG
  const showStatus = (msg: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage(msg);
    setStatusType(type);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage('');
      setStatusType(null);
    }, 3500);
  };

  // التحكم في الفلاش (Torch)
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        const next = !torchActive;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({
          advanced: [{ torch: next }],
        });
        setTorchActive(next);
        if (typeof navigator.vibrate === 'function') {
          navigator.vibrate(10);
        }
      } catch (err) {
        console.warn('Torch toggle failed:', err);
      }
    }
  };

  // تطبيق مستوى التكبير (Zoom)
  const applyZoom = async (level: number) => {
    setZoomLevel(level);
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(8);
    }

    const track = streamRef.current?.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({
          advanced: [{ zoom: level }],
        });
      } catch {
        // إذا لم يدعم المستشعر أمر zoom المباشر، سيتولى المعالج الرقمي التكبير via CSS & Canvas
      }
    }
  };

  // النقر للتركيز وتعديل التعريض (Tap to Focus & Exposure)
  const handleViewfinderTap = async (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const pointId = Date.now();

    setFocusPoint({ x, y, id: pointId });

    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }

    // محاولة إرسال نقاط الاهتمام للمستشعر (pointsOfInterest)
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        const relX = Math.max(0, Math.min(1, x / rect.width));
        const relY = Math.max(0, Math.min(1, y / rect.height));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({
          advanced: [{
            pointsOfInterest: [{ x: relX, y: relY }],
            focusMode: 'continuous',
          }],
        });
      } catch {
        // تجاهل القيود إن لم تكن مدعومة
      }
    }

    // إخفاء إطار التركيز بعد 1.8 ثانية
    setTimeout(() => {
      setFocusPoint((prev) => (prev?.id === pointId ? null : prev));
    }, 1800);
  };

  // تحسين حجم وضغط الصورة الملتقطة للحفاظ على دقة فائقة (300+ DPI للطباعة) مع سرعة رفع فائقة
  const optimizeImageBlob = async (rawBlob: Blob, maxDim = 2048, quality = 0.80): Promise<Blob> => {
    try {
      const bitmap = await createImageBitmap(rawBlob);
      const { width, height } = bitmap;

      let targetW = width;
      let targetH = height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          targetW = maxDim;
          targetH = Math.round((height * maxDim) / width);
        } else {
          targetH = maxDim;
          targetW = Math.round((width * maxDim) / height);
        }
      }

      // إذا كانت الصورة بالأبعاد المطلوبة ومضغوطة أصلاً بشكل كافٍ (< 600KB) لا داعي لإعادة المعالجة
      if (targetW === width && targetH === height && rawBlob.size < 600 * 1024 && rawBlob.type === 'image/jpeg') {
        bitmap.close();
        return rawBlob;
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close();
        return rawBlob;
      }

      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      bitmap.close();

      return await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (b) => {
            resolve(b || rawBlob);
          },
          'image/jpeg',
          quality
        );
      });
    } catch (err) {
      console.warn('Image optimization fallback to raw:', err);
      return rawBlob;
    }
  };

  // 5. رفع الصورة إلى مسار الجسر المؤقت في Supabase Storage مع طابور الرفع التراكمي
  const uploadImageBlob = async (rawBlob: Blob, customName?: string) => {
    if (!supabase) {
      showStatus('فشل الاتصال بخادم المزامنة', 'error');
      return;
    }

    if (!sessionId) {
      showStatus('معرف الجلسة غير صالح أو مفقود', 'error');
      return;
    }

    setIsUploading(true);
    setUploadQueueCount((prev) => prev + 1);

    try {
      const blob = await optimizeImageBlob(rawBlob, 2560, 0.85);
      const filename = customName || `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
      const filePath = `${sessionId}/${filename}`;

      // إنشاء صورة مصغرة فورية لزر المعرض السفلي
      const thumbUrl = URL.createObjectURL(blob);
      setRecentThumbnail(thumbUrl);

      const { error } = await supabase.storage
        .from('phone-bridge')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          cacheControl: 'no-cache',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      setPhotosSent((prev) => prev + 1);

      // إرسال إشعار فوري (Push Notification عبر WebSocket) للحاسوب بسحب الصورة لحظياً
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'photo-ready',
          payload: { path: filePath },
        });
      }

      // لمس اهتزازي لطيف بأسلوب آبل عند اكتمال الإرسال (Haptic Feedback)
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate([15, 35, 15]);
      }

      showStatus('تم إرسال الصورة', 'success');
    } catch (err: unknown) {
      console.error('Upload error:', err);
      showStatus('تعذر إرسال الصورة', 'error');
    } finally {
      setUploadQueueCount((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
          setIsUploading(false);
        }
        return next;
      });
    }
  };

  // 6. التقاط الصورة من البث المباشر فورياً بدون أي تأخير وبدقة عالية
  const handleCapture = async () => {
    if (isCapturingRef.current || isUploading) return;
    isCapturingRef.current = true;

    try {
      // وميض الشاشة الفيزيائي مثل كاميرا آيفون الأصلية (Shutter Flash)
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 85);

      // صوت الغالق الاحترافي (إذا لم يكن مكتوماً)
      if (soundEnabled) {
        playShutterSound();
      }

      // لمس اهتزازي لطيف
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(18);
      }

      // التقاط فوري من إطار الفيديو المباشر (سرعة 0ms بدون تجميد عدسة المستشعر)
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
            // قص وتكبير الجزء الموسط وفق نسبة الزوم الرقمي لمطابقة شاشة المعاينة
            const cropW = vw / zoomLevel;
            const cropH = vh / zoomLevel;
            const cropX = (vw - cropW) / 2;
            const cropY = (vh - cropH) / 2;
            ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
          } else {
            ctx.drawImage(video, 0, 0, vw, vh, 0, 0, outW, outH);
          }

          canvas.toBlob(
            (blob) => {
              if (blob) {
                uploadImageBlob(blob);
              } else {
                nativeCameraInputRef.current?.click();
              }
            },
            'image/jpeg',
            0.80
          );
          return;
        }
      }

      // بديل فوري: فتح تطبيق الكاميرا الأصلي للنظام إن لم يكن الفيديو المباشر متاحاً
      nativeCameraInputRef.current?.click();
    } finally {
      setTimeout(() => {
        isCapturingRef.current = false;
      }, 350);
    }
  };

  // معالجة اختيار ملفات متعددة من المعرض أو كاميرا النظام
  const handleMultipleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        uploadImageBlob(file, `photo_${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
      }
    }
    e.target.value = '';
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black text-white font-sans select-none overflow-hidden flex flex-col justify-between"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 12px)',
        paddingRight: 'calc(env(safe-area-inset-right, 0px) + 12px)',
        touchAction: 'manipulation',
      }}
      dir="rtl"
    >
      {/* وميض الشاشة الفيزيائي عند الالتقاط (iOS Shutter Flash Animation) */}
      <div 
        className={`fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150 ${
          flashActive ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* مدخلات الكاميرا الأصلية والمعرض (مع دعم الدقة الفائقة والاختيار المتعدد) */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleMultipleFilesChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleMultipleFilesChange}
      />

      {/* ─────────────────────────────────────────────────────────────
          1. الشريط العلوي: جزيرة إشعارات آبل التفاعلية (Dynamic Island Style)
         ───────────────────────────────────────────────────────────── */}
      <header className="w-full flex flex-col items-center gap-2 z-30 shrink-0">
        <div className="w-full flex items-center justify-between px-2">
          {/* زر الفلاش / الإضاءة المتواصلة (Torch) */}
          {torchAvailable ? (
            <button
              onClick={toggleTorch}
              aria-label="تشغيل الفلاش"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                torchActive 
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30' 
                  : 'bg-white/10 text-white/80 active:scale-90'
              }`}
            >
              {torchActive ? <Zap className="w-4 h-4 fill-black" /> : <ZapOff className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}

          {/* Dynamic Island Pill المركزي */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/95 border border-white/15 shadow-2xl backdrop-blur-2xl transition-all duration-300">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isPaired ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isPaired ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </span>
            <span className="text-xs font-semibold tracking-wide text-neutral-100">
              Grido Studio
            </span>
            {isPaired ? (
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                <span>مقترن ({pairedDeviceName})</span>
              </span>
            ) : sessionId ? (
              <span className="text-[10px] font-mono font-medium text-neutral-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                #{sessionId.split('/').pop()?.slice(0, 6) || sessionId.slice(0, 6)}
              </span>
            ) : null}
          </div>

          {/* زر كتم / تفعيل صوت غالق الكاميرا */}
          <button
            onClick={() => {
              setSoundEnabled((prev) => !prev);
              if (typeof navigator.vibrate === 'function') navigator.vibrate(8);
            }}
            aria-label="تبديل صوت الغالق"
            className="w-9 h-9 rounded-full bg-white/10 text-white/80 flex items-center justify-center active:scale-90 transition-transform"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
          </button>
        </div>

        {/* إشعار الحالة اللحظي (Apple HIG Dynamic Banner) */}
        {statusMessage && (
          <div 
            className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl text-xs font-semibold shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-top duration-200 ${
              statusType === 'success'
                ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/40'
                : statusType === 'error'
                ? 'bg-rose-500/25 text-rose-200 border border-rose-500/40'
                : 'bg-white/15 text-neutral-100 border border-white/20'
            }`}
          >
            {statusType === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {statusType === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {statusType === 'info' && <Info className="w-4 h-4 text-neutral-300 shrink-0" />}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* شريط تقدم الرفع فائق النحافة عند إرسال الصور */}
        {isUploading && (
          <div className="w-36 bg-white/10 h-1 rounded-full overflow-hidden mt-0.5 relative">
            <div className="bg-primary h-full w-full animate-pulse transition-all duration-300" />
            {uploadQueueCount > 1 && (
              <span className="absolute -top-4 right-0 text-[9px] text-neutral-400 font-mono">
                جاري رفع {uploadQueueCount}...
              </span>
            )}
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. منطقة المشهد ومعاينة الكاميرا (iOS Viewfinder & Grid & Tap-Focus)
         ───────────────────────────────────────────────────────────── */}
      <main 
        onClick={handleViewfinderTap}
        className="relative flex-1 w-full my-2 rounded-[32px] overflow-hidden bg-neutral-950 border border-white/10 shadow-2xl flex items-center justify-center cursor-crosshair touch-none select-none"
      >
        {/* فيديو المعاينة الحية مع الزوم الرقمي السلس */}
        {hasCameraPermission ? (
          <div className="w-full h-full overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transition-transform duration-200 ease-out"
              style={{
                transform: `scale(${zoomLevel})`,
              }}
            />
          </div>
        ) : (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              nativeCameraInputRef.current?.click();
            }}
            className="flex flex-col items-center justify-center gap-4 p-6 text-center cursor-pointer select-none"
          >
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/15 flex items-center justify-center shadow-inner active:scale-95 transition-transform">
              <Camera className="w-10 h-10 text-white/80" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">اضغط لفتح الكاميرا</p>
            </div>
          </div>
        )}

        {/* شبكة التأطير بنسبة الثلث الذهبية (3x3 Golden Ratio Rule-of-Thirds Grid) */}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20">
          <div className="border-r border-b border-white/30" />
          <div className="border-r border-b border-white/30" />
          <div className="border-b border-white/30" />
          <div className="border-r border-b border-white/30" />
          <div className="border-r border-b border-white/30" />
          <div className="border-b border-white/30" />
          <div className="border-r border-white/30" />
          <div className="border-r border-white/30" />
          <div />
        </div>

        {/* إطار التركيز الأصفر التفاعلي بأسلوب آبل الأصلي (Tap-to-Focus Reticle) */}
        {focusPoint && (
          <div 
            className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-150 animate-in fade-in zoom-in-75"
            style={{ left: focusPoint.x, top: focusPoint.y }}
          >
            <div className="w-14 h-14 border border-amber-400 rounded-xs shadow-md shadow-amber-400/20 relative">
              <Sun className="w-3.5 h-3.5 text-amber-400 absolute -right-5 top-0.5 opacity-90 animate-pulse" />
            </div>
          </div>
        )}

        {/* أزرار التكبير والتبئير بأسلوب آيفون الأصلي (0.5x | 1x | 2x) */}
        {hasCameraPermission && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1 rounded-full bg-black/50 border border-white/15 backdrop-blur-md shadow-xl"
          >
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => applyZoom(lvl)}
                className={`w-7 h-7 rounded-full text-[11px] font-bold transition-all duration-150 flex items-center justify-center ${
                  zoomLevel === lvl
                    ? 'bg-amber-400 text-black shadow-md scale-105'
                    : 'text-neutral-300 hover:text-white active:scale-95'
                }`}
              >
                {lvl}x
              </button>
            ))}
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. زر تفعيل كاميرا النظام الأصلية
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full flex justify-center py-1 z-30 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (typeof navigator.vibrate === 'function') navigator.vibrate(12);
            nativeCameraInputRef.current?.click();
          }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-900 border border-white/20 text-neutral-200 text-xs font-medium backdrop-blur-2xl shadow-xl active:scale-95 transition-all hover:border-white/40"
        >
          <Camera className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
          <span>كاميرا النظام</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. شريط التحكم السفلي الأصلي لكاميرا آبل (iOS Shutter Bar)
         ───────────────────────────────────────────────────────────── */}
      <footer className="w-full flex items-center justify-between px-6 py-2 z-30 shrink-0">
        {/* الزر الأيسر: فتح معرض الصور لاختيار لقطات سابقة أو دفعة صور (Batch Upload) */}
        <button
          onClick={() => galleryInputRef.current?.click()}
          aria-label="اختيار من الصور"
          className="relative w-12 h-12 rounded-2xl bg-neutral-900 border border-white/20 overflow-hidden flex items-center justify-center transition-transform active:scale-90 shadow-lg"
        >
          {recentThumbnail ? (
            <img src={recentThumbnail} alt="الأخيرة" className="w-full h-full object-cover" />
          ) : (
            <Images className="w-5 h-5 text-neutral-300" />
          )}
          {photosSent > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-black shadow">
              {photosSent}
            </span>
          )}
        </button>

        {/* زر الالتقاط الأيقوني بأسلوب آبل الأصلي (Iconic Apple Shutter Button) */}
        <div className="relative flex items-center justify-center">
          <button
            onClick={handleCapture}
            disabled={isUploading}
            aria-label="التقاط صورة"
            className={`w-[76px] h-[76px] rounded-full border-[3.5px] border-white p-[3px] flex items-center justify-center transition-transform duration-150 active:scale-90 shadow-2xl ${
              isUploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div className="w-full h-full rounded-full bg-white transition-all duration-150 active:scale-95 shadow-md flex items-center justify-center">
              {isUploading && (
                <RefreshCw className="w-6 h-6 text-black animate-spin" />
              )}
            </div>
          </button>
        </div>

        {/* الزر الأيمن: قلب الكاميرا (أمامية / خلفية) */}
        <button
          onClick={toggleCameraFacing}
          aria-label="تبديل الكاميرا"
          className="w-12 h-12 rounded-full bg-neutral-900/90 border border-white/20 flex items-center justify-center transition-transform active:scale-90 shadow-lg"
        >
          <SwitchCamera className="w-5 h-5 text-neutral-300" />
        </button>
      </footer>
    </div>
  );
}
