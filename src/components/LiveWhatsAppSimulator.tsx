import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Play,
  Pause,
  Bot,
  User,
  CheckCheck,
  Sparkles,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Volume2,
  Clock,
  Check,
  AlertCircle,
  RefreshCw,
  Plus,
  ShieldCheck,
  Zap,
  Tag,
  FileSpreadsheet
} from 'lucide-react';
import { ChatLead, ChatMessage, WhatsAppState, BotSettings } from '../types';

interface LiveWhatsAppSimulatorProps {
  leads: ChatLead[];
  activeLeadId: string;
  setActiveLeadId: (id: string) => void;
  whatsappState: WhatsAppState | null;
  botSettings: BotSettings;
  onSendMessage: (leadId: string, text: string, audioBase64?: string, audioMimeType?: string) => Promise<void>;
  onAddNewLead: (name: string, phone: string, course: string) => Promise<void>;
  onNavigateToSheet?: () => void;
}

export const LiveWhatsAppSimulator: React.FC<LiveWhatsAppSimulatorProps> = ({
  leads,
  activeLeadId,
  setActiveLeadId,
  whatsappState,
  botSettings,
  onSendMessage,
  onAddNewLead,
  onNavigateToSheet,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerCourse, setNewCustomerCourse] = useState('دبلوم الذكاء الاصطناعي');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeLead = leads.find((l) => l.id === activeLeadId) || leads[0];

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeLead?.messages, isLoadingReply]);

  // Audio recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          setIsLoadingReply(true);
          try {
            await onSendMessage(activeLead.id, '', base64Audio, 'audio/webm');
          } finally {
            setIsLoadingReply(false);
          }
        };
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('يرجى السماح بالوصول إلى الميكروفون لتسجيل الرسالة الصوتية، أو استخدم نماذج الفويس نوت الجاهزة بالأسفل!');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoadingReply) return;
    const text = inputText;
    setInputText('');
    setIsLoadingReply(true);
    try {
      await onSendMessage(activeLead.id, text);
    } finally {
      setIsLoadingReply(false);
    }
  };

  const handlePlayVoice = (msgId: string, audioSrc?: string) => {
    if (!audioSrc) return;
    if (playingMessageId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingMessageId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(audioSrc);
      audioPlayerRef.current = audio;
      audio.play();
      setPlayingMessageId(msgId);
      audio.onended = () => setPlayingMessageId(null);
    }
  };

  const [knowledgeMode, setKnowledgeMode] = useState<{ curriculaActive: boolean; coursesActive: boolean; activeMode: string }>({
    curriculaActive: true,
    coursesActive: false,
    activeMode: 'curricula_only',
  });

  const fetchSimulatorKnowledgeMode = async () => {
    try {
      const res = await fetch('/api/knowledge/mode');
      const d = await res.json();
      if (d.success) setKnowledgeMode(d.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchSimulatorKnowledgeMode();
  }, []);

  const handleQuickSwitchMode = async (newMode: 'curricula_only' | 'courses_only' | 'both') => {
    try {
      const res = await fetch('/api/knowledge/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      const d = await res.json();
      if (d.success) {
        setKnowledgeMode(d.data);
      }
    } catch (e) {}
  };

  // Quick preset customer questions for testing both datasets, indirect questions, and 4-field trial booking
  const quickQuestions = [
    { label: '«ابني ضعيف في الإنجليزي» (سؤال غير مباشر)', text: 'ابني ضعيف في الإنجليزي ومستواه نازل في المدرسة' },
    { label: '«عايز أعرف الأسعار» (سؤال غير مباشر)', text: 'عايز أعرف الأسعار' },
    { label: '«طب ولو حبيت أجرب الأول؟» (سؤال التجربة)', text: 'طب ولو حبيت أجرب الأول؟' },
    { label: '«بتدرسوا للكبار ولا للأطفال بس؟»', text: 'بتدرسوا للكبار ولا للأطفال بس؟' },
    { label: '«ممكن أعرف مواعيدكم؟» (سؤال المواعيد)', text: 'ممكن أعرف مواعيدكم؟' },
    { label: '«تمام، يلا نبدأ» (متابعة دون ترحيب)', text: 'تمام، يلا نبدأ' },
    { label: '«بكام؟» (استنتاج من السياق السابق)', text: 'بكام؟' },
    { label: 'حجز تجربة مكتمل (البيانات الـ 4 كاملة)', text: 'اسمي أحمد، وعايز حجز حصة تجريبية ماث رابع ابتدائي يوم الخميس الساعة 7 مساء' },
    { label: 'طلب تجربة ناقص (غير مكتمل)', text: 'عايز أحجز حصة تجريبية' },
    { label: 'اختبار داتا المناهج فقط 📚', text: 'أنا محتاج مدرس خصوصي لمنهج الرياضيات والعلوم رابع ابتدائي' },
    { label: 'اختبار داتا الكورسات فقط 🎓', text: 'كم سعر دورة اللغة الألمانية للكبار لسوق العمل وهل معتمدة؟' },
  ];

  const handleQuickQuestion = async (qText: string) => {
    if (isLoadingReply) return;
    setIsLoadingReply(true);
    try {
      await onSendMessage(activeLead.id, qText);
    } finally {
      setIsLoadingReply(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName) return;
    await onAddNewLead(newCustomerName, newCustomerPhone, newCustomerCourse);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewLeadModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      
      {/* Top Bar with Status and Instructions */}
      <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <span className="font-semibold text-white">
            محاكي محادثات الواتساب الحي:
          </span>
          <span className="text-slate-300 hidden md:inline">
            جرّب إرسال رسائل أو فويس نوت وشاهد كيف يرد البوت فورياً باللهجة الخليجية وبالأسعار المحدثة!
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            الرد الآلي بالخليجي: مفعل 🟢
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
            اللهجة: {botSettings.dialectVariant === 'white_gulf' ? 'خليجية بيضاء' : botSettings.dialectVariant}
          </span>
        </div>
      </div>

      {/* Main WhatsApp Window Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl h-[700px]">
        
        {/* Left Sidebar: Leads & Chats List (4 cols) */}
        <div className="lg:col-span-4 border-l border-slate-800 flex flex-col h-full bg-[#111b21]">
          
          {/* Header of Sidebar */}
          <div className="p-3.5 bg-[#202c33] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow">
                WA
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">محادثات العملاء الواردة</h3>
                <span className="text-[11px] text-emerald-400 font-medium">واتساب بيزنس مربوط</span>
              </div>
            </div>

            <button
              onClick={() => setNewLeadModalOpen(true)}
              className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
              title="إضافة عميل تجريبي جديد"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Leads Filter / Search Summary */}
          <div className="p-2.5 bg-[#111b21] border-b border-slate-800/80">
            <div className="text-[11px] text-slate-400 flex items-center justify-between px-2">
              <span>العملاء المهتمين بالأكاديمية ({leads.length})</span>
              <span className="text-emerald-400 font-mono">24/7 نشط</span>
            </div>
          </div>

          {/* Leads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {leads.map((lead) => {
              const isActive = lead.id === activeLead.id;
              const lastMsg = lead.messages[lead.messages.length - 1];

              return (
                <button
                  key={lead.id}
                  onClick={() => setActiveLeadId(lead.id)}
                  className={`w-full p-3.5 flex items-start gap-3 transition text-right cursor-pointer ${
                    isActive ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]/70'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={lead.avatar}
                      alt={lead.customerName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-700"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#111b21]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-slate-100 truncate">
                        {lead.customerName}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {lead.lastMessageTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <p className="text-slate-400 truncate max-w-[190px]">
                        {lastMsg ? (
                          lastMsg.type === 'voice' ? (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <Mic className="w-3 h-3" />
                              <span>رسالة صوتية</span>
                            </span>
                          ) : (
                            lastMsg.content
                          )
                        ) : (
                          'محادثة جديدة'
                        )}
                      </p>

                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-emerald-300 font-medium shrink-0">
                        {lead.stage}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* Right Area: Active WhatsApp Chat Screen (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-full bg-[#0b141a]">
          
          {/* Chat Header (WhatsApp Web authentic style) */}
          <div className="p-3 bg-[#202c33] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={activeLead.avatar}
                  alt={activeLead.customerName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#202c33]" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{activeLead.customerName}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    {activeLead.interestedCourse || 'استفسار عام'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-mono" dir="ltr">{activeLead.phoneNumber}</span>
                  <span>•</span>
                  <span>{isLoadingReply ? 'المستشار راشد يكتب رداً بالخليجي...' : 'متصل الآن'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              {/* Active Dataset Quick Switcher for Testing */}
              <div className="flex items-center gap-1 bg-[#111b21] border border-slate-700/80 rounded-xl p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleQuickSwitchMode('curricula_only')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    knowledgeMode.curriculaActive && !knowledgeMode.coursesActive
                      ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="تفعيل داتا المناهج الدراسية فقط"
                >
                  <span>📚 مناهج</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSwitchMode('courses_only')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    !knowledgeMode.curriculaActive && knowledgeMode.coursesActive
                      ? 'bg-blue-500 text-slate-950 font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="تفعيل داتا الكورسات واللغات فقط"
                >
                  <span>🎓 كورسات</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSwitchMode('both')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    knowledgeMode.curriculaActive && knowledgeMode.coursesActive
                      ? 'bg-purple-500 text-slate-950 font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="تفعيل القسمين معاً"
                >
                  <span>⚡ كلاهما</span>
                </button>
              </div>

              {onNavigateToSheet && (
                <button
                  onClick={onNavigateToSheet}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer"
                  title="فتح شيت الإكسيل لحجز الحصة التجريبية للعميل"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">حجز الحصة بالشيت</span>
                </button>
              )}

              <span className="hidden xl:inline-block text-[11px] bg-slate-800/80 px-2.5 py-1 rounded-xl text-slate-300 border border-slate-700">
                مستشار الرد: <strong className="text-emerald-400">{botSettings.botName.split('-')[0]}</strong>
              </span>
            </div>
          </div>

          {/* Quick Suggestions Bar */}
          <div className="px-3 py-2 bg-[#111b21] border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
            <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>أسئلة سريعة:</span>
            </span>
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                disabled={isLoadingReply}
                onClick={() => handleQuickQuestion(q.text)}
                className="px-2.5 py-1 rounded-lg bg-[#202c33] hover:bg-slate-700 text-slate-200 text-[11px] whitespace-nowrap transition cursor-pointer border border-slate-700 disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Messages Feed Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 whatsapp-bg">
            
            {/* Live 4-Field Trial Booking Verification Banner */}
            <div className="bg-[#182229]/95 border border-slate-700/80 rounded-2xl p-3 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-200">
                    التحقق البرمجي من بيانات الحصة التجريبية (4 شروط إلزامية):
                  </span>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                    activeLead.trialStatus === 'طلب تجربة مكتمل (بانتظار التأكيد)'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : activeLead.trialStatus === 'طلب تجربة غير مكتمل (يحتاج استكمال بيانات)'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-700 text-slate-300 border-slate-600'
                  }`}
                >
                  {activeLead.trialStatus || 'استفسار جديد'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className={`p-1.5 rounded-xl border flex items-center gap-1.5 ${
                  activeLead.customerName && activeLead.customerName !== 'عميل جديد' && !activeLead.customerName.startsWith('عميل واتساب')
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}>
                  <span className="font-bold">1. الاسم:</span>
                  <span className="truncate">{activeLead.customerName && activeLead.customerName !== 'عميل جديد' ? activeLead.customerName : '⏳ ناقص'}</span>
                </div>

                <div className={`p-1.5 rounded-xl border flex items-center gap-1.5 ${
                  activeLead.trialSubject || (activeLead.interestedCourse && !activeLead.interestedCourse.includes('استفسار'))
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}>
                  <span className="font-bold">2. المادة:</span>
                  <span className="truncate">{activeLead.trialSubject || activeLead.interestedCourse || '⏳ ناقص'}</span>
                </div>

                <div className={`p-1.5 rounded-xl border flex items-center gap-1.5 ${
                  activeLead.studentGrade
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}>
                  <span className="font-bold">3. الصف/المستوى:</span>
                  <span className="truncate">{activeLead.studentGrade || '⏳ ناقص'}</span>
                </div>

                <div className={`p-1.5 rounded-xl border flex items-center gap-1.5 ${
                  activeLead.trialDayTime || (activeLead.trialDate && !activeLead.trialDate.includes('بانتظار'))
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}>
                  <span className="font-bold">4. الموعد:</span>
                  <span className="truncate">{activeLead.trialDayTime || activeLead.trialDate || '⏳ ناقص'}</span>
                </div>
              </div>
            </div>

            {/* Encryption & Safety Notice */}
            <div className="flex justify-center my-2">
              <div className="bg-[#182229] border border-amber-500/20 rounded-xl px-4 py-2 text-[11px] text-amber-200/90 text-center max-w-md shadow-sm">
                🔒 البوت يفصل تلقائياً بين داتا المناهج وداتا الكورسات بحسب الوضع المفعل ولا يخلط بينهما أبداً.
              </div>
            </div>

            {activeLead.messages.map((msg) => {
              const isCustomer = msg.sender === 'customer';

              return (
                <div
                  key={msg.id}
                  className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-md relative ${
                      isCustomer
                        ? 'bg-[#202c33] text-slate-100 rounded-tr-none border border-slate-700/60'
                        : 'bg-[#005c4b] text-white rounded-tl-none border border-emerald-600/30'
                    }`}
                  >
                    {/* Sender Label */}
                    <div className="flex items-center justify-between gap-2 mb-1 text-[11px] opacity-80">
                      <span className="font-semibold flex items-center gap-1">
                        {isCustomer ? (
                          <>
                            <User className="w-3 h-3 text-cyan-400" />
                            <span>{activeLead.customerName}</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-3 h-3 text-emerald-300" />
                            <span>{botSettings.botName}</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Content: Voice Note or Text */}
                    {msg.type === 'voice' || msg.audioBase64 ? (
                      <div className="space-y-2 py-1">
                        {/* Voice waveform player */}
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-black/20">
                          <button
                            onClick={() => handlePlayVoice(msg.id, msg.audioBase64)}
                            className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition cursor-pointer shadow shrink-0"
                          >
                            {playingMessageId === msg.id ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </button>

                          <div className="flex-1 flex items-center gap-1 h-6">
                            {[12, 22, 16, 28, 14, 24, 18, 30, 20, 15, 26, 12, 22, 18].map((h, i) => (
                              <span
                                key={i}
                                style={{ height: `${h}px` }}
                                className={`w-1 rounded-full transition-all ${
                                  playingMessageId === msg.id ? 'bg-emerald-400 audio-bar-anim' : 'bg-slate-400'
                                }`}
                              />
                            ))}
                          </div>

                          <div className="text-[10px] font-mono text-slate-300 flex items-center gap-1">
                            <Volume2 className="w-3 h-3 text-emerald-400" />
                            <span>فويس نوت</span>
                          </div>
                        </div>

                        {/* Transcription / Gulf response explanation */}
                        {msg.transcription && (
                          <div className="p-2 rounded-lg bg-black/30 border border-slate-700/60 text-[11px] text-slate-200">
                            <span className="text-emerald-400 font-semibold block mb-0.5">
                              🎙️ تم الاستماع وفهم الفويس نوت:
                            </span>
                            "{msg.transcription}"
                          </div>
                        )}

                        {/* If Bot Voice, also show the formatted text */}
                        {!isCustomer && msg.content && (
                          <div className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-line mt-1">
                            {msg.content}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Regular Text Message */
                      <div className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-line">
                        {msg.content}
                      </div>
                    )}

                    {/* Timestamp & Status Indicator */}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-300/80">
                      <span>{msg.timestamp}</span>
                      {!isCustomer && (
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </div>

                  </div>
                </div>
              );
            })}

            {/* Typing / Thinking Indicator */}
            {isLoadingReply && (
              <div className="flex justify-end">
                <div className="bg-[#005c4b] text-emerald-100 rounded-2xl rounded-tl-none p-3 shadow-md flex items-center gap-2 border border-emerald-600/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                  <span className="text-xs font-medium">المستشار راشد يراجع الأسعار ويكتب رداً خليجياً ودوداً...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice Recording Active Bar */}
          {isRecording && (
            <div className="bg-rose-950/70 border-t border-rose-500/30 p-3 flex items-center justify-between text-xs text-rose-200">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-semibold">جاري تسجيل الفويس نوت الآن: {recordingSeconds} ثانية</span>
              </div>
              <button
                onClick={stopRecording}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer"
              >
                إيقاف وإرسال للبوت
              </button>
            </div>
          )}

          {/* Quick Grounded Testing Prompts */}
          <div className="px-3 pt-2 pb-1 bg-[#182229] border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
            <span className="text-slate-400 font-semibold shrink-0 ml-1">تجربة سريعة للداتا:</span>
            {[
              'إيه هي ذاكرلي أكاديمي؟',
              'هل في حصة تجريبية مجانية؟',
              'بكام كورس الإنجليزي وهل في خصم؟',
              'هل الشهادة معتمدة وتفيدني في الـ CV؟',
              'متاح تقسيط تابي أو تمارا؟',
              'هل الكورسات مسجلة أقدر أرجع لها؟'
            ].map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(q)}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-300 border border-slate-700/80 hover:border-emerald-500/40 transition shrink-0 cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Footer Area (WhatsApp Web authentic style) */}
          <div className="p-3 bg-[#202c33] border-t border-slate-800">
            <form onSubmit={handleSendText} className="flex items-center gap-2">
              
              {/* Voice Record Button */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                title={isRecording ? 'إيقاف التسجيل' : 'تسجيل فويس نوت وإرسالها للبوت'}
                className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-[#2a3942] hover:bg-emerald-600 text-slate-300 hover:text-white'
                }`}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Text Input Field */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب استفسار العميل هنا (مثل: إيه هي ذاكرلي أكاديمي؟ أو كم سعر كورس الإنجليزي؟)..."
                disabled={isLoadingReply || isRecording}
                className="flex-1 bg-[#2a3942] border border-slate-700/60 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoadingReply || isRecording}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow"
              >
                <Send className="w-5 h-5 rotate-180" />
              </button>

            </form>
          </div>

        </div>

      </div>

      {/* New Lead Modal */}
      {newLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>إضافة عميل / طالب جديد للمحاكاة</span>
            </h3>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">اسم العميل:</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="مثال: تركي القحطاني"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">رقم الهاتف (واتساب):</label>
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="+966 5X XXX XXXX"
                  dir="ltr"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">الكورس المهتم به:</label>
                <select
                  value={newCustomerCourse}
                  onChange={(e) => setNewCustomerCourse(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="دورة احتراف اللغة الإنجليزية للمحادثة وسوق العمل">
                    دورة احتراف اللغة الإنجليزية للمحادثة وسوق العمل
                  </option>
                  <option value="دورة اللغة الألمانية التفاعلية من الصفر حتى B2">
                    دورة اللغة الألمانية التفاعلية من الصفر حتى B2
                  </option>
                  <option value="دورة اللغة الفرنسية للمحادثة والتأسيس">
                    دورة اللغة الفرنسية للمحادثة والتأسيس
                  </option>
                  <option value="دبلوم مهارات العمل الحر والربح من الإنترنت (Freelancing)">
                    دبلوم مهارات العمل الحر والربح من الإنترنت (Freelancing)
                  </option>
                  <option value="برنامج مهارات التواصل والإقناع والعرض التقديمي">
                    برنامج مهارات التواصل والإقناع والعرض التقديمي
                  </option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer"
                >
                  بدء المحادثة
                </button>
                <button
                  type="button"
                  onClick={() => setNewLeadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
