import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Camera, 
  SwitchCamera, 
  Images, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Info
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mvovehnyvoiawvwaurav.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12b3ZlaG55dm9pYXd2d2F1cmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Nzg2MjQsImV4cCI6MjA5OTM1NDYyNH0.DrZxhJkwjHrk1qP1kJ6JtwAo5AJZegOvFol2L-pGuUg';

export default function PhoneCameraPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | null>(null);
  const [photosSent, setPhotosSent] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [recentThumbnail, setRecentThumbnail] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. استخراج معرف الجلسة من رابط الصفحة (#session=... أو ?session=...)
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

  // 2. تفعيل كاميرا الهاتف المباشرة (Live Viewfinder)
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

  // 3. رفع الصورة إلى مسار الجسر المؤقت في Supabase Storage
  const uploadImageBlob = async (blob: Blob) => {
    if (!supabase) {
      showStatus('فشل الاتصال بخادم المزامنة', 'error');
      return;
    }

    if (!sessionId) {
      showStatus('معرف الجلسة غير صالح أو مفقود', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const filename = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
      const filePath = `${sessionId}/${filename}`;

      // إنشاء صورة مصغرة فورية لزر المعرض السفلي
      const thumbUrl = URL.createObjectURL(blob);
      setRecentThumbnail(thumbUrl);

      setUploadProgress(50);
      const { error } = await supabase.storage
        .from('phone-bridge')
        .upload(filePath, blob, {
          contentType: blob.type || 'image/jpeg',
          cacheControl: 'no-cache',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      setUploadProgress(100);
      setPhotosSent((prev) => prev + 1);

      // لمس اهتزازي لطيف بأسلوب آبل عند نجاح الإرسال (Haptic Feedback)
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate([20, 50, 20]);
      }

      showStatus('تم استلام الصورة في Grido Studio بنجاح!', 'success');
    } catch (err: unknown) {
      console.error('Upload error:', err);
      showStatus('تعذر إرسال الصورة. تحقق من الاتصال.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // 4. التقاط الصورة من البث المباشر أو فتح كاميرا النظام الأصلية
  const handleCapture = async () => {
    // وميض الشاشة الفيزيائي مثل كاميرا آيفون الأصلية (Shutter Flash)
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 90);

    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }

    // إذا كانت الكاميرا الحية تعمل بسلاسة، نلتقط من الكانفاس بأعلى دقة
    if (hasCameraPermission && videoRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              uploadImageBlob(blob);
            } else {
              fileInputRef.current?.click();
            }
          },
          'image/jpeg',
          0.96
        );
        return;
      }
    }

    // بديل فوري: فتح تطبيق الكاميرا الأصلي للنظام بأقصى دقة عدسة للمستشعر (Full Sensor RAW/HDR)
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageBlob(file);
    }
    // تفريغ القيمة للسماح بالتقاط صور متتالية لنفس الملف
    e.target.value = '';
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div 
      className="fixed inset-0 bg-black text-white font-sans select-none overflow-hidden flex flex-col justify-between"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 16px)',
        paddingRight: 'calc(env(safe-area-inset-right, 0px) + 16px)',
        touchAction: 'manipulation',
      }}
      dir="rtl"
    >
      {/* وميض الشاشة عند الالتقاط (iOS Shutter Flash Animation) */}
      <div 
        className={`fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150 ${
          flashActive ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* مدخلات ملفات الكاميرا ومعرض الصور الخلفية غير المرئية */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ─────────────────────────────────────────────────────────────
          1. الشريط العلوي: جزيرة إشعارات آبل التفاعلية (Dynamic Island Style)
         ───────────────────────────────────────────────────────────── */}
      <header className="w-full flex flex-col items-center gap-2 z-30 shrink-0">
        {/* Dynamic Island Pill */}
        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-neutral-900/90 border border-white/10 shadow-2xl backdrop-blur-2xl transition-all duration-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold tracking-wide text-neutral-200">
            Grido Studio
          </span>
          {sessionId && (
            <span className="text-[10px] font-mono font-medium text-neutral-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
              #{sessionId.slice(0, 6)}
            </span>
          )}
        </div>

        {/* إشعار الحالة اللحظي (Animated Banner) */}
        {statusMessage && (
          <div 
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-top duration-200 ${
              statusType === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : statusType === 'error'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-white/10 text-neutral-200 border border-white/15'
            }`}
          >
            {statusType === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {statusType === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {statusType === 'info' && <Info className="w-4 h-4 text-neutral-300 shrink-0" />}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* شريط تقدم الرفع فائق النحافة (iOS Progress Bar) */}
        {isUploading && (
          <div className="w-32 bg-white/10 h-1 rounded-full overflow-hidden mt-1">
            <div 
              className="bg-primary h-full transition-all duration-200"
              style={{ width: `${uploadProgress || 60}%` }}
            />
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. منطقة المشهد ومعاينة الكاميرا (iOS Viewfinder & Grid)
         ───────────────────────────────────────────────────────────── */}
      <main className="relative flex-1 w-full my-3 rounded-[32px] overflow-hidden bg-neutral-950 border border-white/10 shadow-2xl flex items-center justify-center">
        {/* فيديو المعاينة الحية */}
        {hasCameraPermission ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-4 p-6 text-center cursor-pointer select-none"
          >
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
              <Camera className="w-10 h-10 text-white/80" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">اضغط هنا لفتح الكاميرا</p>
              <p className="text-xs text-neutral-400 max-w-[240px] leading-relaxed">
                التقط صور المنتجات أو الوثائق بدقة الكاميرا الكاملة لتظهر فورياً في التصميم
              </p>
            </div>
          </div>
        )}

        {/* شبكة التأطير بنسبة الثلث (3x3 Golden Ratio Camera Grid) */}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25">
          <div className="border-r border-b border-white/20" />
          <div className="border-r border-b border-white/20" />
          <div className="border-b border-white/20" />
          <div className="border-r border-b border-white/20" />
          <div className="border-r border-b border-white/20" />
          <div className="border-b border-white/20" />
          <div className="border-r border-white/20" />
          <div className="border-r border-white/20" />
          <div />
        </div>

        {/* مؤشر النمط النشط بأسلوب iOS الكلاسيكي (PHOTO / صورة) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <span className="text-[11px] font-bold tracking-widest text-amber-400 uppercase drop-shadow-md">
            صورة
          </span>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. شريط التحكم السفلي الأصلي لكاميرا آبل (iOS Shutter Bar)
         ───────────────────────────────────────────────────────────── */}
      <footer className="w-full flex items-center justify-between px-6 py-2 z-30 shrink-0">
        {/* الزر الأيسر: فتح معرض الصور لاختيار لقطة سابقة */}
        <button
          onClick={() => galleryInputRef.current?.click()}
          aria-label="اختيار من الصور"
          className="relative w-12 h-12 rounded-2xl bg-neutral-900 border border-white/15 overflow-hidden flex items-center justify-center transition-transform active:scale-90"
        >
          {recentThumbnail ? (
            <img src={recentThumbnail} alt="الأخيرة" className="w-full h-full object-cover" />
          ) : (
            <Images className="w-5 h-5 text-neutral-300" />
          )}
          {photosSent > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-black">
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
            className="w-[76px] h-[76px] rounded-full border-[3.5px] border-white p-[3px] flex items-center justify-center transition-transform duration-150 active:scale-90 cursor-pointer disabled:opacity-50"
          >
            <div className="w-full h-full rounded-full bg-white transition-all duration-150 active:scale-95 shadow-md flex items-center justify-center">
              {isUploading && (
                <RefreshCw className="w-6 h-6 text-black animate-spin" />
              )}
            </div>
          </button>
        </div>

        {/* الزر الأيمن: قلب الكاميرا (أمامية/خلفية) */}
        <button
          onClick={toggleCameraFacing}
          aria-label="تبديل الكاميرا"
          className="w-12 h-12 rounded-full bg-neutral-900/90 border border-white/15 flex items-center justify-center transition-transform active:scale-90"
        >
          <SwitchCamera className="w-5 h-5 text-neutral-300" />
        </button>
      </footer>
    </div>
  );
}
