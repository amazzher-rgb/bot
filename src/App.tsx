/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { WhatsAppLinkDevice } from './components/WhatsAppLinkDevice';
import { LiveWhatsAppSimulator } from './components/LiveWhatsAppSimulator';

import { AcademyKnowledgeManager } from './components/AcademyKnowledgeManager';
import { BotPersonaSettings } from './components/BotPersonaSettings';
import { WhatsAppQrModal } from './components/WhatsAppQrModal';
import { ExcelLeadsSheet } from './components/ExcelLeadsSheet';
import { SupervisorRoutingManager } from './components/SupervisorRoutingManager';
import {
  WhatsAppState,
  AcademyData,
  PricingItem,
  BotSettings,
  ChatLead,
  ChatMessage,
} from './types';
import {
  Bot,
  QrCode,
  Zap,
  GraduationCap,
  Sparkles,
  Smartphone,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

const DEFAULT_ACADEMY_DATA: AcademyData = {
  name: 'أكاديمية ذاكرلي التعليمية (Zakirly)',
  tagline: 'منصة رائدة للتعليم الأونلاين ودروس المناهج والكورسات المعتمدة',
  about: 'أكاديمية ذاكرلي (Zakirly) لتقديم التعليم عن بُعد، والدروس الفردية أونلاين، والكورسات التعليمية لمختلف الأعمار مع نخبة من المعلمين المعتمدين.',
  phone: '+966501112233',
  email: 'info@zakirly.com',
  city: 'الرياض، المملكة العربية السعودية',
  workingHours: 'من 9:00 صباحاً حتى 11:00 مساءً طوال أيام الأسبوع',
  guarantee: 'حصة تجريبية مجانية 100% مع ضمان استرداد الرسوم إن لم تكن راضياً عن الخدمة',
  faqs: [
    { question: 'هل الحصة التجريبية مجانية؟', answer: 'نعم، الحصة الأولى تجريبية مجانية تماماً وبدون أي التزام لتجربة المعلم والمنهج.' },
    { question: 'كيف يتم حجز الموعد؟', answer: 'بمجرد تسجيل اسم الطالب والصف والمادة، يتم التنسيق وتحديد الموعد المناسب لحضرتكم عبر زووم.' }
  ],
  courses: []
};

const DEFAULT_PRICING: PricingItem[] = [
  {
    id: 'p-1',
    courseId: 'c-1',
    courseTitle: 'دورة احتراف اللغة الإنجليزية للمحادثة وسوق العمل',
    originalPrice: 1200,
    currentPrice: 599,
    currency: 'ريال سعودي',
    discountPercentage: 50,
    isOfferActive: true,
    offerExpiresAt: 'نهاية الأسبوع الحالي (مقاعد محدودة)',
    promoCode: 'THAKERLI50',
    promoDiscountExtra: 10,
    notes: 'يشمل حصة تجريبية مجانية وماتريال معتمدة من المركز الثقافي.'
  },
  {
    id: 'p-2',
    courseId: 'c-2',
    courseTitle: 'دورة اللغة الألمانية من الصفر حتى الإتقان (A1 - B2)',
    originalPrice: 1400,
    currentPrice: 699,
    currency: 'ريال سعودي',
    discountPercentage: 50,
    isOfferActive: true,
    offerExpiresAt: 'لفترة محدودة',
    promoCode: 'DEUTSCH10',
    promoDiscountExtra: 10,
    notes: 'مجموعات صغيرة تفاعلية، حصة تجريبية مجانية، شهادة معتمدة.'
  }
];

const DEFAULT_BOT_SETTINGS: BotSettings = {
  botName: 'المساعد الذكي لأكاديمية ذاكرلي',
  dialectVariant: 'white_gulf',
  salesPitchIntensity: 'friendly_persuasive',
  conversationScenario: 'مساعد خدمة عملاء واستشارات تعليمية خبير لأكاديمية ذاكرلي',
  customRules: 'فهم الأسئلة غير المباشرة وجمع البيانات الأربعة للحصة التجريبية',
  strictKnowledgeOnly: true,
  greetOnceOnly: true,
  salesGoalCTA: 'trial_class',
  toneDescription: 'لهجة خليجية بيضاء ودودة ومهنية',
  welcomeMessage: 'يا هلا ومسهلا بك في أكاديمية ذاكرلي التعليمية! 🌟 نسعد بخدمتكم وتوفير أفضل المعلمين المتخصصين لدروس المناهج والكورسات أونلاين. كيف أقدر أساعدك اليوم؟',
  voiceResponsesEnabled: true,
  voiceGender: 'female',
  responseSpeedSec: 1,
  humanHandoffNotice: 'تم توجيه بياناتك فورياً لمشرف القسم للتواصل معك وتأكيد الحجز.'
};

const DEFAULT_LEADS: ChatLead[] = [
  {
    id: 'lead-1',
    phoneNumber: '+966 50 892 4110',
    customerName: 'عبدالعزيز الشمري',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastMessageTime: 'منذ 3 دقائق',
    createdAt: '2026-10-24 11:02 ص',
    interestedCourse: 'دبلوم الذكاء الاصطناعي',
    leadCategory: 'كورسات وتطوير',
    stage: 'مهتم بالأسعار',
    trialStatus: 'بانتظار مكالمة الإشراف',
    trialDate: 'بانتظار التنسيق مع العميل',
    assignedSupervisor: 'أ. ناصر الحربي (مشرف الكورسات)',
    supervisorNotes: 'سأل عن كورس الذكاء الاصطناعي ويرغب في حصة تجريبية مسائية.',
    isHighPriority: true,
    leadSource: 'واتساب بيزنس',
    messages: [
      {
        id: 'msg-1',
        sender: 'customer',
        type: 'text',
        content: 'السلام عليكم ورحمة الله، حاب أستفسر عن دورات البرمجة والذكاء الاصطناعي وهل المحاضرات لايف؟',
        timestamp: '11:02 ص',
        status: 'read'
      },
      {
        id: 'msg-2',
        sender: 'bot',
        type: 'text',
        content: 'وعليكم السلام والرحمة والإكرام، يا هلا والله ومسهلا بأخوي عبدالعزيز! 🌟 نعم المحاضرات تفاعلية لايف عبر زووم مع مدربين معتمدين وتُسجل بالكامل بحسابك. تحب أحدد لك موعد حصة تجريبية مجانية؟',
        timestamp: '11:02 ص',
        status: 'read'
      }
    ]
  }
];

const DEFAULT_WHATSAPP_STATE: WhatsAppState = {
  status: 'disconnected',
  pairedPhone: null,
  deviceName: 'WhatsApp Business Companion (Zakirly Bot)',
  batteryLevel: 98,
  qrCodeUrl: null,
  qrRaw: null,
  qrExpiresAt: Date.now() + 35000,
  linkedAt: null,
  lastSyncAt: 'الآن',
  pairingCode: 'ZAK-8899',
  autoReplyEnabled: true,
  totalMessagesReplied: 28,
};

const getInitialWhatsAppState = (): WhatsAppState => {
  try {
    const isLocalConnected = localStorage.getItem('zakirly_is_connected') === 'true';
    if (isLocalConnected) {
      return {
        status: 'connected',
        pairedPhone: localStorage.getItem('zakirly_phone') || '+966 55 987 6543',
        deviceName: 'WhatsApp Business Companion (نشط ومفعل)',
        batteryLevel: 98,
        qrCodeUrl: null,
        qrRaw: null,
        qrExpiresAt: null,
        linkedAt: localStorage.getItem('zakirly_linked_at') || 'اليوم',
        lastSyncAt: 'الآن',
        pairingCode: null,
        autoReplyEnabled: true,
        totalMessagesReplied: 28,
      };
    }
  } catch (e) {
    // localStorage not accessible
  }
  return DEFAULT_WHATSAPP_STATE;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('qr-link');
  const [whatsappState, setWhatsappState] = useState<WhatsAppState | null>(getInitialWhatsAppState);
  const [academyData, setAcademyData] = useState<AcademyData | null>(null);
  const [pricingList, setPricingList] = useState<PricingItem[]>([]);
  const [botSettings, setBotSettings] = useState<BotSettings | null>(null);
  const [leads, setLeads] = useState<ChatLead[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string>('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [backendUrl, setBackendUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('zakirly_backend_url') || '';
    } catch {
      return '';
    }
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper fetch function supporting custom backend URL
  const apiFetch = async <T,>(endpoint: string, options?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> => {
    try {
      const customUrl = localStorage.getItem('zakirly_backend_url')?.trim() || '';
      const finalUrl = customUrl ? `${customUrl.replace(/\/$/, '')}${endpoint}` : endpoint;
      const res = await fetch(finalUrl, options);
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}` };
      }
      const data = await res.json();
      return {
        success: data.success !== false,
        data: data.data || data,
        error: data.error,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Save or update custom backend URL
  const handleSaveBackendUrl = async (url: string): Promise<boolean> => {
    const cleanUrl = url.trim().replace(/\/$/, '');
    if (!cleanUrl) {
      try {
        localStorage.removeItem('zakirly_backend_url');
      } catch {}
      setBackendUrl('');
      setIsBackendConnected(false);
      showToast('تمت إعادة الضبط للوضع الافتراضي');
      fetchData();
      return true;
    }
    try {
      const res = await fetch(`${cleanUrl}/api/health`);
      if (res.ok) {
        try {
          localStorage.setItem('zakirly_backend_url', cleanUrl);
        } catch {}
        setBackendUrl(cleanUrl);
        setIsBackendConnected(true);
        showToast('✅ تم الاتصال بنجاح بسيرفر واتساب!');
        fetchData();
        return true;
      } else {
        showToast('⚠️ تعذر التحقق من السيرفر. تأكد من صحة الرابط.');
        return false;
      }
    } catch (e: any) {
      showToast('⚠️ فشل الاتصال بالسيرفر: ' + (e.message || 'خطأ في الشبكة'));
      return false;
    }
  };

  // Load initial data
  const fetchData = useCallback(async () => {
    try {
      const [waRes, academyRes, pricingRes, botRes, chatsRes] = await Promise.all([
        apiFetch<WhatsAppState>('/api/whatsapp/status'),
        apiFetch<AcademyData>('/api/academy'),
        apiFetch<PricingItem[]>('/api/pricing'),
        apiFetch<BotSettings>('/api/bot-settings'),
        apiFetch<ChatLead[]>('/api/chats'),
      ]);

      if (waRes.success && waRes.data) {
        setIsBackendConnected(true);
        setWhatsappState(waRes.data);
        if (waRes.data.status === 'connected') {
          try {
            localStorage.setItem('zakirly_is_connected', 'true');
            if (waRes.data.pairedPhone) {
              localStorage.setItem('zakirly_phone', waRes.data.pairedPhone);
            }
          } catch {}
        }
        if (waRes.data.status === 'disconnected' && !waRes.data.qrCodeUrl) {
          apiFetch<WhatsAppState>('/api/whatsapp/connect', { method: 'POST' })
            .then((d) => {
              if (d.success && d.data) setWhatsappState(d.data);
            })
            .catch(console.error);
        }
      } else {
        setIsBackendConnected(false);
        setWhatsappState(getInitialWhatsAppState());
      }

      if (academyRes.success && academyRes.data) {
        setAcademyData(academyRes.data);
      } else {
        setAcademyData((prev) => prev || DEFAULT_ACADEMY_DATA);
      }

      if (pricingRes.success && Array.isArray(pricingRes.data)) {
        setPricingList(pricingRes.data);
      } else {
        setPricingList((prev) => (prev.length ? prev : DEFAULT_PRICING));
      }

      if (botRes.success && botRes.data) {
        setBotSettings(botRes.data);
      } else {
        setBotSettings((prev) => prev || DEFAULT_BOT_SETTINGS);
      }

      if (chatsRes.success && Array.isArray(chatsRes.data)) {
        setLeads(chatsRes.data);
        if (chatsRes.data.length > 0 && !activeLeadId) {
          setActiveLeadId(chatsRes.data[0].id);
        }
      } else {
        setLeads((prev) => (prev.length ? prev : DEFAULT_LEADS));
        if (!activeLeadId) setActiveLeadId(DEFAULT_LEADS[0].id);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setIsBackendConnected(false);
      setWhatsappState(getInitialWhatsAppState());
      setAcademyData((prev) => prev || DEFAULT_ACADEMY_DATA);
      setPricingList((prev) => (prev.length ? prev : DEFAULT_PRICING));
      setBotSettings((prev) => prev || DEFAULT_BOT_SETTINGS);
      setLeads((prev) => (prev.length ? prev : DEFAULT_LEADS));
    }
  }, [activeLeadId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling for live updates if backend is reachable or custom URL is configured
  useEffect(() => {
    const intervalTime = whatsappState?.status === 'connected' ? 4000 : 2500;
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch<WhatsAppState>('/api/whatsapp/status');
        if (res.success && res.data) {
          setIsBackendConnected(true);
          setWhatsappState((prev) => {
            if (prev?.status !== 'connected' && res.data?.status === 'connected') {
              setQrModalOpen(false);
              showToast('🎉 تم الربط بنجاح! الشات بوت متصل الآن ومزامن 100% مع هاتفك.');
              try {
                localStorage.setItem('zakirly_is_connected', 'true');
              } catch {}
            }
            return res.data!;
          });
        }

        // Also fetch latest chat leads periodically if backend responds
        const chatsRes = await apiFetch<ChatLead[]>('/api/chats');
        if (chatsRes.success && Array.isArray(chatsRes.data)) {
          setLeads(chatsRes.data);
        }
      } catch (e) {
        // silent polling error
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [whatsappState?.status]);

  // Actions
  const handleConnectQr = async () => {
    try {
      const res = await apiFetch<WhatsAppState>('/api/whatsapp/connect', { method: 'POST' });
      if (res.success && res.data) {
        setIsBackendConnected(true);
        setWhatsappState(res.data);
        showToast('تم تحديث رمز الـ QR بنجاح من خادم واتساب');
      } else {
        setWhatsappState((prev) => ({
          ...(prev || DEFAULT_WHATSAPP_STATE),
          qrExpiresAt: Date.now() + 35000,
        }));
        showToast('تم تحديث رمز المعاينة');
      }
    } catch (err) {
      console.error('Failed to generate QR:', err);
    }
  };

  const handleConfirmScan = async (phone?: string) => {
    const phoneToUse = phone || '+966 55 987 6543';
    const timeNow = new Date().toLocaleTimeString('ar-SA');
    try {
      localStorage.setItem('zakirly_is_connected', 'true');
      localStorage.setItem('zakirly_phone', phoneToUse);
      localStorage.setItem('zakirly_linked_at', timeNow);
    } catch {}

    try {
      const res = await apiFetch<WhatsAppState>('/api/whatsapp/confirm-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneToUse }),
      });

      if (res.success && res.data) {
        setIsBackendConnected(true);
        setWhatsappState(res.data);
      } else {
        setWhatsappState({
          status: 'connected',
          pairedPhone: phoneToUse,
          deviceName: 'WhatsApp Business Companion (نشط ومفعل)',
          batteryLevel: 98,
          qrCodeUrl: null,
          qrRaw: null,
          qrExpiresAt: null,
          linkedAt: timeNow,
          lastSyncAt: 'الآن',
          pairingCode: null,
          autoReplyEnabled: true,
          totalMessagesReplied: 28,
        });
      }
      setQrModalOpen(false);
      showToast('🎉 تم تفعيل البوت وربطه بنجاح! الشات بوت الآن نشط ومقترن باللون الأخضر.');
    } catch (err) {
      console.error('Failed to confirm scan:', err);
    }
  };

  const handlePairWithCode = async (phone: string) => {
    try {
      const res = await apiFetch<WhatsAppState>('/api/whatsapp/pair-with-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (res.success && res.data) {
        setIsBackendConnected(true);
        setWhatsappState(res.data);
        showToast('تم تأكيد كود الاقتران وربط الرقم بنجاح!');
      } else {
        setWhatsappState((prev) => ({
          ...(prev || DEFAULT_WHATSAPP_STATE),
          pairingCode: 'ZAK-' + Math.floor(1000 + Math.random() * 9000),
        }));
        showToast('تم توليد كود الاقتران بنجاح');
      }
    } catch (err) {
      console.error('Failed to pair with code:', err);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('هل تريد بالتأكيد فصل جهاز واتساب المصاحب؟')) return;
    try {
      localStorage.removeItem('zakirly_is_connected');
    } catch {}

    try {
      const res = await apiFetch<WhatsAppState>('/api/whatsapp/disconnect', { method: 'POST' });
      if (res.success && res.data) {
        setWhatsappState(res.data);
      } else {
        setWhatsappState(DEFAULT_WHATSAPP_STATE);
      }
    } catch (err) {
      setWhatsappState(DEFAULT_WHATSAPP_STATE);
    }
    showToast('تم فصل جهاز واتساب المصاحب.');
    handleConnectQr();
  };

  const handleSavePricing = async (updated: PricingItem[]) => {
    try {
      const res = await apiFetch<PricingItem[]>('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing: updated }),
      });
      if (res.success && res.data) {
        setPricingList(res.data);
      } else {
        setPricingList(updated);
      }
      showToast('✅ تم حفظ الأسعار والعروض، والبوت يعتمد عليها فورياً!');
    } catch (err) {
      console.error('Failed to save pricing:', err);
    }
  };

  const handleSaveAcademy = async (dataToSave: AcademyData) => {
    try {
      const res = await apiFetch<AcademyData>('/api/academy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      if (res.success && res.data) {
        setAcademyData(res.data);
      } else {
        setAcademyData(dataToSave);
      }
      showToast('✅ تم تحديث بيانات الأكاديمية بنجاح!');
    } catch (err) {
      console.error('Failed to save academy:', err);
    }
  };

  const handleSaveBotSettings = async (settingsToSave: BotSettings) => {
    try {
      const res = await apiFetch<BotSettings>('/api/bot-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
      });
      if (res.success && res.data) {
        setBotSettings(res.data);
      } else {
        setBotSettings(settingsToSave);
      }
      showToast('✅ تم تحديث إعدادات اللهجة الخليجية والفويس نوت!');
    } catch (err) {
      console.error('Failed to save bot settings:', err);
    }
  };

  const handleSendMessage = async (
    leadId: string,
    text: string,
    audioBase64?: string,
    audioMimeType?: string
  ) => {
    try {
      const res = await apiFetch<{ success: boolean; botReply?: string }>('/api/chats/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, text, audioBase64, audioMimeType }),
      });

      if (res.success) {
        // Refresh leads list from backend
        const chatsRes = await apiFetch<ChatLead[]>('/api/chats');
        if (chatsRes.success && chatsRes.data) {
          setLeads(chatsRes.data);
        }
      } else {
        const nowTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        const userMsg: ChatMessage = {
          id: 'msg-' + Date.now(),
          sender: 'customer',
          type: audioBase64 ? 'voice' : 'text',
          content: text || 'تسجيل صوتي من العميل (فويس نوت)',
          timestamp: nowTime,
          status: 'read',
        };

        const simulatedBotText = text.includes('سعر') || text.includes('بكام')
          ? 'يا هلا وغلا! أسعار الحصص والمناهج عندنا تبدأ بعروض خاصة وخصم يصل إلى 50% مع حصة تجريبية أولى مجاناً بالكامل. هل تحب أسجلك تجربة مع معلم المادة؟'
          : text.includes('تجرب') || text.includes('حصة')
          ? 'أبشر والله بعزك! لحجز الحصة التجريبية المجانية أحتاج منك تفضلاً: اسم الطالب، الصف الدراسي، والمادة واليوم المفضل لحضرتك؟'
          : 'أهلاً بك في أكاديمية ذاكرلي 🌟 نسعد بخدمتك دائماً. هل استفسارك يخص الدروس والمناهج المدرسية أم دورات اللغات والبرمجة؟';

        const botReplyMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'bot',
          type: 'text',
          content: simulatedBotText,
          timestamp: nowTime,
          status: 'read',
        };

        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  messages: [...l.messages, userMsg, botReplyMsg],
                  lastMessageTime: 'الآن',
                }
              : l
          )
        );
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleAddNewLead = async (name: string, phone: string, course: string) => {
    try {
      const res = await apiFetch<ChatLead>('/api/chats/new-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: name, phoneNumber: phone, interestedCourse: course }),
      });

      if (res.success && res.data) {
        setLeads((prev) => [res.data!, ...prev]);
        setActiveLeadId(res.data.id);
      } else {
        const newLead: ChatLead = {
          id: 'lead-' + Date.now(),
          customerName: name,
          phoneNumber: phone,
          interestedCourse: course,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          unreadCount: 0,
          lastMessageTime: 'الآن',
          createdAt: new Date().toLocaleDateString('ar-SA'),
          leadCategory: course.includes('دبلوم') || course.includes('كورس') ? 'كورسات وتطوير' : 'مناهج دراسية',
          stage: 'استفسار جديد',
          trialStatus: 'بانتظار مكالمة الإشراف',
          trialDate: 'بانتظار التنسيق مع العميل',
          assignedSupervisor: course.includes('كورس') ? 'أ. ناصر الحربي (مشرف الكورسات)' : 'أ. أحمد السعيد (مشرف المناهج)',
          supervisorNotes: 'عميل جديد تمت إضافته يدوياً',
          isHighPriority: false,
          leadSource: 'واتساب بيزنس',
          messages: [
            {
              id: 'msg-init-' + Date.now(),
              sender: 'bot',
              type: 'text',
              content: `يا هلا ومسهلا بك ${name} في أكاديمية ذاكرلي 🌟 كيف نقدر نساعدك اليوم بخصوص ${course}؟`,
              timestamp: 'الآن',
              status: 'read'
            }
          ]
        };
        setLeads((prev) => [newLead, ...prev]);
        setActiveLeadId(newLead.id);
      }
      setActiveTab('chat-simulator');
      showToast(`تم بدء محادثة جديدة مع ${name}`);
    } catch (err) {
      console.error('Error creating lead:', err);
    }
  };

  const handleUpdateLead = async (leadId: string, updates: Partial<ChatLead>) => {
    try {
      await apiFetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, ...updates } : l))
      );
      showToast('✅ تم تحديث بيانات العميل في شيت الإكسيل بنجاح!');
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  };

  const handleRefreshLeads = async () => {
    try {
      const res = await apiFetch<ChatLead[]>('/api/chats');
      if (res.success && res.data) {
        setLeads(res.data);
        showToast('تم تحديث بيانات شيت العملاء لحظياً');
      }
    } catch (err) {
      console.error('Failed to refresh leads:', err);
    }
  };

  const pendingSupervisionCount = leads.filter(
    (l) => l.trialStatus === 'بانتظار مكالمة الإشراف'
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/40 animate-in slide-in-from-bottom-5">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        whatsappState={whatsappState}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQrModal={() => setQrModalOpen(true)}
        onDisconnect={handleDisconnect}
        pendingSupervisionCount={pendingSupervisionCount}
      />

      {/* Main App Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Tab 1: QR Link Device */}
        {activeTab === 'qr-link' && (
          <WhatsAppLinkDevice
            whatsappState={whatsappState}
            onConnectQr={handleConnectQr}
            onConfirmScan={handleConfirmScan}
            onPairWithCode={handlePairWithCode}
            onDisconnect={handleDisconnect}
            onNavigateToChat={() => setActiveTab('chat-simulator')}
            isBackendConnected={isBackendConnected}
            backendUrl={backendUrl}
            onSaveBackendUrl={handleSaveBackendUrl}
          />
        )}

        {/* Tab 2: WhatsApp Chat Simulator & Voice Notes */}
        {activeTab === 'chat-simulator' && botSettings && (
          <LiveWhatsAppSimulator
            leads={leads}
            activeLeadId={activeLeadId || (leads[0]?.id ?? '')}
            setActiveLeadId={setActiveLeadId}
            whatsappState={whatsappState}
            botSettings={botSettings}
            onSendMessage={handleSendMessage}
            onAddNewLead={handleAddNewLead}
            onNavigateToSheet={() => setActiveTab('excel-leads')}
          />
        )}

        {/* Tab 3: Excel Leads Sheet & Supervisory Trial Booking */}
        {activeTab === 'excel-leads' && (
          <ExcelLeadsSheet
            leads={leads}
            onUpdateLead={handleUpdateLead}
            onOpenChatWithLead={(leadId) => {
              setActiveLeadId(leadId);
              setActiveTab('chat-simulator');
            }}
            onRefreshData={handleRefreshLeads}
            onNavigateToRouting={() => setActiveTab('supervisor-routing')}
          />
        )}

        {/* Tab: WhatsApp Supervisor Routing (Curricula vs Courses) */}
        {activeTab === 'supervisor-routing' && (
          <SupervisorRoutingManager
            leads={leads}
            onRefreshData={handleRefreshLeads}
            onNavigateToExcel={() => setActiveTab('excel-leads')}
          />
        )}



        {/* Tab 4: Academy Knowledge Base */}
        {activeTab === 'academy-knowledge' && academyData && (
          <AcademyKnowledgeManager
            academyData={academyData}
            onSaveAcademy={handleSaveAcademy}
            onModeChangeNotification={showToast}
          />
        )}

        {/* Tab 5: Bot Persona & Gulf Dialect Settings */}
        {activeTab === 'bot-persona' && botSettings && (
          <BotPersonaSettings
            botSettings={botSettings}
            onSaveSettings={handleSaveBotSettings}
          />
        )}

      </main>

      {/* Quick QR Code Modal */}
      <WhatsAppQrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        whatsappState={whatsappState}
        onRefreshQr={handleConnectQr}
        onConfirmScan={() => handleConfirmScan()}
        onNavigateToSimulator={() => setActiveTab('chat-simulator')}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>منظومة بوت واتساب بيزنس كجهاز مصاحب • مدعوم بـ Google Gemini</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>ردود باللهجة الخليجية</span>
            <span>•</span>
            <span>فهم الفويس نوت الصوتي</span>
            <span>•</span>
            <span>أسعار وعروض فورية وحصص تجريبية</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
