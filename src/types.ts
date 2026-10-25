export interface WhatsAppState {
  status: 'disconnected' | 'connecting' | 'connected';
  pairedPhone: string | null;
  deviceName: string;
  batteryLevel: number;
  qrCodeUrl: string | null;
  qrRaw: string | null;
  qrExpiresAt: number | null;
  linkedAt: string | null;
  lastSyncAt: string | null;
  pairingCode: string | null;
  autoReplyEnabled: boolean;
  totalMessagesReplied: number;
}

export interface Course {
  id: string;
  title: string;
  category: string;
  duration: string;
  schedule: string;
  mode: 'online' | 'hybrid' | 'in_person';
  accreditation: string;
  description: string;
  syllabus: string[];
  features: string[];
  price?: string;
}

export interface AcademyData {
  name: string;
  tagline: string;
  about: string;
  phone: string;
  email: string;
  city: string;
  workingHours: string;
  guarantee: string;
  faqs: { question: string; answer: string; category?: string }[];
  courses: Course[];
}

export interface CurriculaStage {
  id: string;
  name: string;
  targetAges: string;
  subjects: string[];
  sessionType: string;
  priceNote: string;
}

export interface CurriculaData {
  id: string;
  title: string;
  enabled: boolean;
  lastUpdated?: string;
  campaignTarget: string;
  overview: string;
  pricingPolicy: string;
  stages: CurriculaStage[];
  uploadedNotes: string;
  supervisor: {
    name: string;
    title: string;
    phone: string;
  };
  faqs: { question: string; answer: string; category?: string }[];
}

export interface CoursesData {
  id: string;
  title: string;
  enabled: boolean;
  lastUpdated?: string;
  campaignTarget: string;
  overview: string;
  pricingPolicy: string;
  courses: Course[];
  uploadedNotes: string;
  supervisor: {
    name: string;
    title: string;
    phone: string;
  };
  faqs: { question: string; answer: string; category?: string }[];
}

export interface ActiveKnowledgeMode {
  curriculaActive: boolean;
  coursesActive: boolean;
  activeMode: 'curricula_only' | 'courses_only' | 'both';
  lastChangedAt?: string;
}


export interface PricingItem {
  id: string;
  courseId: string;
  courseTitle: string;
  originalPrice: number;
  currentPrice: number;
  currency: string;
  discountPercentage: number;
  isOfferActive: boolean;
  offerExpiresAt: string;
  tabbyInstallment?: number;
  tamaraInstallment?: number;
  promoCode: string;
  promoDiscountExtra: number;
  notes: string;
}

export interface BotSettings {
  botName: string;
  dialectVariant:
    | 'white_gulf'
    | 'najdi'
    | 'hejaz'
    | 'emirati'
    | 'kuwaiti'
    | 'egyptian'
    | 'levantine'
    | 'modern_standard'
    | 'custom';
  customDialectPrompt?: string;
  salesPitchIntensity:
    | 'consultative'
    | 'friendly_persuasive'
    | 'direct'
    | 'closing_focused'
    | 'educational_patient';
  conversationScenario: string; // The custom sales scenario & context provided by admin
  customRules: string; // Specific instructions for edge cases
  strictKnowledgeOnly: boolean; // Anti-hallucination: use uploaded data 100%
  greetOnceOnly: boolean; // Greet in the first message only, never repeat greetings in ongoing chats
  salesGoalCTA: 'trial_class' | 'direct_subscription' | 'placement_test' | 'consultation_call';
  toneDescription: string;
  welcomeMessage: string;
  voiceResponsesEnabled: boolean;
  voiceGender: 'male' | 'female';
  responseSpeedSec: number;
  enableTamaraTabbyPitch?: boolean;
  humanHandoffNotice: string;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'bot' | 'agent';
  type: 'text' | 'voice';
  content: string;
  transcription?: string;
  audioUrl?: string;
  audioBase64?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export type TrialClassStatus =
  | 'طلب تجربة غير مكتمل (يحتاج استكمال بيانات)'
  | 'طلب تجربة مكتمل (بانتظار التأكيد)'
  | 'حصة تجريبية مؤكدة'
  | 'بانتظار مكالمة الإشراف'
  | 'تم تحديد موعد الحصة'
  | 'حضر الحصة التجريبية'
  | 'تم الاشتراك والدفع'
  | 'لم يرد / مؤجل';

export type LeadCategory = 'مناهج دراسية' | 'كورسات وتطوير' | 'عام';

export interface SupervisorDispatchSettings {
  curriculaSupervisorPhone: string;
  curriculaSupervisorName: string;
  coursesSupervisorPhone: string;
  coursesSupervisorName: string;
  autoDispatchWhatsApp: boolean;
  autoAddToExcel: boolean;
  notifyCustomerWithHandoff: boolean;
  lastDispatchedAt?: string | null;
  totalDispatchedCount?: number;
}

export interface ChatLead {
  id: string;
  phoneNumber: string;
  customerName: string;
  avatar: string;
  unreadCount: number;
  lastMessageTime: string;
  createdAt?: string;
  interestedCourse?: string;
  leadCategory?: LeadCategory;
  stage: 'استفسار جديد' | 'مهتم بالأسعار' | 'طلب رابط التسجيل' | 'تم الدفع والاشتراك';
  trialStatus: TrialClassStatus;
  trialDate?: string;
  studentGrade?: string;
  trialSubject?: string;
  trialDayTime?: string;
  trialDataComplete?: boolean;
  missingTrialFields?: string[];
  supervisorNotes?: string;
  assignedSupervisor?: string;
  isHighPriority?: boolean;
  leadSource?: string;
  dispatchedToSupervisor?: boolean;
  dispatchedToPhone?: string;
  dispatchedAt?: string;
  dispatchSummary?: string;
  messages: ChatMessage[];
}

export interface SheetIntegrationConfig {
  webhookUrl?: string;
  spreadsheetUrl?: string;
  spreadsheetId?: string;
  sheetTitle?: string;
  sheetName?: string;
  autoSyncEnabled: boolean;
  lastSyncAt: string | null;
  totalSyncedRows: number;
  lastSyncStatus?: 'idle' | 'success' | 'error';
  lastSyncMessage?: string;
  sheetColumns?: string[];
}


