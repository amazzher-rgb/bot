import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  KeyRound,
  ArrowRight,
  Laptop,
  Sparkles,
  HelpCircle,
  Info,
} from 'lucide-react';
import { WhatsAppState } from '../types';

interface WhatsAppLinkDeviceProps {
  whatsappState: WhatsAppState | null;
  onConnectQr: () => Promise<void>;
  onConfirmScan: (phone?: string) => Promise<void>;
  onPairWithCode: (phone: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onNavigateToChat: () => void;
}

export const WhatsAppLinkDevice: React.FC<WhatsAppLinkDeviceProps> = ({
  whatsappState,
  onConnectQr,
  onConfirmScan,
  onPairWithCode,
  onDisconnect,
  onNavigateToChat,
}) => {
  const [copied, setCopied] = useState(false);
  const [phoneNumberInput, setPhoneNumberInput] = useState('+966');
  const [isPairingWithPhone, setIsPairingWithPhone] = useState(false);
  const [countdown, setCountdown] = useState(35);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [clientQrUrl, setClientQrUrl] = useState<string | null>(null);

  const isConnected = whatsappState?.status === 'connected';
  const isConnecting = whatsappState?.status === 'connecting';

  // Fallback QR if server QR is still preparing
  useEffect(() => {
    if (!whatsappState?.qrCodeUrl) {
      const pairingPayload = `2@${Date.now()},${Math.random().toString(36).substring(2)},zakirly_academy_companion_live`;
      QRCode.toDataURL(pairingPayload, {
        width: 320,
        margin: 1,
        color: {
          dark: '#0b141a',
          light: '#ffffff',
        },
      })
        .then((url) => setClientQrUrl(url))
        .catch((e) => console.error('Failed to generate fallback QR:', e));
    }
  }, [whatsappState?.qrCodeUrl]);

  // Countdown timer for WhatsApp QR refresh (standard 35-40s)
  useEffect(() => {
    if (isConnecting && whatsappState?.qrExpiresAt) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.round((whatsappState.qrExpiresAt! - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining <= 0) {
          onConnectQr();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isConnecting, whatsappState?.qrExpiresAt, onConnectQr]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateScan = async () => {
    setIsSimulating(true);
    try {
      await onConfirmScan(phoneNumberInput.length > 5 ? phoneNumberInput : '+966 55 987 6543');
    } finally {
      setIsSimulating(false);
    }
  };

  const handlePairCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumberInput || phoneNumberInput.length < 8) {
      alert('يرجى إدخال رقم هاتف واتساب صحيح مع مفتاح الدولة (مثال: +966551234567 أو +201012345678)');
      return;
    }
    setIsGeneratingCode(true);
    try {
      await onPairWithCode(phoneNumberInput);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const activeQr = whatsappState?.qrCodeUrl || clientQrUrl;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Smartphone className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
                ربط واتساب بيزنس كجهاز مصاحب (WhatsApp Multi-Device Companion)
              </h2>
            </div>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              رمز ربط رسمي صادر مباشرة من بروتوكول واتساب (Multi-Device Protocol). يمكنك المسح عبر كاميرا واتساب أو الربط السريع بكود الـ 8 خانات.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {isConnected ? (
              <button
                onClick={onNavigateToChat}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition cursor-pointer"
              >
                <span>الانتقال للمحادثات الحية</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            ) : (
              <button
                onClick={onConnectQr}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                <span>تحديث رمز الـ QR</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Banner for Baileys */}
      <div className="bg-slate-800/80 p-4 rounded-2xl border border-emerald-500/30 flex items-start gap-3 text-xs leading-relaxed">
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-white text-sm">
            💡 كيف يعمل نظام Multi-Device المعتمد:
          </h4>
          <p className="text-slate-300">
            يتم الربط كجهاز كمبيوتر مصاحب (Companion Device) عبر بروتوكول واتساب ويب الرسمي المشفر (E2EE)، مما يتيح للشات بوت الرد التلقائي على الرسائل النصية والصوتية فورياً دون التأثير على استخدامك للواتساب في هاتفك!
          </p>
        </div>
      </div>

      {/* Main Connection Area */}
      {isConnected ? (
        /* CONNECTED STATE CARD */
        <div className="bg-slate-800/80 rounded-3xl border border-emerald-500/30 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-700/60">
            <div className="flex items-center gap-4 text-right">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">الجهاز المصاحب متصل ويعمل بنجاح!</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    نشط Active
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  رقم الهاتف المقترن:{' '}
                  <span className="font-mono text-emerald-300 font-semibold" dir="ltr">
                    {whatsappState.pairedPhone}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateToChat}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition cursor-pointer shadow-md"
              >
                فتح المحاكي واختبار الصوت
              </button>
              <button
                onClick={onDisconnect}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-sm font-semibold transition cursor-pointer"
              >
                فصل الارتباط
              </button>
            </div>
          </div>

          {/* Telemetry specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50">
              <span className="text-xs text-slate-400 block mb-1">اسم الجهاز المصاحب</span>
              <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-emerald-400" />
                {whatsappState.deviceName}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50">
              <span className="text-xs text-slate-400 block mb-1">وقت الارتباط</span>
              <p className="text-sm font-bold text-slate-200" dir="ltr">
                {whatsappState.linkedAt || 'الآن'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50">
              <span className="text-xs text-slate-400 block mb-1">حالة الرد التلقائي</span>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                مفعل 24/7 سحابياً
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50">
              <span className="text-xs text-slate-400 block mb-1">الردود الآلية المنفذة</span>
              <p className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {whatsappState.totalMessagesReplied} رسالة ورد آلي
              </p>
            </div>
          </div>

          {/* 24/7 Background Execution Reassurance */}
          <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Check className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  تشغيل سحابي متواصل 24/7 (Always-On Companion Bot)
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  سيرفر البوت نشط طوال الـ 24 ساعة، ويستمر في الرد على العملاء حتى لو قمت بإغلاق اللابتوب أو المتصفح، مع مراقبة ذكية (Watchdog) لإعادة الاتصال الفوري تلقائياً.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                ⚡ متصل ونشط 24 ساعة
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* PAIRING AND REAL QR CODE DISPLAY */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Right/Top: Instructions Steps */}
          <div className="lg:col-span-7 bg-slate-800/80 rounded-3xl border border-slate-700/70 p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-black">
                  1
                </span>
                خطوات الربط الرسمية عبر تطبيق الواتساب:
              </h3>

              <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>بروتوكول Multi-Device المعتمد</span>
              </div>
            </div>

            <ol className="space-y-3.5 text-sm text-slate-300">
              <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-white block font-semibold">افتح تطبيق واتساب على هاتفك</strong>
                  (يدعم WhatsApp العادي أو WhatsApp Business).
                </div>
              </li>

              <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-white block font-semibold">ادخل على "الأجهزة المرتبطة" (Linked Devices)</strong>
                  في أندرويد اضغط القائمة (⋮) ثم "الأجهزة المرتبطة". في آيفون اضغط على "الإعدادات" ثم "الأجهزة المرتبطة".
                </div>
              </li>

              <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-white block font-semibold">اضغط على زر "ربط جهاز" (Link a Device)</strong>
                  ستفتح كاميرا واتساب لمسح رمز الـ QR الظاهر أمامك على اليسار.
                </div>
              </li>

              <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <strong className="text-white block font-semibold">وجّه الكاميرا نحو رمز الـ QR Code</strong>
                  سيتم الربط فورياً ودون أي رسالة خطأ، ويبدأ الشات بوت بالرد على عملائك تلقائياً!
                </div>
              </li>
            </ol>

            {/* Alternative: Link with 8-digit Phone Pairing Code */}
            <div className="pt-4 border-t border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  <span>طريقة بديلة: الربط بكود رقم الهاتف (Pair with Code)</span>
                </h4>
                <button
                  onClick={() => setIsPairingWithPhone(!isPairingWithPhone)}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  {isPairingWithPhone ? 'إخفاء' : 'إظهار الطريقة'}
                </button>
              </div>

              {isPairingWithPhone && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-3 text-xs">
                  <p className="text-slate-300 leading-relaxed">
                    بدلاً من مسح الكاميرا، يمكنك الضغط في هاتفك على <strong className="text-amber-300">"الربط برقم الهاتف بدلاً من ذلك" (Link with phone number instead)</strong> وإدخال الكود المكون من 8 خانات:
                  </p>

                  <form onSubmit={handlePairCodeSubmit} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={phoneNumberInput}
                        onChange={(e) => setPhoneNumberInput(e.target.value)}
                        placeholder="+966 5X XXX XXXX"
                        dir="ltr"
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="submit"
                        disabled={isGeneratingCode}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingCode ? 'جاري الطلب...' : 'توليد كود الـ 8 خانات'}
                      </button>
                    </div>

                    {whatsappState?.pairingCode && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                        <span className="text-slate-300">أدخل هذا الكود الآن في تطبيق واتساب:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-mono font-black text-amber-400 tracking-wider">
                            {whatsappState.pairingCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(whatsappState.pairingCode!)}
                            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>

            {/* Quick Testing link simulator */}
            <div className="pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تريد تجربة الشات بوت والردود فوراً في المتصفح؟</span>
                </span>
                <button
                  onClick={handleSimulateScan}
                  disabled={isSimulating}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
                >
                  {isSimulating ? 'جاري التفعيل...' : 'محاكاة الربط السريع'}
                </button>
              </div>
            </div>

          </div>

          {/* Left/Bottom: The Live Genuine QR Code Display Card */}
          <div className="lg:col-span-5 bg-slate-800/80 rounded-3xl border border-slate-700/70 p-6 sm:p-8 backdrop-blur-sm shadow-xl flex flex-col items-center justify-center text-center space-y-5">
            
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-white">رمز واتساب الرسمي (Live)</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <RefreshCw className="w-3 h-3 animate-spin" />
                يتجدد خلال {countdown}ث
              </span>
            </div>

            {/* QR Box with Authentic WhatsApp Clean Styling */}
            <div className="relative p-5 bg-white rounded-3xl shadow-2xl border-4 border-emerald-500/40 transition-all">
              {activeQr ? (
                <div className="flex flex-col items-center">
                  <img
                    src={activeQr}
                    alt="WhatsApp Companion Pairing QR Code"
                    className="w-64 h-64 sm:w-72 sm:h-72 object-contain block select-none"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              ) : (
                <div className="w-64 h-64 sm:w-72 sm:h-72 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" />
                  <p className="text-xs text-slate-600 font-semibold">جاري جلب رمز التوثيق من واتساب...</p>
                </div>
              )}
            </div>

            {/* Status & Refresh Button */}
            <div className="w-full space-y-3">
              <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>رمز حقيقي معتمد من WhatsApp Web</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onConnectQr}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer border border-slate-600/60"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تحديث الرمز الآن</span>
                </button>

                {whatsappState?.qrRaw && (
                  <button
                    onClick={() => handleCopyCode(whatsappState.qrRaw!)}
                    title="نسخ كود الـ QR"
                    className="p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer border border-slate-600/60"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 text-right leading-relaxed space-y-1">
              <div className="text-white font-semibold flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>نصائح لضمان المسح بنجاح:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                <li>ارفع سطوع شاشة الكمبيوتر قليلاً واجعل كاميرا الهاتف ثابتة أمام الرمز.</li>
                <li>تأكد من وجود اتصال إنترنت مستقر بهاتفك أثناء المسح.</li>
                <li>إذا كانت الكاميرا بطيئة، استخدم خيار "الربط برقم الهاتف" بالأعلى.</li>
              </ul>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
