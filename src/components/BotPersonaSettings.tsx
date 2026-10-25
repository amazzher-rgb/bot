import React, { useState } from 'react';
import {
  Sparkles,
  Volume2,
  Mic,
  Bot,
  UserCheck,
  Headphones,
  Save,
  Check,
  MessageCircle,
  ShieldCheck,
  PhoneCall,
  Sliders,
  Target,
  FileText,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Wand2
} from 'lucide-react';
import { BotSettings } from '../types';

interface BotPersonaSettingsProps {
  botSettings: BotSettings;
  onSaveSettings: (settings: BotSettings) => Promise<void>;
}

export const BotPersonaSettings: React.FC<BotPersonaSettingsProps> = ({
  botSettings,
  onSaveSettings,
}) => {
  const [settings, setSettings] = useState<BotSettings>({
    ...botSettings,
    conversationScenario:
      botSettings.conversationScenario ||
      'الهدف البيعي الأساسي هو فهم رغبة العميل (سواء تعلم الإنجليزية للمحادثة وسوق العمل أو الألمانية أو الفرنسية أو مهارات الفريلانس)، وتوضيح ميزة الحصة التجريبية المجانية 100% التي تقدمها ذاكرلي أكاديمي مع محاضرين معتمدين قبل دفع أي شيء، مع إبراز الخصم الحالي 50% وإمكانية السداد المباشر المخفض.',
    customRules:
      botSettings.customRules ||
      '- لا تكرر الترحيب أبداً إذا كانت المحادثة مستمرة وبها رسائل سابقة.\n- لا تذكر تقسيط تابي أو تمارا نهائياً؛ وضح أن الدفع مباشر مخفض بنسبة 50% أو عبر تطبيق برق وتاب تاب.\n- إذا سأل العميل عن مدة الكورس، اذكر أنها من 21 إلى 30 ساعة تدريبية تفاعلية لايف عبر زووم مع تسجيلات دائمة وماتريال معتمدة من المركز الثقافي.\n- اذكر دائماً إمكانية حجز حصة تجريبية مجانية بدون أي التزام مالي لتقييم الشرح والمستوى.',
    strictKnowledgeOnly:
      botSettings.strictKnowledgeOnly !== undefined ? botSettings.strictKnowledgeOnly : true,
    greetOnceOnly: botSettings.greetOnceOnly !== undefined ? botSettings.greetOnceOnly : true,
    salesGoalCTA: botSettings.salesGoalCTA || 'trial_class',
    salesPitchIntensity: botSettings.salesPitchIntensity || 'friendly_persuasive',
    dialectVariant: botSettings.dialectVariant || 'white_gulf',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync if prop updates
  React.useEffect(() => {
    if (botSettings) {
      setSettings((prev) => ({
        ...prev,
        ...botSettings,
        conversationScenario: botSettings.conversationScenario || prev.conversationScenario,
        customRules: botSettings.customRules || prev.customRules,
      }));
    }
  }, [botSettings]);

  const handleFieldChange = (field: keyof BotSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const scenarioPresets = [
    {
      title: '🌟 سيناريو مبيعات ذاكرلي والحصة المجانية (موصى به)',
      scenario:
        'الهدف البيعي الأساسي هو فهم رغبة العميل (سواء تعلم الإنجليزية للمحادثة وسوق العمل أو الألمانية أو الفرنسية أو مهارات الفريلانس)، وتوضيح ميزة الحصة التجريبية المجانية 100% التي تقدمها ذاكرلي أكاديمي مع محاضرين معتمدين قبل دفع أي شيء، مع إبراز الخصم الحالي 50% وإمكانية السداد المباشر المخفض.',
      rules:
        '- لا تكرر الترحيب إذا كانت المحادثة مستمرة وبها رسائل سابقة.\n- لا تذكر تقسيط تابي أو تمارا نهائياً؛ وضح أن الدفع مباشر مخفض بنسبة 50% أو عبر تطبيق برق وتاب تاب.\n- إذا سأل العميل عن مدة الكورس، اذكر أنها من 21 إلى 30 ساعة تدريبية تفاعلية لايف عبر زووم مع تسجيلات دائمة وماتريال معتمدة من المركز الثقافي.\n- اذكر دائماً إمكانية حجز حصة تجريبية مجانية بدون أي التزام مالي لتقييم الشرح والمستوى.',
      cta: 'trial_class' as const,
      intensity: 'friendly_persuasive' as const,
    },
    {
      title: '⚡ سيناريو إغلاق الصفقات والاشتراك الفوري السريع',
      scenario:
        'التركيز على إغلاق الصفقة سريعاً: العميل مهتم والخصم 50% ينتهي قريباً، اذكر له السعر الأصلي والسعر المخفض فوراً وشجعه على التسجيل وتأكيد مقعده لضمان العرض قبل اكتمال العدد.',
      rules:
        '- قدم رابط الاشتراك وتفاصيل الدفع المباشر فوراً.\n- ركز على ندرة المقاعد وبدء المجموعة القادمة قريباً.\n- اذكر شهادة الأكاديمية المعتمدة ومناسبتها لسيرته الذاتية.',
      cta: 'direct_subscription' as const,
      intensity: 'closing_focused' as const,
    },
    {
      title: '🎓 سيناريو استشاري تعليمي وشرح الكورسات بالتفصيل',
      scenario:
        'التركيز على مساعدة العميل في تحديد مستواه واختيار المسار المناسب له من الصفر حتى الطلاقة، وشرح طبيعة الدراسة التفاعلية عبر زووم وأوقات الحصص المرنة والمحاضرين المتخصصين.',
      rules:
        '- اشرح تفاصيل المستويات وتقسيم الساعات (21 إلى 30 ساعة).\n- وضح أن الحصص مسجلة بالكامل لمراجعتها في أي وقت مدى الحياة.\n- اعرض اختبار تحديد مستوى مجاني أو حصة تجريبية.',
      cta: 'trial_class' as const,
      intensity: 'educational_patient' as const,
    },
  ];

  const applyPreset = (preset: (typeof scenarioPresets)[0]) => {
    setSettings((prev) => ({
      ...prev,
      conversationScenario: preset.scenario,
      customRules: preset.rules,
      salesGoalCTA: preset.cta,
      salesPitchIntensity: preset.intensity,
    }));
  };

  const dialects = [
    {
      id: 'white_gulf',
      name: 'لهجة خليجية بيضاء (موصى بها لدول الخليج)',
      desc: 'مفهومة جداً ومحبوبة في السعودية والإمارات والكويت وقطر والبحرين وعُمان.',
      examples: 'يا هلا ومسهلا فيك، حياك ربي وسلّمك، أبشر بسعدك وما تشيل هم، تفضل يا غالي.',
    },
    {
      id: 'najdi',
      name: 'لهجة سعودية نجدية أصيلة',
      desc: 'لهجة أهل الرياض والوسطى مع الكرم والترحاب المعهود.',
      examples: 'يا هلا والله، وش تبي يا طويل العمر، أبشر بالسعد، الله يسلمك ويحييك.',
    },
    {
      id: 'hejaz',
      name: 'لهجة حجازية سعودية ودودة',
      desc: 'لهجة أهل جدة ومكة والمدينة الدافئة والمرحبة.',
      examples: 'يا هلا والله ومسهلا، على راسي يا سيدي، أبشر من عيوني، ربي يسعدك.',
    },
    {
      id: 'emirati',
      name: 'لهجة إماراتية راقية',
      desc: 'لهجة الإمارات الراقية والترحيب العريق.',
      examples: 'مرحبا ملايين، أبشر بالخير يا خوي، ما تقصر، حياك الله وفداك اللاش.',
    },
    {
      id: 'kuwaiti',
      name: 'لهجة كويتية محبوبة',
      desc: 'لهجة الكويت اللطيفة والمهذبة.',
      examples: 'يا هلا وغلا، تدلل يا غالي، عسى ربي يحفظك، مشكور وما قصرت.',
    },
    {
      id: 'egyptian',
      name: 'لهجة مصرية مقنعة وودودة',
      desc: 'لهجة سريعة وبسيطة وودودة ومحبوبة جداً في الإقناع والبيع.',
      examples: 'يا فندم منورنا، تقدر تجرب سيشن مجانية الأول تشوف الشرح، وما تقلقش خالص إحنا معاك.',
    },
    {
      id: 'levantine',
      name: 'لهجة شامية لطيفة',
      desc: 'لهجة بلاد الشام الدافئة والمرحبة.',
      examples: 'أهلاً وسهلاً بحضرتك، تكرم عينك، تفضل شو بتحب تعرف، فيك تجرب جلسة مجانية وتشوف الشرح.',
    },
    {
      id: 'modern_standard',
      name: 'لغة عربية فصحى معاصرة ومبسطة',
      desc: 'لغة عربية مهنية وأنيقة ومبسطة خالية من التعقيد والتكلف.',
      examples: 'أهلاً بك في ذاكرلي أكاديمي، يسعدنا تواصلك، يسعدنا توفير تجربة مجانية لك.',
    },
    {
      id: 'custom',
      name: 'لهجة مخصصة يدوياً',
      desc: 'اكتب تعليماتك ونبرتك الخاصة بيدك لتحديد طريقة كلام البوت بالضبط.',
      examples: 'اكتب التعليمات في الحقل المخصص أدناه.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-6 rounded-3xl border border-purple-500/30 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Sliders className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                تخصيص السيناريو وسياق الكلام واللهجة (Bot Persona & Sales Script)
              </h2>
            </div>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              تحكم كامل في طريقة تفكير الشات بوت، سياق الكلام، السيناريو البيعي، منع الترحيب المتكرر، الالتزام الصارم بالداتا المرفوعة بدون هلوسة، واختيار اللهجة المناسبة لجمهورك.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-5 h-5 text-white" />
                  <span>تم حفظ وتحديث عقل البوت فوراً!</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات وتحديث البوت'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Critical Behavioral Rules: One-Time Greeting & Strict Grounding */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rule 1: One-Time Greeting */}
        <div
          onClick={() => handleFieldChange('greetOnceOnly', !settings.greetOnceOnly)}
          className={`p-5 rounded-2xl border transition cursor-pointer flex items-start gap-4 ${
            settings.greetOnceOnly
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md'
              : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-lg mt-0.5 flex items-center justify-center shrink-0 border transition ${
              settings.greetOnceOnly
                ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                : 'border-slate-600 bg-slate-900'
            }`}
          >
            {settings.greetOnceOnly && <Check className="w-4 h-4 stroke-[3]" />}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white">
                الترحيب الذكي لمرة واحدة فقط (حل مشكلة الترحيب في كل رسالة)
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                موصى به
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              يرحب بالعميل <strong className="text-emerald-400">مرة واحدة فقط في أول رسالة</strong> عند بدء المحادثة، وبعد ذلك في الرسائل المتتالية يدخل مباشرة في صلب الإجابة بدون تكرار "يا هلا" أو "أهلاً بك" في كل مرة.
            </p>
          </div>
        </div>

        {/* Rule 2: Strict Data Grounding / Anti-Hallucination */}
        <div
          onClick={() => handleFieldChange('strictKnowledgeOnly', !settings.strictKnowledgeOnly)}
          className={`p-5 rounded-2xl border transition cursor-pointer flex items-start gap-4 ${
            settings.strictKnowledgeOnly
              ? 'bg-blue-950/30 border-blue-500/50 shadow-md'
              : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-lg mt-0.5 flex items-center justify-center shrink-0 border transition ${
              settings.strictKnowledgeOnly
                ? 'bg-blue-500 border-blue-400 text-slate-950'
                : 'border-slate-600 bg-slate-900'
            }`}
          >
            {settings.strictKnowledgeOnly && <Check className="w-4 h-4 stroke-[3]" />}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white">
                الالتزام الصارم بالداتا المرفوعة ومنع الهلوسة (Anti-Hallucination)
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                صارم 100%
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              يجبر البوت على استخراج إجاباته فقط وحصراً من بيانات ذاكرلي أكاديمي، وبنك الـ 500+ سؤال وجواب المرفوعة، والأسعار الحقيقية، ويمنعه تماماً من اختلاق أي معلومات من رأسه.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form: Scenario, Script, and Rules */}
      <div className="bg-slate-800/80 rounded-3xl border border-slate-700/80 p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
            <Wand2 className="w-5 h-5 text-purple-400" />
            <span>تحديد السيناريو وسياق الكلام المخصص (Custom Sales Script & Flow):</span>
          </h3>
          <p className="text-xs text-slate-300">
            حدد للذكاء الاصطناعي السيناريو الذي تريده أن يتبعه في الحوار، أو اختر أحد السيناريوهات الجاهزة بالأسفل:
          </p>
        </div>

        {/* Quick Scenario Presets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {scenarioPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(preset)}
              className="text-right p-3.5 rounded-xl bg-slate-900/80 hover:bg-purple-950/30 border border-slate-700/70 hover:border-purple-500/50 transition cursor-pointer text-xs"
            >
              <div className="font-bold text-white mb-1">{preset.title}</div>
              <div className="text-slate-400 line-clamp-2">{preset.scenario}</div>
              <div className="mt-2 text-emerald-400 text-[11px] font-semibold">اضغط لتطبيق السيناريو ↵</div>
            </button>
          ))}
        </div>

        {/* Scenario Textarea */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-white">
            نص السيناريو وسياق الحوار المستهدف:
          </label>
          <textarea
            rows={4}
            value={settings.conversationScenario}
            onChange={(e) => handleFieldChange('conversationScenario', e.target.value)}
            placeholder="اكتب هنا السيناريو الذي تريده أن يتبعه مع العملاء..."
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-xs text-white leading-relaxed focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Custom Rules Textarea */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-white">
            قواعد وتوجيهات خاصة إضافية (تُطبق على كل رد):
          </label>
          <textarea
            rows={4}
            value={settings.customRules}
            onChange={(e) => handleFieldChange('customRules', e.target.value)}
            placeholder="- قاعدة 1...&#10;- قاعدة 2..."
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-xs text-white leading-relaxed font-mono focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Sales Strategy & Call to Action (CTA) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-700/60">
          <div>
            <label className="block text-xs font-bold text-white mb-2 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>الهدف البيعي الأساسي (Call to Action - CTA):</span>
            </label>
            <select
              value={settings.salesGoalCTA}
              onChange={(e) => handleFieldChange('salesGoalCTA', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="trial_class">
                حجز حصة تجريبية مجانية 100% (أعلى معدل تحويل لاشتراكات)
              </option>
              <option value="direct_subscription">
                إرسال رابط الاشتراك المباشر مع خصم 50%
              </option>
              <option value="placement_test">
                تحديد موعد اختبار تحديد المستوى مجاناً
              </option>
              <option value="consultation_call">
                تنسيق مكالمة استشارية مع المشرف التعليمي
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-2 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>طريقة وأسلوب السيلز (Sales Approach):</span>
            </label>
            <select
              value={settings.salesPitchIntensity}
              onChange={(e) => handleFieldChange('salesPitchIntensity', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="friendly_persuasive">
                مستشار مبيعات استشاري ودود ومقنع (يفهم العميل ويرشده)
              </option>
              <option value="closing_focused">
                سيلز حاسم لإغلاق الصفقات (التركيز على الخصم وحجز المقعد فوراً)
              </option>
              <option value="educational_patient">
                سيلز تعليمي صبور ومفصل (شرح المنهج والمستويات بالتفصيل)
              </option>
              <option value="direct">
                سيلز سريع ومباشر ومختصر
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Dialect Selector & Voice Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dialect Selector (7 cols) */}
        <div className="lg:col-span-7 bg-slate-800/80 rounded-3xl border border-slate-700/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
              <span>اختر اللهجة التي يتحدث بها الشات بوت:</span>
            </h3>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {dialects.map((d) => {
              const isSelected = settings.dialectVariant === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => handleFieldChange('dialectVariant', d.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer text-right ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500/70 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full border-2 ${
                          isSelected
                            ? 'border-purple-400 bg-purple-500'
                            : 'border-slate-600'
                        }`}
                      />
                      {d.name}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                        محدد الآن
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mb-1.5">{d.desc}</p>
                  <div className="p-2 rounded-xl bg-black/30 border border-slate-800 text-[11px] text-emerald-300/90 font-mono">
                    "{d.examples}"
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Dialect Prompt Input if 'custom' is selected */}
          {settings.dialectVariant === 'custom' && (
            <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2">
              <label className="block text-xs font-bold text-white">
                اكتب تعليمات اللهجة المخصصة بالتفصيل:
              </label>
              <textarea
                rows={3}
                value={settings.customDialectPrompt || ''}
                onChange={(e) => handleFieldChange('customDialectPrompt', e.target.value)}
                placeholder="مثال: تحدث باللهجة السودانية الودودة، استخدم كلمات مثل حبابك ألف، مرحب بيك، أبشر بالخير يا غالي..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white leading-relaxed"
              />
            </div>
          )}

          <div className="pt-3 border-t border-slate-700/60 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                اسم مستشار المبيعات المعروض للعميل:
              </label>
              <input
                type="text"
                value={settings.botName}
                onChange={(e) => handleFieldChange('botName', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                الرسالة الترحيبية الأولى فقط (تُرسل لمرة واحدة عند أول رسالة للعميل):
              </label>
              <textarea
                rows={3}
                value={settings.welcomeMessage}
                onChange={(e) => handleFieldChange('welcomeMessage', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Voice Notes, Speed, and Human Handoff (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Voice Notes Feature Card */}
          <div className="bg-slate-800/80 rounded-3xl border border-slate-700/80 p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Mic className="w-5 h-5 text-emerald-400" />
              <span>ميزة الاستماع للفويس نوت والرد الصوتي:</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              يفهم البوت الفويس نوت المبعوثة من العميل بأي لهجة عربية، ويفرغها بدقة ويجيب عليها صوتياً أو نصياً.
            </p>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-white">تفعيل الردود الصوتية (TTS):</span>
                <input
                  type="checkbox"
                  checked={settings.voiceResponsesEnabled}
                  onChange={(e) => handleFieldChange('voiceResponsesEnabled', e.target.checked)}
                  className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
                />
              </label>

              {settings.voiceResponsesEnabled && (
                <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">صوت المتحدث الصوتي:</label>
                    <select
                      value={settings.voiceGender}
                      onChange={(e) => handleFieldChange('voiceGender', e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="male">صوت رجالي وقور وواضح (المستشار راشد)</option>
                      <option value="female">صوت نسائي ودود ومتحمس (المستشارة سارة)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-start gap-2">
              <Headphones className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                مدعوم بنماذج Gemini الصوتية المتقدمة التي تفهم مخارج الحروف واللهجات المختلفة بدقة تامة.
              </span>
            </div>
          </div>

          {/* Human Handover Policy */}
          <div className="bg-slate-800/80 rounded-3xl border border-slate-700/80 p-6 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-amber-400" />
              <span>سياسة التحويل لموظف بشري:</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              عندما يطلب العميل صراحة مكالمة هاتفية أو التحدث مع شخص بشري، يرد عليه البوت فوراً بالرسالة التالية:
            </p>

            <textarea
              rows={3}
              value={settings.humanHandoffNotice}
              onChange={(e) => handleFieldChange('humanHandoffNotice', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white leading-relaxed"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 transition active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <Check className="w-5 h-5" />
                <span>تم حفظ السيناريو واللهجة وتحديث البوت!</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{isSaving ? 'جاري الحفظ...' : 'حفظ وتحديث عقل الشات بوت الآن'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
