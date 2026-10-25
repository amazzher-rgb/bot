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
  AlertTriangle,
  Zap,
  Server,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { WhatsAppState } from '../types';

interface WhatsAppLinkDeviceProps {
  whatsappState: WhatsAppState | null;
  onConnectQr: () => Promise<void>;
  onConfirmScan: (phone?: string) => Promise<void>;
  onPairWithCode: (phone: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onNavigateToChat: () => void;
  isBackendConnected?: boolean;
  backendUrl?: string;
  onSaveBackendUrl?: (url: string) => Promise<boolean>;
}

export const WhatsAppLinkDevice: React.FC<WhatsAppLinkDeviceProps> = ({
  whatsappState,
  onConnectQr,
  onConfirmScan,
  onPairWithCode,
  onDisconnect,
  onNavigateToChat,
  isBackendConnected = false,
  backendUrl = '',
  onSaveBackendUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [phoneNumberInput, setPhoneNumberInput] = useState('+966 55 987 6543');
  const [isPairingWithPhone, setIsPairingWithPhone] = useState(false);
  const [countdown, setCountdown] = useState(35);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [clientQrUrl, setClientQrUrl] = useState<string | null>(null);

  // Backend URL config state
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(backendUrl || '');
  const [isTestingServer, setIsTestingServer] = useState(false);

  const isConnected = whatsappState?.status === 'connected';
  const isConnecting = whatsappState?.status === 'connecting';
  const isLiveServerQr = Boolean(whatsappState?.qrCodeUrl && isBackendConnected);

  // Generate fallback QR for preview
  useEffect(() => {
    if (!whatsappState?.qrCodeUrl) {
      const pairingPayload = `2@${Date.now()},${Math.random().toString(36).substring(2)},zakirly_demo_preview`;
      QRCode.toDataURL(pairingPayload, {
        width: 320,
        margin: 1,
        color: {
          dark: '#0b141a',
          light: '#ffffff',
        },
      })
        .then((url) => setClientQrUrl(url))
        .catch((e) => console.error('Failed to generate preview QR:', e));
    }
  }, [whatsappState?.qrCodeUrl]);

  // Countdown timer for QR refresh
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
      alert('يرجى إدخال رقم هاتف واتساب صحيح مع مفتاح الدولة (مثال: +966551234567)');
      return;
    }
    setIsGeneratingCode(true);
    try {
      await onPairWithCode(phoneNumberInput);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleSaveServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveBackendUrl) return;
    setIsTestingServer(true);
    try {
      await onSaveBackendUrl(serverUrlInput);
    } finally {
      setIsTestingServer(false);
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
              إدارة ربط البوت بحساب الواتساب، وتفعيل الرد الآلي الذكي على الرسائل النصية والصوتية باللهجة الخليجية وحجز الحصص التجريبية في شيت الإكسيل.
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
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleSimulateScan}
                  disabled={isSimulating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{isSimulating ? 'جاري التفعيل...' : '⚡ تفعيل الربط السريع فوراً'}</span>
                </button>
                <button
                  onClick={onConnectQr}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm border border-slate-700 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                  <span>تحديث الرمز</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GitHub Pages Informative Notice */}
      {!isConnected && !isLiveServerQr && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 shadow-lg space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <span>سبب تعذر مسح الرمز من الهاتف على GitHub Pages:</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                    استضافة ثابتة Static Hosting
                  </span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-3xl">
                  استضافة <strong>GitHub Pages</strong> مخصصة فقط لملفات المتصفح الثابتة (HTML/JS) ولا تشغل خادم برمجي (Node.js) في الخلفية لفتح جلسة حية مع واتساب (<span className="text-amber-300 font-mono" dir="ltr">web.whatsapp.com</span>). ولذلك عندما تمسح الرمز بهاتفك يعطيك واتساب خطأ.
                </p>
                <p className="text-emerald-400 text-xs sm:text-sm font-semibold pt-1">
                  💡 <strong>الحل المباشر:</strong> اضغط على زر <strong>"⚡ تفعيل الربط السريع"</strong> أدناه لتشغيل البوت فورياً داخل المتصفح واختبار كافة المزايا والشات الصوتي وشيت الإكسيل!
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <button
                onClick={handleSimulateScan}
                disabled={isSimulating}
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/30 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{isSimulating ? 'جاري التفعيل...' : '⚡ تفعيل الربط وتشغيل البوت فوراً'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Connection Area */}
      {isConnected ? (
        /* CONNECTED STATE CARD */
        <div className="bg-slate-800/80 rounded-3xl border border-emerald-500/30 p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-700/60">
            <div className="flex items-center gap-4 text-right">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">الجهاز المصاحب متصل ويعمل بنجاح!</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    نشط Active 🟢
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  رقم الهاتف المقترن:{' '}
                  <span className="font-mono text-emerald-300 font-semibold" dir="ltr">
                    {whatsappState?.pairedPhone || '+966 55 987 6543'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50">
              <span className="text-xs text-slate-400 block mb-1">اسم الجهاز المصاحب</span>
              <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-emerald-400" />
                {whatsappState?.deviceName || 'WhatsApp Business Companion'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50">
              <span className="text-xs text-slate-400 block mb-1">وقت الارتباط</span>
              <p className="text-sm font-bold text-slate-200" dir="ltr">
                {whatsappState?.linkedAt || 'اليوم'}
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
                {whatsappState?.totalMessagesReplied || 28} رسالة ورد آلي
              </p>
            </div>
          </div>

          {/* 24/7 Background Execution Reassurance */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Check className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  تشغيل متواصل وجاهز للرد على الطلاب والعملاء
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  يمكنك الآن التبديل لتبويب "محاكي الواتساب والفويس نوت" لإرسال رسائل وتسجيلات صوتية ورؤية الرد الفوري وتحديث شيت الإكسيل تلقائياً!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onNavigateToChat}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
              >
                بدء المحادثات التجريبية
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* PAIRING AND QR CODE DISPLAY */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Right/Top: Instructions & Quick Activation (7 cols) */}
          <div className="lg:col-span-7 bg-slate-800/80 rounded-3xl border border-slate-700/70 p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
            
            {/* Quick 1-Click Launch Header */}
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 fill-current" />
                  طريقة التشغيل الأسرع على GitHub Pages (بدون أي خطوات معقدة):
                </span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                  موصى به
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                اضغط على الزر الأخضر أدناه لتفعيل الربط فوراً وتغيير الحالة بالأعلى إلى <strong className="text-emerald-400 font-bold">متصل 🟢</strong>، وسيتم حفظ الاتصال حتى بعد إغلاق الصفحة أو إعادة تحميلها.
              </p>
              <button
                onClick={handleSimulateScan}
                disabled={isSimulating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{isSimulating ? 'جاري التفعيل...' : '⚡ تفعيل الربط السريع وتشغيل البوت فوراً'}</span>
              </button>
            </div>

            {/* Standard WhatsApp Instructions */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-black">
                    1
                  </span>
                  خطوات ربط هاتف فعلي عبر بروتوكول WhatsApp Web:
                </h3>

                <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>بروتوكول Multi-Device</span>
                </div>
              </div>

              <ol className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-white block font-semibold">افتح تطبيق واتساب على هاتفك</strong>
                    (يدعم WhatsApp العادي أو WhatsApp Business).
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-white block font-semibold">ادخل على "الأجهزة المرتبطة" (Linked Devices)</strong>
                    في أندرويد اضغط القائمة (⋮) ثم "الأجهزة المرتبطة". في آيفون: "الإعدادات" ثم "الأجهزة المرتبطة".
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-white block font-semibold">اضغط على زر "ربط جهاز" (Link a Device)</strong>
                    إذا كان الموقع مربوطاً بخادم Node.js حي، وجّه الكاميرا للرمز وسيتم الربط بنجاح.
                  </div>
                </li>
              </ol>
            </div>

            {/* Optional Phone Number Pairing Code */}
            <div className="pt-2 border-t border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  <span>الربط برقم الهاتف وكود الاقتران (Pair with Phone Code)</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsPairingWithPhone(!isPairingWithPhone)}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  {isPairingWithPhone ? 'إخفاء' : 'عرض الخيار'}
                </button>
              </div>

              {isPairingWithPhone && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-3 text-xs">
                  <p className="text-slate-300 leading-relaxed">
                    أدخل رقم الهاتف الذي ترغب في اقتران البوت به:
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
                        {isGeneratingCode ? 'جاري الطلب...' : 'توليد الكود'}
                      </button>
                    </div>

                    {whatsappState?.pairingCode && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                        <span className="text-slate-300">أدخل هذا الكود في واتساب هاتفك:</span>
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

            {/* Live Server URL Integration Settings */}
            <div className="pt-2 border-t border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-400" />
                  <span>إعدادات ربط سيرفر واتساب الحقيقي (Node.js Live Server)</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowServerConfig(!showServerConfig)}
                  className="text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer"
                >
                  {showServerConfig ? 'إغلاق الإعدادات' : 'تخصيص رابط السيرفر'}
                </button>
              </div>

              {showServerConfig && (
                <form onSubmit={handleSaveServer} className="p-4 rounded-2xl bg-slate-900/80 border border-blue-500/30 space-y-3 text-xs">
                  <p className="text-slate-300 leading-relaxed">
                    إذا قمت بنشر كود السيرفر (<code className="text-blue-300 font-mono">server.ts</code>) على خادم سحابي (مثل Cloud Run أو Render أو VPS)، ضع رابط السيرفر هنا لجلب رمز الـ QR الحقيقي وربط هاتفك الفعلي 24/7:
                  </p>
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={serverUrlInput}
                      onChange={(e) => setServerUrlInput(e.target.value)}
                      placeholder="https://your-bot-backend.example.com"
                      dir="ltr"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-400 font-mono"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isTestingServer}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                      >
                        {isTestingServer ? 'جاري الفحص...' : 'فحص وحفظ الرابط'}
                      </button>
                      {serverUrlInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setServerUrlInput('');
                            if (onSaveBackendUrl) onSaveBackendUrl('');
                          }}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-xl transition cursor-pointer"
                        >
                          إعادة ضبط
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              )}
            </div>

          </div>

          {/* Left/Bottom: The QR Code Display Card (5 cols) */}
          <div className="lg:col-span-5 bg-slate-800/80 rounded-3xl border border-slate-700/70 p-6 sm:p-8 backdrop-blur-sm shadow-xl flex flex-col items-center justify-center text-center space-y-5">
            
            {/* Header Badge */}
            <div className="flex items-center justify-between w-full">
              {isLiveServerQr ? (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-white">رمز واتساب الحي (سيرفر نشط)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-amber-300">وضع المعاينة (GitHub Pages)</span>
                </div>
              )}

              <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <RefreshCw className="w-3 h-3 animate-spin" />
                يتجدد خلال {countdown}ث
              </span>
            </div>

            {/* QR Box */}
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
                  <p className="text-xs text-slate-600 font-semibold">جاري تجهيز رمز الاستجابة...</p>
                </div>
              )}
            </div>

            {/* Status under QR */}
            <div className="w-full space-y-3">
              {isLiveServerQr ? (
                <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  <span>رمز حقيقي صادر من خادم Node.js — جاهز للمسح</span>
                </div>
              ) : (
                <div className="p-3 bg-slate-900/90 rounded-2xl border border-amber-500/30 text-xs text-slate-300 text-right space-y-1">
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>ملاحظة: لا تمسح الرمز بكاميرا الهاتف على GitHub Pages</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    لأن جيت هاب استضافة ثابتة، مسحه سيعطي خطأ. لتشغيل البوت فورياً والتجربة بالمتصفح، اضغط على الزر الأخضر بالأسفل:
                  </p>
                </div>
              )}

              {/* Primary 1-Click Action */}
              <button
                onClick={handleSimulateScan}
                disabled={isSimulating}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{isSimulating ? 'جاري تفعيل البوت...' : '⚡ تفعيل الربط السريع وتشغيل البوت الآن'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onConnectQr}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer border border-slate-600/60"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تحديث الرمز</span>
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

            {/* Quick Tips */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 text-right leading-relaxed space-y-1 w-full">
              <div className="text-white font-semibold flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>ماذا يحدث بعد تفعيل البوت؟</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                <li>يتحول الشريط العلوي فوراً إلى حالة "متصل بالواتساب" 🟢.</li>
                <li>تفتح معك شاشة المحادثات لتجربة كتابة الرسائل والتسجيلات الصوتية.</li>
                <li>تتسجل بيانات الحصص تلقائياً في شيت الإكسيل ولوحة الإشراف.</li>
              </ul>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
