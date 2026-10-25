import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  GraduationCap,
  MessageSquare,
  ExternalLink,
  Save,
  Check,
  Zap,
  Users,
  Clock,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { SupervisorDispatchSettings, ChatLead } from '../types';

interface SupervisorRoutingManagerProps {
  leads: ChatLead[];
  onRefreshData: () => Promise<void>;
  onNavigateToExcel: () => void;
}

export const SupervisorRoutingManager: React.FC<SupervisorRoutingManagerProps> = ({
  leads,
  onRefreshData,
  onNavigateToExcel,
}) => {
  const [settings, setSettings] = useState<SupervisorDispatchSettings>({
    curriculaSupervisorPhone: '+966501112233',
    curriculaSupervisorName: 'أ. مريم السالم (مشرفة المناهج المدرسية)',
    coursesSupervisorPhone: '+966504445566',
    coursesSupervisorName: 'أ. ناصر الحربي (مشرف الكورسات وتطوير المهارات)',
    autoDispatchWhatsApp: true,
    autoAddToExcel: true,
    notifyCustomerWithHandoff: true,
    lastDispatchedAt: null,
    totalDispatchedCount: 14,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testingType, setTestingType] = useState<'curricula' | 'courses' | null>(null);

  // Load dispatch settings
  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dispatch-settings');
      const json = await res.json();
      if (json.success && json.data) {
        setSettings(json.data);
      }
    } catch (e) {
      console.error('Failed to load dispatch settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/dispatch-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setFeedback({
          type: 'success',
          message: '🎉 تم حفظ وتحديث رقمي واتساب المناهج والكورسات بنجاح! الشات بوت يعتمد عليهما فورياً.',
        });
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ type: 'error', message: data.error || 'حدث خطأ أثناء الحفظ' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'فشل حفظ الإعدادات' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPing = async (targetType: 'curricula' | 'courses') => {
    setTestingType(targetType);
    setFeedback(null);
    try {
      const phone =
        targetType === 'curricula'
          ? settings.curriculaSupervisorPhone
          : settings.coursesSupervisorPhone;
      const res = await fetch('/api/dispatch/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, phone }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: data.message || `تم إرسال رسالة الاختبار بنجاح إلى رقم (${phone})!`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'فشل إرسال رسالة الاختبار',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطأ في الاتصال' });
    } finally {
      setTestingType(null);
    }
  };

  const curriculaLeads = leads.filter(
    (l) => l.leadCategory === 'مناهج دراسية' || (l.interestedCourse && l.interestedCourse.includes('مناهج'))
  );
  const coursesLeads = leads.filter(
    (l) => l.leadCategory === 'كورسات وتطوير' || (l.interestedCourse && !l.interestedCourse.includes('مناهج'))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 p-6 sm:p-7 rounded-3xl border border-teal-500/30 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <PhoneCall className="w-6 h-6" />
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                توجيه الواتساب التلقائي (رقم المناهج & رقم الكورسات)
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                  توجيه فوري ذكي
                </span>
              </h2>
            </div>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              يقوم الشات بوت بجمع بيانات العميل وحجزه تلقائياً، فإذا كان مهتماً بـ <strong>المناهج الدراسية</strong> يرسل بياناته لرقم مشرف المناهج على الواتساب، وإذا كان مهتماً بـ <strong>الكورسات وتطوير المهارات</strong> يرسلها لرقم مشرف الكورسات ليكمل معه حجز الحصة التجريبية على زووم، مع تسجيل العميل في شيت الإكسيل فوراً!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateToExcel}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>عرض شيت الإكسيل</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-teal-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ وتفعيل الأرقام'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Main 2-Cards Grid for Curricula & Courses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: School Curricula Supervisor Number */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-white text-base">رقم واتساب قسم المناهج الدراسية</h3>
                  <span className="text-[11px] text-amber-300 font-semibold">
                    (تأسيس، رياضيات، علوم، لغات مدارس، ابتدائي، متوسط، ثانوي)
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {curriculaLeads.length} عميل
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              عندما يسأل العميل عن مواد المدارس أو تأسيس الأطفال، يجمع البوت (اسم الطالب، المادة، والصف الدراسي) ثم يرسل رسالة فورية لهذا الرقم مع رابط مباشر للتواصل مع العميل.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">اسم المشرف المكلف بالمناهج:</label>
                <input
                  type="text"
                  value={settings.curriculaSupervisorName}
                  onChange={(e) => setSettings({ ...settings, curriculaSupervisorName: e.target.value })}
                  placeholder="مثال: أ. مريم السالم (مشرفة المناهج المدرسية)"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  رقم الواتساب لاستقبال إشعارات المناهج:
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    dir="ltr"
                    value={settings.curriculaSupervisorPhone}
                    onChange={(e) => setSettings({ ...settings, curriculaSupervisorPhone: e.target.value })}
                    placeholder="+966 50 111 2233"
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                    واتساب
                  </span>
                </div>
              </div>
            </div>

            {/* Preview Box */}
            <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
              <span className="text-amber-400 font-bold block mb-1">شكل الرسالة التلقائية المرسلة للمشرف:</span>
              <p className="text-slate-200 font-bold">🔔 *إشعار حجز حصة تجريبية جديد — أكاديمية ذاكرلي*</p>
              <p className="text-slate-300">📱 *رقم الهاتف (المرسل منه)*: +966 50 123 4567</p>
              <p className="text-slate-300">👤 *اسم الطالب*: أحمد فهد</p>
              <p className="text-slate-300">🏫 *الصف الدراسي*: رابع ابتدائي</p>
              <p className="text-slate-300">📚 *المادة*: الرياضيات (ماث)</p>
              <p className="text-slate-300">⏰ *الموعد*: الخميس الساعة 7:00 مساءً</p>
              <p className="text-emerald-400 font-bold mt-1">👉 رابط واتساب العميل بنقرة واحدة لإكمال الحجز ورابط زووم</p>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-800/80 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTestPing('curricula')}
              disabled={testingType === 'curricula'}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testingType === 'curricula' ? 'جاري الإرسال...' : 'إرسال رسالة فحص لواتساب المناهج'}</span>
            </button>

            <a
              href={`https://wa.me/${settings.curriculaSupervisorPhone.replace(/[\s+]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="فتح محادثة واتساب مع المشرف"
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
            </a>
          </div>
        </div>

        {/* Card 2: Professional Courses Supervisor Number */}
        <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <GraduationCap className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-white text-base">رقم واتساب قسم الكورسات واللغات</h3>
                  <span className="text-[11px] text-blue-300 font-semibold">
                    (لغات للكبار، إنجليزي، ألماني، فريلانس، PMP، ذكاء اصطناعي)
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {coursesLeads.length} عميل
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              عندما يستفسر العميل عن دورات اللغات أو المهارات المهنية والعمل الحر، يجمع البوت بياناته وهدفه ويرسلها فوراً لرقم المشرف ليتصل به ويشرح له المحاور ويؤكد موعد الحصة المجانية.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">اسم المشرف المكلف بالكورسات:</label>
                <input
                  type="text"
                  value={settings.coursesSupervisorName}
                  onChange={(e) => setSettings({ ...settings, coursesSupervisorName: e.target.value })}
                  placeholder="مثال: أ. ناصر الحربي (مشرف الكورسات والتطوير)"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  رقم الواتساب لاستقبال إشعارات الكورسات:
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    dir="ltr"
                    value={settings.coursesSupervisorPhone}
                    onChange={(e) => setSettings({ ...settings, coursesSupervisorPhone: e.target.value })}
                    placeholder="+966 50 444 5566"
                    className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                    واتساب
                  </span>
                </div>
              </div>
            </div>

            {/* Preview Box */}
            <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
              <span className="text-blue-400 font-bold block mb-1">شكل الرسالة التلقائية المرسلة للمشرف:</span>
              <p className="text-slate-200 font-bold">🔔 *إشعار حجز حصة تجريبية جديد — أكاديمية ذاكرلي*</p>
              <p className="text-slate-300">📱 *رقم الهاتف (المرسل منه)*: +966 55 987 6543</p>
              <p className="text-slate-300">👤 *اسم الطالب / العميل*: سارة العتيبي</p>
              <p className="text-slate-300">🏫 *الصف / المستوى*: مبتدئ للكبار (سوق العمل)</p>
              <p className="text-slate-300">📚 *المادة / الكورس*: دورة اللغة الإنجليزية للمحادثة</p>
              <p className="text-slate-300">⏰ *الموعد*: السبت الساعة 8:00 مساءً</p>
              <p className="text-emerald-400 font-bold mt-1">👉 رابط واتساب العميل بنقرة واحدة لإكمال الحجز ورابط زووم</p>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-800/80 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTestPing('courses')}
              disabled={testingType === 'courses'}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testingType === 'courses' ? 'جاري الإرسال...' : 'إرسال رسالة فحص لواتساب الكورسات'}</span>
            </button>

            <a
              href={`https://wa.me/${settings.coursesSupervisorPhone.replace(/[\s+]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="فتح محادثة واتساب مع المشرف"
            >
              <MessageSquare className="w-4 h-4 text-blue-400" />
            </a>
          </div>
        </div>

      </div>

      {/* Automation Rules Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <span>قواعد الأتمتة المباشرة (Automatic Rules)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition">
            <input
              type="checkbox"
              checked={settings.autoDispatchWhatsApp}
              onChange={(e) => setSettings({ ...settings, autoDispatchWhatsApp: e.target.checked })}
              className="w-4 h-4 mt-0.5 accent-teal-500"
            />
            <div>
              <span className="font-bold text-slate-200 block">إرسال واتساب فوري للمشرف</span>
              <span className="text-slate-400 text-[11px] leading-relaxed">
                توجيه رسالة واتساب للرقم المخصص بمجرد إبداء العميل رغبة في الحجز التجريبي.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition">
            <input
              type="checkbox"
              checked={settings.autoAddToExcel}
              onChange={(e) => setSettings({ ...settings, autoAddToExcel: e.target.checked })}
              className="w-4 h-4 mt-0.5 accent-emerald-500"
            />
            <div>
              <span className="font-bold text-slate-200 block">التسجيل التلقائي في شيت الإكسيل</span>
              <span className="text-slate-400 text-[11px] leading-relaxed">
                إضافة العميل فوراً في جدول المتابعة المكون من 10 أعمدة ومزامنته مع Google Sheets.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition">
            <input
              type="checkbox"
              checked={settings.notifyCustomerWithHandoff}
              onChange={(e) => setSettings({ ...settings, notifyCustomerWithHandoff: e.target.checked })}
              className="w-4 h-4 mt-0.5 accent-blue-500"
            />
            <div>
              <span className="font-bold text-slate-200 block">إشعار العميل بالتحويل للمشرف</span>
              <span className="text-slate-400 text-[11px] leading-relaxed">
                يخبر البوت العميل في الشات: "تم تحويل طلبك لمشرف القسم وسيتواصل معك مباشرة".
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Dispatched Leads Quick Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>سجل العملاء المحولين للمشرفين مؤخراً</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            إجمالي العملاء: {leads.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/70 text-slate-400 border-b border-slate-800 font-bold whitespace-nowrap">
                <th className="py-2.5 px-3">اسم الطالب / العميل</th>
                <th className="py-2.5 px-3">رقم الهاتف (المرسل منه)</th>
                <th className="py-2.5 px-3">الصف الدراسي</th>
                <th className="py-2.5 px-3">المادة / الكورس</th>
                <th className="py-2.5 px-3">الموعد المحدد</th>
                <th className="py-2.5 px-3">القسم</th>
                <th className="py-2.5 px-3">المشرف المكلف</th>
                <th className="py-2.5 px-3 text-center">إجراء فوري</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leads.slice(0, 8).map((lead) => {
                const isCurricula =
                  lead.leadCategory === 'مناهج دراسية' ||
                  (lead.interestedCourse && lead.interestedCourse.includes('مناهج'));
                const supervisorPhone = isCurricula
                  ? settings.curriculaSupervisorPhone
                  : settings.coursesSupervisorPhone;
                const supervisorName = isCurricula
                  ? settings.curriculaSupervisorName
                  : settings.coursesSupervisorName;

                return (
                  <tr key={lead.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-bold text-white">
                      {lead.customerName}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-bold" dir="ltr">
                      {lead.phoneNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
                        {lead.studentGrade || 'الصف غير محدد'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-200 font-medium">
                      {lead.trialSubject || lead.interestedCourse || 'استفسار عام'}
                    </td>
                    <td className="py-3 px-3 text-amber-300 font-mono text-[11px]">
                      {lead.trialDayTime || lead.trialDate || 'بانتظار التحديد'}
                    </td>
                    <td className="py-3 px-3">
                      {isCurricula ? (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                          📚 مناهج
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[11px] font-bold">
                          🎓 كورسات
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300 text-[11px]">
                      {lead.assignedSupervisor || supervisorName}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={`https://wa.me/${lead.phoneNumber.replace(/[\s+]/g, '')}?text=${encodeURIComponent(
                            `يا هلا بك يا ${lead.customerName}، معك ${supervisorName} من ذاكرلي أكاديمي بخصوص حجز حصة (${lead.trialSubject || lead.interestedCourse || 'المادة'}) - ${lead.studentGrade || ''} في موعد (${lead.trialDayTime || lead.trialDate || ''}) 🌟`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition flex items-center gap-1"
                          title="محادثة واتساب العميل مباشرة"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>واتساب العميل</span>
                        </a>

                        <a
                          href={`https://wa.me/${supervisorPhone.replace(/[\s+]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition flex items-center gap-1"
                          title="واتساب المشرف"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
