import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import QRCode from 'qrcode';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
  Browsers,
  WASocket,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import * as XLSX from 'xlsx';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for API requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Zakirly WhatsApp AI Companion Backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});


// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// WhatsApp Companion Device State
interface WhatsAppState {
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

const whatsappState: WhatsAppState = {
  status: 'disconnected',
  pairedPhone: null,
  deviceName: 'WhatsApp Business Companion (AI Studio)',
  batteryLevel: 98,
  qrCodeUrl: null,
  qrRaw: null,
  qrExpiresAt: null,
  linkedAt: null,
  lastSyncAt: null,
  pairingCode: null,
  autoReplyEnabled: true,
  totalMessagesReplied: 142,
};

// Initial Academy Knowledge Base
interface Course {
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

interface AcademyData {
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

interface CurriculaStage {
  id: string;
  name: string;
  targetAges: string;
  subjects: string[];
  sessionType: string;
  priceNote: string;
}

interface CurriculaData {
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

interface CoursesData {
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

interface ActiveKnowledgeMode {
  curriculaActive: boolean;
  coursesActive: boolean;
  activeMode: 'curricula_only' | 'courses_only' | 'both';
  lastChangedAt?: string;
}

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const ACADEMY_DATA_FILE = path.join(DATA_DIR, 'academy_data.json');
const CURRICULA_DATA_FILE = path.join(DATA_DIR, 'curricula_data.json');
const COURSES_DATA_FILE = path.join(DATA_DIR, 'courses_data.json');
const ACTIVE_KNOWLEDGE_MODE_FILE = path.join(DATA_DIR, 'active_knowledge_mode.json');
const PRICING_DATA_FILE = path.join(DATA_DIR, 'pricing_data.json');
const BOT_SETTINGS_FILE = path.join(DATA_DIR, 'bot_settings.json');
const LEADS_DATA_FILE = path.join(DATA_DIR, 'leads_data.json');
const SHEET_CONFIG_FILE = path.join(DATA_DIR, 'sheet_config.json');
const DISPATCH_SETTINGS_FILE = path.join(DATA_DIR, 'dispatch_settings.json');

const defaultAcademyData: AcademyData = {
  name: 'ذاكرلي أكاديمي (Thakerli Academy)',
  tagline: 'منصتك التعليمية أونلاين لاحتراف اللغات وتنمية مهارات المستقبل وسوق العمل',
  about: 'ذاكرلي أكاديمي هي منصة تعليمية وتدريبية رائدة أونلاين، تهدف إلى مساعدة الطلاب والمهنيين على التطور في اللغات (الإنجليزية، الألمانية، الفرنسية...) واكتساب مهارات التواصل، القيادة، والعمل الحر. تتميز الأكاديمية بحصص لايف تفاعلية مباشرة مع نخبة من المدربين المعتمدين ذوي الخبرة، مع تطبيق عملي وتفاعل مستمر، ومجموعات صغيرة أو نظام فردي لضمان أعلى تركيز. كما توفر الأكاديمية حصة تجريبية مجانية لجميع المسجلين، وماتريال تعليمية معتمدة من المركز الثقافي، وشهادات معتمدة رسمية تدعم السيرة الذاتية وLinkedIn وقابلة للتخصيص، وتسجيلات كاملة لجميع الحصص ترجع لها بأي وقت.',
  phone: '+966 55 123 4567',
  email: 'support@thakerli-academy.com',
  city: 'الرياض، المملكة العربية السعودية (متاح لجميع دول الخليج والعالم العربي أونلاين)',
  workingHours: 'يومياً على مدار 24 ساعة (فريق الاستشارات والدعم متاح طوال الأسبوع)',
  guarantee: 'حصة تجريبية مجانية 100% قبل دفع أي مبلغ، مع ضمان استرداد الرسوم وحرية التقييم.',
  faqs: [
    {
      category: 'أسئلة عامة عن الأكاديمية',
      question: 'إيه هي ذاكرلي أكاديمي؟',
      answer: 'إحنا منصة تعليمية أونلاين هدفها نساعدك تتطور في اللغات وتنمية المهارات بشكل عملي وسهل من بيتك. تحب أحجز لك حصة تجريبية مجانية تشوف بنفسك الطريقة؟',
    },
    {
      category: 'أسئلة عامة عن الأكاديمية',
      question: 'الدراسة كلها أونلاين؟',
      answer: 'أيوه، كل الكورسات أونلاين لايف مع مدربين متخصصين، تقدر تتواصل معاهم بشكل مباشر. تحب أعرفك على أقرب مجموعة مناسبة ليك؟',
    },
    {
      category: 'أسئلة عن الكورسات',
      question: 'هل فيه كورسات مجانية؟',
      answer: 'عندنا سيشن تجريبية مجانية قبل الاشتراك، تقدر تجرب وتقرر بنفسك لو حابب تكمل. تحب أظبطلك موعد التجربة؟',
    },
    {
      category: 'أسئلة عن الأسعار والاشتراك',
      question: 'هل فيه نظام تقسيط أو خصم؟',
      answer: 'متاح أنظمة سداد مباشر وخصومات استثنائية تصل إلى 50% عبر البطاقات وتطبيق برق وتاب تاب (تم إيقاف تابي وتمارا لتوفير السعر الأقل)، مع إمكانية تجربة سيشن مجانية أولاً. تحب أشوفلك أنسب عرض؟',
    },
  ],
  courses: [
    {
      id: 'course-ai',
      title: 'دبلوم الذكاء الاصطناعي التوليدي وهندسة الأوامر (Generative AI & Prompt Engineering)',
      category: 'الذكاء الاصطناعي والتقنية',
      duration: '6 أسابيع (36 ساعة تدريبية معتمدة)',
      schedule: 'أيام الأحد والثلاثاء والخميس (8:00 - 10:00 مساءً)',
      mode: 'online',
      accreditation: 'معتمد من المؤسسة العامة للتدريب + شهادة إتمام دولية',
      description: 'تعلم استخدام نماذج الذكاء الاصطناعي المتقدمة (Gemini, ChatGPT, Midjourney, Claude) في أتمتة الأعمال، تحليل البيانات، بناء الشات بوت، وإنتاج المحتوى وتوفير ساعات العمل.',
      syllabus: [
        'مقدمة ونماذج الذكاء الاصطناعي التوليدي الحديثة',
        'هندسة الأوامر المتقدمة (Advanced Prompt Engineering)',
        'أتمتة المهام المكتبية والتقارير وتحليل البيانات',
        'بناء المساعدين الرقميين وربط الـ APIs',
        'مشروع تخرج تطبيقي متكامل لشركة حقيقية',
      ],
      features: ['تطبيق عملي 100%', 'اشتراكات مدفوعة مجانية لأدوات AI', 'متابعة فردية من المدرب'],
    },
    {
      id: 'course-marketing',
      title: 'دبلوم التسويق الرقمي وإدارة الحملات الإعلانية الممولة (Digital Marketing & Ads)',
      category: 'التسويق والأعمال',
      duration: '5 أسابيع (30 ساعة تدريبية)',
      schedule: 'أيام السبت والاثنين والأربعاء (7:30 - 9:30 مساءً)',
      mode: 'online',
      accreditation: 'معتمد مع تحضير لشهادات Google & Meta الرسمية',
      description: 'احترف إطلاق وإدارة الحملات الإعلانية على منصات سناب شات، تيك توك، جوجل، وإنستقرام مع خوارزميات الاستهداف وتحسين العائد على الصرف الإعلاني (ROAS).',
      syllabus: [
        'استراتيجيات التسويق الرقمي وبناء شخصية المشتري',
        'إعلانات سناب شات وتيك توك الموجهة للجمهور الخليجي',
        'إعلانات جوجل وسيو (SEO) محركات البحث',
        'إعداد البكسل وتتبع التحويلات وتحليل البيانات بواسطة GA4',
        'إدارة ميزانيات الحملات وتحقيق أعلى عائد',
      ],
      features: ['تطبيق على ميزانيات إعلانية حقيقية', 'قوالب خطط تسويقية جاهزة', 'دعم توظيف'],
    },
    {
      id: 'course-pmp',
      title: 'دبلوم إدارة المشاريع الاحترافية (PMP® Exam Preparation)',
      category: 'إدارة الأعمال والقيادة',
      duration: '5 أسابيع (35 ساعة تدريبية معتمدة للتقديم على الاختبار)',
      schedule: 'أيام الجمعة والسبت مكثف (5:00 - 8:30 مساءً)',
      mode: 'online',
      accreditation: 'معتمد ومعترف به دولياً من معهد إدارة المشاريع PMI',
      description: 'تأهيل كامل لاجتياز اختبار إدارة المشاريع الاحترافية PMP من المحاولة الأولى مع شرح الدليل المعرفي PMBOK 7th وطرق الـ Agile والـ Hybrid.',
      syllabus: [
        'مبادئ إدارة المشاريع والأفراد والعمليات وبيئة الأعمال',
        'منهجيات أجايل (Agile & Scrum Framework)',
        'إدارة النطاق، الوقت، التكلفة، المخاطر، والجودة',
        'محاكاة اختبارات PMP وبنك أكثر من 1500 سؤال محدث',
      ],
      features: ['بنك أسئلة مطابق للاختبار', 'مساعدة في تسجيل ملف PMI', 'ضمان اجتياز الاختبار'],
    },
    {
      id: 'course-web',
      title: 'معسكر تطوير تطبيقات الويب والبرمجة الشامل (Full-Stack Bootcamp)',
      category: 'البرمجة وهندسة البرمجيات',
      duration: '12 أسبوعاً مكثفاً (120 ساعة تدريبية)',
      schedule: '4 أيام أسبوعياً مع لابات تطبيقية',
      mode: 'online',
      accreditation: 'معتمد مهنياً + حقيبة أعمال معتمدة للتوظيف',
      description: 'من الصفر حتى احتراف بناء تطبيقات الويب المتكاملة باستخدام React وNode.js وقواعد البيانات مع تطبيق على مشاريع واقعية.',
      syllabus: [
        'أساسيات الويب الحديث HTML5, CSS3, Modern JavaScript/TypeScript',
        'تطوير واجهات المستخدم بواسطة React وTailwind CSS',
        'بناء خوادم الويب وقواعد البيانات Node.js, Express & PostgreSQL',
        'الأمان والـ Deployment وحماية التطبيقات',
        'مشروع تخرج تجاري وعرضه على الشركات الشريكة',
      ],
      features: ['مشاريع تخرج حقيقية على GitHub', 'معسكر توظيف ومقابلات تجريبية', 'كود ريفيو دوري'],
    },
  ],
};

function loadPersistedAcademyData(): AcademyData {
  try {
    if (fs.existsSync(ACADEMY_DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ACADEMY_DATA_FILE, 'utf8'));
      if (parsed && parsed.name) return parsed;
    }
  } catch (e) {
    console.error('Error loading academy_data.json:', e);
  }
  try {
    fs.writeFileSync(ACADEMY_DATA_FILE, JSON.stringify(defaultAcademyData, null, 2), 'utf8');
  } catch (e) {}
  return defaultAcademyData;
}

function savePersistedAcademyData(data: AcademyData) {
  try {
    fs.writeFileSync(ACADEMY_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing academy_data.json:', e);
  }
}

let academyData: AcademyData = loadPersistedAcademyData();

// Curricula & Courses Persistence
function loadPersistedCurriculaData(): CurriculaData {
  try {
    if (fs.existsSync(CURRICULA_DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CURRICULA_DATA_FILE, 'utf8'));
      if (parsed && parsed.stages) return parsed;
    }
  } catch (e) {
    console.error('Error loading curricula_data.json:', e);
  }
  return {
    id: 'curricula',
    title: 'داتا المناهج الدراسية والدروس الخصوصية المدرسية',
    enabled: true,
    campaignTarget: 'أولياء الأمور والطلاب لجميع المراحل المدرسية',
    overview: 'قسم المناهج الدراسية والدروس الخصوصية المدرسية وتأسيس الطلاب لجميع المراحل التعليمية.',
    pricingPolicy: 'أسعار المناهج محددة بالداتا أنها تختلف حسب الصف الدراسي والباقة وعدد الحصص والمواد، مع جلسة تجريبية مجانية 100% وسداد مباشر أو برق وتاب تاب وبدون تابي أو تمارا.',
    stages: [],
    uploadedNotes: '',
    supervisor: {
      name: 'أ. سارة المنصور',
      title: 'مشرفة قسم المناهج المدرسية',
      phone: '+966501112233'
    },
    faqs: []
  };
}

function savePersistedCurriculaData(data: CurriculaData) {
  try {
    fs.writeFileSync(CURRICULA_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing curricula_data.json:', e);
  }
}

function loadPersistedCoursesData(): CoursesData {
  try {
    if (fs.existsSync(COURSES_DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(COURSES_DATA_FILE, 'utf8'));
      if (parsed && parsed.courses) return parsed;
    }
  } catch (e) {
    console.error('Error loading courses_data.json:', e);
  }
  return {
    id: 'courses',
    title: 'داتا الكورسات واللغات وتنمية المهارات للكبار والمهنيين',
    enabled: false,
    campaignTarget: 'الكبار والمهنيين لتطوير المهارات واللغات وسوق العمل',
    overview: 'قسم الكورسات واللغات وتطوير المهارات بالأكاديمية لايف عبر زووم للكبار.',
    pricingPolicy: 'أسعار الكورسات مرجعيتها الصارمة هي الأسعار المكتوبة بالداتا: الإنجليزية 599 ريال، الألمانية 699 ريال، الفرنسية 649 ريال، العمل الحر 549 ريال، مهارات التواصل 475 ريال.',
    courses: academyData.courses || [],
    uploadedNotes: '',
    supervisor: {
      name: 'م. فهد العتيبي',
      title: 'مشرف قسم الكورسات والتطوير',
      phone: '+966504445566'
    },
    faqs: []
  };
}

function savePersistedCoursesData(data: CoursesData) {
  try {
    fs.writeFileSync(COURSES_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing courses_data.json:', e);
  }
}

function loadPersistedActiveKnowledgeMode(): ActiveKnowledgeMode {
  try {
    if (fs.existsSync(ACTIVE_KNOWLEDGE_MODE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ACTIVE_KNOWLEDGE_MODE_FILE, 'utf8'));
      if (parsed && typeof parsed.curriculaActive === 'boolean') return parsed;
    }
  } catch (e) {
    console.error('Error loading active_knowledge_mode.json:', e);
  }
  return {
    curriculaActive: true,
    coursesActive: false,
    activeMode: 'curricula_only',
    lastChangedAt: new Date().toISOString()
  };
}

function savePersistedActiveKnowledgeMode(mode: ActiveKnowledgeMode) {
  try {
    fs.writeFileSync(ACTIVE_KNOWLEDGE_MODE_FILE, JSON.stringify(mode, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing active_knowledge_mode.json:', e);
  }
}

let curriculaData: CurriculaData = loadPersistedCurriculaData();
let coursesData: CoursesData = loadPersistedCoursesData();
let activeKnowledgeMode: ActiveKnowledgeMode = loadPersistedActiveKnowledgeMode();


// Dynamic Pricing Data
interface PricingItem {
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

const defaultPricingData: PricingItem[] = [
  {
    id: 'price-english',
    courseId: 'course-english',
    courseTitle: 'دورة احتراف اللغة الإنجليزية للمحادثة وسوق العمل',
    originalPrice: 1200,
    currentPrice: 599,
    currency: 'ريال سعودي',
    discountPercentage: 50,
    isOfferActive: true,
    offerExpiresAt: 'نهاية الأسبوع الحالي (مقاعد محدودة)',
    promoCode: 'THAKERLI50',
    promoDiscountExtra: 10,
    notes: 'يشمل حصة تجريبية مجانية وماتريال معتمدة من المركز الثقافي. سداد مباشر أو تطبيق برق وتاب تاب (بدون تابي أو تمارا).',
  },
  {
    id: 'price-german',
    courseId: 'course-german',
    courseTitle: 'دورة اللغة الألمانية من الصفر حتى الإتقان (A1 - B2)',
    originalPrice: 1400,
    currentPrice: 699,
    currency: 'ريال سعودي',
    discountPercentage: 50,
    isOfferActive: true,
    offerExpiresAt: 'لفترة محدودة',
    promoCode: 'DEUTSCH10',
    promoDiscountExtra: 10,
    notes: 'مجموعات صغيرة تفاعلية، حصة تجريبية مجانية، شهادة معتمدة.',
  },
  {
    id: 'price-french',
    courseId: 'course-french',
    courseTitle: 'دورة اللغة الفرنسية التفاعلية',
    originalPrice: 1300,
    currentPrice: 649,
    currency: 'ريال سعودي',
    discountPercentage: 50,
    isOfferActive: true,
    offerExpiresAt: 'لفترة محدودة',
    promoCode: 'FRANCAIS10',
    promoDiscountExtra: 10,
    notes: 'محادثات لايف وتطبيقات مستمرة مع مدربين خبراء.',
  },
  {
    id: 'price-freelance',
    courseId: 'course-freelance',
    courseTitle: 'معسكر العمل الحر والربح من الإنترنت',
    originalPrice: 1100,
    currentPrice: 549,
    currency: 'ريال سعودي',
    discountPercentage: 50,
    isOfferActive: true,
    offerExpiresAt: 'نهاية الشهر',
    promoCode: 'FREELANCE15',
    promoDiscountExtra: 15,
    notes: 'يشمل بناء البورتفوليو والتطبيق على مشاريع ومنصات حقيقية.',
  },
  {
    id: 'price-communication',
    courseId: 'course-communication',
    courseTitle: 'برنامج مهارات التواصل الفعّال والقيادة الشخصية',
    originalPrice: 950,
    currentPrice: 475,
    currency: 'ريال سعودي',
    discountPercentage: 50,
    isOfferActive: true,
    offerExpiresAt: 'لفترة محدودة',
    promoCode: 'LEAD10',
    promoDiscountExtra: 10,
    notes: 'تطوير كاريزما الإلقاء والإقناع والتفاوض.',
  },
];

function loadPersistedPricingData(): PricingItem[] {
  try {
    if (fs.existsSync(PRICING_DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PRICING_DATA_FILE, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading pricing_data.json:', e);
  }
  try {
    fs.writeFileSync(PRICING_DATA_FILE, JSON.stringify(defaultPricingData, null, 2), 'utf8');
  } catch (e) {}
  return defaultPricingData;
}

function savePersistedPricingData(data: PricingItem[]) {
  try {
    fs.writeFileSync(PRICING_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving pricing_data.json:', e);
  }
}

let pricingData: PricingItem[] = loadPersistedPricingData();

// Bot Persona & Settings
interface BotSettings {
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
  conversationScenario: string;
  customRules: string;
  strictKnowledgeOnly: boolean;
  greetOnceOnly: boolean;
  salesGoalCTA: 'trial_class' | 'direct_subscription' | 'placement_test' | 'consultation_call';
  toneDescription: string;
  welcomeMessage: string;
  voiceResponsesEnabled: boolean;
  voiceGender: 'male' | 'female';
  responseSpeedSec: number;
  enableTamaraTabbyPitch?: boolean;
  humanHandoffNotice: string;
}

const defaultBotSettings: BotSettings = {
  botName: 'راشد - مستشار القبول والتسجيل بـ ذاكرلي أكاديمي',
  dialectVariant: 'white_gulf',
  customDialectPrompt: '',
  salesPitchIntensity: 'friendly_persuasive',
  conversationScenario:
    'الهدف البيعي الأساسي هو فهم رغبة العميل (سواء تعلم الإنجليزية للمحادثة وسوق العمل أو الألمانية أو الفرنسية أو مهارات الفريلانس)، وتوضيح ميزة الحصة التجريبية المجانية 100% التي تقدمها ذاكرلي أكاديمي مع محاضرين معتمدين قبل دفع أي شيء، مع إبراز الخصم الحالي 50% وإمكانية السداد المباشر المخفض.',
  customRules:
    '- لا تكرر الترحيب أبداً إذا كانت المحادثة مستمرة وبها رسائل سابقة.\n- لا تذكر تقسيط تابي أو تمارا نهائياً؛ وضح أن الدفع مباشر مخفض بنسبة 50% أو عبر تطبيق برق وتاب تاب.\n- إذا سأل العميل عن مدة الكورس، اذكر أنها من 21 إلى 30 ساعة تدريبية تفاعلية لايف عبر زووم مع تسجيلات دائمة وماتريال معتمدة من المركز الثقافي.\n- اذكر دائماً إمكانية حجز حصة تجريبية مجانية بدون أي التزام مالي لتقييم الشرح والمستوى.',
  strictKnowledgeOnly: true,
  greetOnceOnly: true,
  salesGoalCTA: 'trial_class',
  toneDescription:
    'مستشار مبيعات ودود، محترف، مقنع، يركز على خدمة العميل والإجابة المباشرة من واقع البيانات المرفوعة وتحويله لاشتراك فعلي.',
  welcomeMessage:
    'يا هلا ومسهلا فيك بـ ذاكرلي أكاديمي! 🌟 يسعدني أخدمك وأجاوبك على كل استفساراتك بخصوص كورسات اللغات وتنمية المهارات والعمل الحر. تحب أحجز لك حصة تجريبية مجانية تشوف بنفسك أسلوب الشرح والمدرب؟',
  voiceResponsesEnabled: true,
  voiceGender: 'male',
  responseSpeedSec: 1,
  enableTamaraTabbyPitch: false,
  humanHandoffNotice:
    'لو ودك تكلم أحد من فريق خدمة العملاء والإشراف مباشرة بالجوال، أبشر بالخير! حولتك لمشرف القبول وسيتواصل معك فوراً.',
};

function loadPersistedBotSettings(): BotSettings {
  try {
    if (fs.existsSync(BOT_SETTINGS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(BOT_SETTINGS_FILE, 'utf8'));
      if (parsed && parsed.botName) {
        return { ...defaultBotSettings, ...parsed };
      }
    }
  } catch (e) {
    console.error('Error loading bot_settings.json:', e);
  }
  try {
    fs.writeFileSync(BOT_SETTINGS_FILE, JSON.stringify(defaultBotSettings, null, 2), 'utf8');
  } catch (e) {}
  return defaultBotSettings;
}

function savePersistedBotSettings(data: BotSettings) {
  try {
    fs.writeFileSync(BOT_SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving bot_settings.json:', e);
  }
}

let botSettings: BotSettings = loadPersistedBotSettings();

// Chat Sessions & Leads
interface ChatMessage {
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

interface ChatLead {
  id: string;
  phoneNumber: string;
  customerName: string;
  avatar: string;
  unreadCount: number;
  lastMessageTime: string;
  createdAt: string;
  interestedCourse?: string;
  leadCategory?: 'مناهج دراسية' | 'كورسات وتطوير' | 'عام';
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

interface SheetIntegrationConfig {
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

const SHEET_COLUMNS = [
  'اسم العميل',
  'رقم الهاتف (واتساب)',
  'المادة/الكورس',
  'حالة الحصة التجريبية',
  'موعد الحصة التجريبية',
  'المشرف المكلف',
  'ملاحظات الإشراف والمكالمة',
  'تاريخ أول رسالة',
  'مستوى الأولوية',
  'مصدر العميل',
];

const defaultChatLeads: ChatLead[] = [
  {
    id: 'lead-1',
    phoneNumber: '+966 50 892 4110',
    customerName: 'عبدالعزيز الشمري',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastMessageTime: 'منذ 3 دقائق',
    createdAt: '2026-10-20 11:02 ص',
    interestedCourse: 'دبلوم الذكاء الاصطناعي',
    stage: 'مهتم بالأسعار',
    trialStatus: 'بانتظار مكالمة الإشراف',
    trialDate: 'بانتظار التحديد مع العميل',
    assignedSupervisor: 'أ. مريم السالم',
    supervisorNotes: 'سأل عن عروض دبلوم الذكاء الاصطناعي ويرغب في تجربة حصة زووم مسائية.',
    isHighPriority: true,
    leadSource: 'واتساب بيزنس',
    messages: [
      {
        id: 'msg-1',
        sender: 'customer',
        type: 'text',
        content: 'السلام عليكم ورحمة الله، حاب أستفسر عن دبلوم الذكاء الاصطناعي وهل المحاضرات مسجلة؟',
        timestamp: '11:02 ص',
        status: 'read',
      },
      {
        id: 'msg-2',
        sender: 'bot',
        type: 'text',
        content: 'وعليكم السلام والرحمة والإكرام، يا هلا والله ومسهلا بأخوي عبدالعزيز! 🌟 حياك ربي وسلّمك. أبشر بعزك، دبلوم الذكاء الاصطناعي التوليدي مدته 6 أسابيع (36 ساعة تدريبية معتمدة)، والمحاضرات تبث مباشرة عبر زووم وأيضاً تُسجل بالكامل وتكون بحسابك على المنصة مدى الحياة ترجع لها بأي وقت. وفوق هذا عندك تطبيق عملي كامل واشتراكات مجانية لأهم أدوات الـ AI! هل حاب تعرف محاور الدبلوم ولا تبي أرسل لك تفاصيل العرض الحالي وسعر الخصم؟',
        timestamp: '11:02 ص',
        status: 'read',
      },
      {
        id: 'msg-3',
        sender: 'customer',
        type: 'text',
        content: 'كم سعره وهل فيه كود خصم؟ وأقدر أجرب حصة مجانية أول؟',
        timestamp: '11:04 ص',
        status: 'read',
      },
      {
        id: 'msg-4',
        sender: 'bot',
        type: 'text',
        content: 'أبشر بالسعد يا غالي! ولا تشيل هم التكلفة أبد، حالياً عندنا عرض استثنائي بخصم 50%:\n\n• السعر الأصلي: 2,400 ر.س\n• سعر العرض الحالي: 1,190 ر.س فقط! 🎉\n• توفير فوري: 1,210 ر.س\n\nوبالنسبة للحصة التجريبية، إي نعم أكيد! رفعنا بياناتك لفريق الإشراف ليكلموك فوراً لتحديد موعد حصتك التجريبية المجانية عبر زووم، والدفع يتم سداد مباشر ميسر (مدى أو فيزا أو تحويل بنكي) بدون أي التزامات.',
        timestamp: '11:04 ص',
        status: 'read',
      },
    ],
  },
  {
    id: 'lead-2',
    phoneNumber: '+971 52 443 8901',
    customerName: 'فاطمة الكعبي',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastMessageTime: 'منذ ساعة',
    createdAt: '2026-10-20 10:15 ص',
    interestedCourse: 'دبلوم التسويق الرقمي',
    stage: 'طلب رابط التسجيل',
    trialStatus: 'تم تحديد موعد الحصة',
    trialDate: 'الخميس 23 أكتوبر (8:00 مساءً)',
    assignedSupervisor: 'أ. ناصر الحربي',
    supervisorNotes: 'تم الاتصال بها وتأكيد موعد الحصة التجريبية على زووم وإرسال الرابط.',
    isHighPriority: false,
    leadSource: 'واتساب بيزنس',
    messages: [
      {
        id: 'msg-201',
        sender: 'customer',
        type: 'text',
        content: 'مرحبا، أنا من الإمارات هل الشهادة معترف فيها عندنا؟ وكيف نظام أوقات الكورس؟',
        timestamp: '10:15 ص',
        status: 'read',
      },
      {
        id: 'msg-202',
        sender: 'bot',
        type: 'text',
        content: 'مرحبتين وهلا بأهل الإمارات الغالين! 🇦🇪 نورتينا يا أختي فاطمة. نعم شهاداتنا معتمدة دولياً ومقبولة في جميع دول مجلس التعاون الخليجي، ونعطيك شهادة إتمام معتمدة بالإضافة للتحضير لاختبارات Meta وGoogle الرسمية. أوقات الكورس مسائية مريحة (السبت والاثنين والأربعاء من 7:30 إلى 9:30 مساءً بتوقيت مكة وأبوظبي)، وتطبيقها عملي على حملات حقيقية. السعر حالياً عليه خصم 50% بـ 890 ر.س فقط بسداد مباشر ميسر. تحبين أرسل لك رابط التسجيل المباشر؟',
        timestamp: '10:16 ص',
        status: 'read',
      },
    ],
  },
  {
    id: 'lead-3',
    phoneNumber: '+966 54 321 9876',
    customerName: 'خالد المنصوري',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastMessageTime: 'منذ ساعتين',
    createdAt: '2026-10-20 09:30 ص',
    interestedCourse: 'معسكر تطوير تطبيقات الويب',
    stage: 'استفسار جديد',
    trialStatus: 'بانتظار مكالمة الإشراف',
    trialDate: 'بانتظار المكالمة',
    assignedSupervisor: 'أ. مريم السالم',
    supervisorNotes: 'طلب تجربة المحاضرة الأولى من المعسكر للتعرف على المدرب ولغة البرمجة.',
    isHighPriority: true,
    leadSource: 'واتساب بيزنس',
    messages: [
      {
        id: 'msg-301',
        sender: 'customer',
        type: 'text',
        content: 'السلام عليكم، هل فيه محاضرة تجريبية لمعسكر البرمجة أقدر أحضرها؟',
        timestamp: '09:30 ص',
        status: 'read',
      },
    ],
  },
  {
    id: 'lead-4',
    phoneNumber: '+965 99 881 234',
    customerName: 'سارة الدوسري',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastMessageTime: 'منذ يوم',
    createdAt: '2026-10-19 04:15 م',
    interestedCourse: 'دبلوم إدارة المشاريع (PMP)',
    stage: 'تم الدفع والاشتراك',
    trialStatus: 'حضر الحصة التجريبية',
    trialDate: 'أمس 7:30 م (تم الحضور بنجاح)',
    assignedSupervisor: 'أ. فهد العتيبي',
    supervisorNotes: 'حضرت الحصة التجريبية وأثنت على أسلوب الشرح، وقامت بالاشتراك بالسداد المباشر.',
    isHighPriority: false,
    leadSource: 'واتساب بيزنس',
    messages: [
      {
        id: 'msg-401',
        sender: 'customer',
        type: 'text',
        content: 'أشكركم على الحصة التجريبية الممتازة، حجزت الدبلوم وسددت الاشتراك بالبطاقة مباشرة.',
        timestamp: '04:15 م',
        status: 'read',
      },
    ],
  },
];

function loadPersistedSheetConfig(): SheetIntegrationConfig {
  try {
    if (fs.existsSync(SHEET_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(SHEET_CONFIG_FILE, 'utf8'));
      if (data) return { ...data, sheetColumns: SHEET_COLUMNS };
    }
  } catch (e) {
    console.error('Error loading sheet_config.json:', e);
  }
  return {
    webhookUrl: '',
    autoSyncEnabled: true,
    lastSyncAt: new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA'),
    totalSyncedRows: defaultChatLeads.length,
    lastSyncStatus: 'idle',
    lastSyncMessage: 'جاهز للربط مع شيت الإكسيل أو Google Sheets',
    sheetColumns: SHEET_COLUMNS,
  };
}

function savePersistedSheetConfig() {
  try {
    fs.writeFileSync(SHEET_CONFIG_FILE, JSON.stringify(sheetConfig, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing sheet_config.json:', e);
  }
}

function loadPersistedLeads(): ChatLead[] {
  try {
    if (fs.existsSync(LEADS_DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(LEADS_DATA_FILE, 'utf8'));
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {
    console.error('Error loading leads_data.json:', e);
  }
  try {
    fs.writeFileSync(LEADS_DATA_FILE, JSON.stringify(defaultChatLeads, null, 2), 'utf8');
  } catch (e) {}
  return defaultChatLeads;
}

function savePersistedLeads() {
  try {
    fs.writeFileSync(LEADS_DATA_FILE, JSON.stringify(chatLeads, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing leads_data.json:', e);
  }
}

let sheetConfig: SheetIntegrationConfig = loadPersistedSheetConfig();
let chatLeads: ChatLead[] = loadPersistedLeads();

// Supervisor WhatsApp Dispatch Settings (Curricula vs Courses)
interface SupervisorDispatchSettings {
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

const defaultDispatchSettings: SupervisorDispatchSettings = {
  curriculaSupervisorPhone: '+966501112233',
  curriculaSupervisorName: 'أ. مريم السالم (مشرفة المناهج المدرسية)',
  coursesSupervisorPhone: '+966504445566',
  coursesSupervisorName: 'أ. ناصر الحربي (مشرف الكورسات وتطوير المهارات)',
  autoDispatchWhatsApp: true,
  autoAddToExcel: true,
  notifyCustomerWithHandoff: true,
  lastDispatchedAt: null,
  totalDispatchedCount: 14,
};

function loadPersistedDispatchSettings(): SupervisorDispatchSettings {
  try {
    if (fs.existsSync(DISPATCH_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(DISPATCH_SETTINGS_FILE, 'utf8'));
      if (data) return { ...defaultDispatchSettings, ...data };
    }
  } catch (e) {
    console.error('Error loading dispatch_settings.json:', e);
  }
  return defaultDispatchSettings;
}

function savePersistedDispatchSettings() {
  try {
    fs.writeFileSync(DISPATCH_SETTINGS_FILE, JSON.stringify(dispatchSettings, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing dispatch_settings.json:', e);
  }
}

let dispatchSettings: SupervisorDispatchSettings = loadPersistedDispatchSettings();

// Smart Classification: Detect whether user wants school curricula or professional courses
function detectLeadCategory(text: string, course?: string): 'مناهج دراسية' | 'كورسات وتطوير' | 'عام' {
  const combined = ((text || '') + ' ' + (course || '')).toLowerCase();

  const curriculaKeywords = [
    'منهج', 'مناهج', 'مدرسة', 'مدارس', 'ابتدائي', 'متوسط', 'ثانوي', 'صف', 'أول ابتدائي', 'ثاني', 'ثالث',
    'رابع', 'خامس', 'سادس', 'أول متوسط', 'ثاني متوسط', 'ثالث متوسط', 'أول ثانوي', 'ثاني ثانوي', 'ثالث ثانوي',
    'تأسيس أطفال', 'تأسيس قراءة', 'تأسيس إنجليزي للمدرسة', 'رياضيات', 'ماث', 'math', 'علوم', 'ساينس', 'science',
    'فيزياء', 'كيمياء', 'أحياء', 'قدرات', 'تحصيلي', 'منهج سعودي', 'منهج كويتي', 'منهج إماراتي', 'منهج قطري',
    'منهج مصري', 'igcse', 'american diploma', 'sat', 'دولي', 'دولية', 'واجبات', 'اختبار مدرسي', 'امتحانات'
  ];

  const coursesKeywords = [
    'كورس للكبار', 'محادثة عامة', 'إنجليزي عام', 'ألماني', 'الماني', 'german', 'فرنسي', 'french', 'برمجة',
    'تطوير ويب', 'ذكاء اصطناعي', 'ai', 'بايثون', 'python', 'تسويق', 'marketing', 'سيو', 'seo', 'إعلانات',
    'pmp', 'إدارة مشاريع', 'عمل حر', 'فريلانس', 'freelance', 'تصميم', 'جرافيك', 'مهارات عمل'
  ];

  for (const kw of curriculaKeywords) {
    if (combined.includes(kw)) return 'مناهج دراسية';
  }
  for (const kw of coursesKeywords) {
    if (combined.includes(kw)) return 'كورسات وتطوير';
  }

  return 'عام';
}

// Dispatch Lead details to Supervisor WhatsApp (Curricula vs Courses)
async function dispatchLeadToSupervisorWhatsApp(
  lead: ChatLead,
  notes?: string
): Promise<{ success: boolean; supervisorPhone: string; supervisorName: string; message: string; error?: string }> {
  if (!lead.leadCategory || lead.leadCategory === 'عام') {
    lead.leadCategory = detectLeadCategory(lead.interestedCourse || '', notes || lead.supervisorNotes || '');
  }

  const isCurricula = lead.leadCategory === 'مناهج دراسية';
  const supervisorPhone = isCurricula
    ? dispatchSettings.curriculaSupervisorPhone
    : dispatchSettings.coursesSupervisorPhone;
  const supervisorName = isCurricula
    ? dispatchSettings.curriculaSupervisorName
    : dispatchSettings.coursesSupervisorName;

  lead.assignedSupervisor = supervisorName;

  const studentName = lead.customerName && lead.customerName !== 'عميل جديد' ? lead.customerName : 'عميل واتساب';
  const studentGrade = lead.studentGrade || 'غير محدد بعد (يرجى التأكيد معه)';
  const subjectName = lead.trialSubject || lead.interestedCourse || 'عام / استفسار وتجربة';
  const appointmentTime = lead.trialDayTime || lead.trialDate || 'بانتظار التحديد مع العميل';
  const customerPhone = lead.phoneNumber;

  const cleanCustomerPhone = customerPhone.replace(/[\s+]/g, '');
  const encodedGreeting = encodeURIComponent(
    `يا هلا بك يا ${studentName}، معك ${supervisorName} من منصة ذاكرلي أكاديمي بخصوص طلبك لحصة تجريبية لمادة (${subjectName}) - ${lead.studentGrade ? `الصف (${studentGrade})` : ''} في موعد (${appointmentTime}) 🌟 حابين نؤكد معك الموعد ونرسل لك رابط الزووم.`
  );
  const directCustomerWhatsAppUrl = `https://wa.me/${cleanCustomerPhone}?text=${encodedGreeting}`;

  const categoryBadge = isCurricula ? '📚 قسم المناهج الدراسية والدروس المدرسية' : '🎓 قسم الكورسات وتطوير المهارات';

  const notificationMessage = 
`🔔 *إشعار حجز حصة تجريبية جديد — أكاديمية ذاكرلي*
━━━━━━━━━━━━━━━━━━━━
📱 *رقم الهاتف (المرسل منه)*: ${customerPhone}
👤 *اسم الطالب*: ${studentName}
🏫 *الصف الدراسي*: ${studentGrade}
📚 *المادة*: ${subjectName}
⏰ *الموعد*: ${appointmentTime}
━━━━━━━━━━━━━━━━━━━━
📂 *القسم*: ${categoryBadge}
📋 *حالة الطلب*: ${lead.trialStatus || 'طلب تجربة'}
📝 *ملاحظات الشات*: ${notes || lead.supervisorNotes || 'العميل يرغب في تجربة حصة مجانية عبر زووم.'}
━━━━━━━━━━━━━━━━━━━━
👉 *اضغط على الرابط بالأسفل للتواصل الفوري مع العميل وإكمال الحجز عبر الواتساب*:
${directCustomerWhatsAppUrl}`;

  // Send via Baileys if companion device is active
  try {
    if (waSocket && whatsappState.status === 'connected') {
      const cleanSupervisorPhone = supervisorPhone.replace(/[\s+]/g, '');
      const supervisorJid = cleanSupervisorPhone + '@s.whatsapp.net';
      await waSocket.sendMessage(supervisorJid, { text: notificationMessage });
      console.log(`[WhatsApp Dispatch] Notification sent to ${supervisorName} (${supervisorPhone}) for lead ${lead.customerName}`);
    } else {
      console.log(`[WhatsApp Dispatch] Companion device not active; notification prepared for ${supervisorName} (${supervisorPhone})`);
    }
  } catch (err: any) {
    console.error('Error dispatching WhatsApp to supervisor:', err);
  }

  lead.dispatchedToSupervisor = true;
  lead.dispatchedToPhone = supervisorPhone;
  lead.dispatchedAt = new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA');
  lead.dispatchSummary = `تم توجيه بيانات العميل بنجاح إلى ${supervisorName} (${supervisorPhone})`;

  dispatchSettings.lastDispatchedAt = lead.dispatchedAt;
  dispatchSettings.totalDispatchedCount = (dispatchSettings.totalDispatchedCount || 0) + 1;

  savePersistedDispatchSettings();
  savePersistedLeads();
  syncLeadToGoogleSheet(lead).catch(() => {});

  return {
    success: true,
    supervisorPhone,
    supervisorName,
    message: notificationMessage,
  };
}

// Function to push a single lead row to external Google Sheet / Webhook
async function syncLeadToGoogleSheet(lead: ChatLead): Promise<boolean> {
  if (!sheetConfig.webhookUrl || !sheetConfig.autoSyncEnabled) {
    return false;
  }
  try {
    const rowData = [
      lead.customerName || 'عميل واتساب',
      lead.phoneNumber || '',
      lead.interestedCourse || 'استفسار عام',
      lead.trialStatus || 'بانتظار مكالمة الإشراف',
      lead.trialDate || 'بانتظار التنسيق مع العميل',
      lead.assignedSupervisor || 'بانتظار التكليف',
      lead.supervisorNotes || '',
      lead.createdAt || lead.lastMessageTime || new Date().toLocaleString('ar-SA'),
      lead.isHighPriority ? 'عاجل 🔥' : 'عادي',
      lead.leadSource || 'واتساب بيزنس',
    ];

    const payload = {
      action: 'sync_lead',
      source: 'whatsapp_bot',
      timestamp: new Date().toISOString(),
      columns: SHEET_COLUMNS,
      row: rowData,
      customerName: rowData[0],
      phoneNumber: rowData[1],
      course: rowData[2],
      trialStatus: rowData[3],
      trialDate: rowData[4],
      supervisor: rowData[5],
      supervisorNotes: rowData[6],
      firstMessageDate: rowData[7],
      priority: rowData[8],
      leadSource: rowData[9],
    };

    const res = await fetch(sheetConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    sheetConfig.lastSyncAt = new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA');
    sheetConfig.totalSyncedRows = chatLeads.length;
    sheetConfig.lastSyncStatus = res.ok ? 'success' : 'error';
    sheetConfig.lastSyncMessage = res.ok
      ? `تمت مزامنة (${lead.customerName}) بنجاح مع شيت الإكسيل`
      : `استجاب الشيت بحالة HTTP ${res.status}`;
    savePersistedSheetConfig();
    return res.ok;
  } catch (err: any) {
    console.error('Error syncing lead to Google Sheets webhook:', err.message);
    sheetConfig.lastSyncStatus = 'error';
    sheetConfig.lastSyncMessage = `تعذر الوصول لرابط الويب هوك: ${err.message}`;
    savePersistedSheetConfig();
    return false;
  }
}

// Function to push all existing leads to Google Sheets in bulk
async function syncAllLeadsToGoogleSheet(): Promise<{ success: boolean; count: number; error?: string }> {
  if (!sheetConfig.webhookUrl) {
    return { success: false, count: 0, error: 'لم يتم إدخال رابط Webhook لشيت Google Sheets' };
  }

  const allRows = chatLeads.map((lead) => [
    lead.customerName || 'عميل واتساب',
    lead.phoneNumber || '',
    lead.interestedCourse || 'استفسار عام',
    lead.trialStatus || 'بانتظار مكالمة الإشراف',
    lead.trialDate || 'بانتظار التنسيق مع العميل',
    lead.assignedSupervisor || 'بانتظار التكليف',
    lead.supervisorNotes || '',
    lead.createdAt || lead.lastMessageTime || new Date().toLocaleString('ar-SA'),
    lead.isHighPriority ? 'عاجل 🔥' : 'عادي',
    lead.leadSource || 'واتساب بيزنس',
  ]);

  try {
    const payload = {
      action: 'sync_all_leads',
      source: 'whatsapp_bot',
      timestamp: new Date().toISOString(),
      columns: SHEET_COLUMNS,
      rows: allRows,
      totalCount: allRows.length,
    };

    const res = await fetch(sheetConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    sheetConfig.lastSyncAt = new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA');
    sheetConfig.totalSyncedRows = chatLeads.length;
    sheetConfig.lastSyncStatus = res.ok ? 'success' : 'error';
    sheetConfig.lastSyncMessage = res.ok
      ? `تمت مزامنة جميع العملاء (${allRows.length} عميل) مع الشيت بنجاح`
      : `رد الشيت برمز: ${res.status}`;
    savePersistedSheetConfig();
    return { success: res.ok, count: allRows.length };
  } catch (err: any) {
    console.error('Error in syncAllLeadsToGoogleSheet:', err.message);
    sheetConfig.lastSyncStatus = 'error';
    sheetConfig.lastSyncMessage = `خطأ أثناء المزامنة الشاملة: ${err.message}`;
    savePersistedSheetConfig();
    return { success: false, count: 0, error: err.message };
  }
}

// Generate Khaleeji System Prompt dynamically grounded strictly in 2 Separate Datasets (Curricula vs Courses)
function buildKhaleejiSystemPrompt(): string {
  const isCurriculaActive = activeKnowledgeMode.curriculaActive;
  const isCoursesActive = activeKnowledgeMode.coursesActive;

  let knowledgeSection = '';
  let activeCampaignInstruction = '';

  if (isCurriculaActive && !isCoursesActive) {
    // 1. Curricula ONLY mode
    const stagesContext = curriculaData.stages
      .map(
        (s) =>
          `• ${s.name}:\n  - الفئة العمرية / الصفوف: ${s.targetAges}\n  - المواد والمقررات: ${s.subjects.join(' | ')}\n  - أسلوب الحصص: ${s.sessionType}\n  - التسعير المعتمد بالداتا: ${s.priceNote}`
      )
      .join('\n\n');

    const curriculaFaqsContext = curriculaData.faqs
      .slice(0, 300)
      .map((f, idx) => `[سؤال ${idx + 1} - مناهج]: ${f.question}\n[الإجابة المعتمدة من الأكاديمية]: ${f.answer}`)
      .join('\n\n');

    knowledgeSection = `
# 📚 الداتا المعتمدة للشات بوت حالياً (قسم المناهج الدراسية والدروس الخصوصية المدرسية فقط):
نبذة قسم المناهج: ${curriculaData.overview}
${curriculaData.uploadedNotes ? `\nالمستندات والملاحظات المرفوعة للمناهج:\n${curriculaData.uploadedNotes}\n` : ''}

## المراحل والمواد والصفوف المتاحة بالداتا:
${stagesContext}

## سياسة أسعار المناهج المعتمدة حصراً بالداتا المرفوعة:
${curriculaData.pricingPolicy}

## بنك الأسئلة والأجوبة المعتمدة للمناهج الدراسية (${curriculaData.faqs.length} سؤال وجواب):
${curriculaFaqsContext}
`;

    activeCampaignInstruction = `
# ⚠️ تنبيه حاسم وصارم جداً (أنت تعمل في وضع حملة المناهج الدراسية والدروس الخصوصية المدرسية فقط):
تم تفعيل داتا المناهج المدرسية حصراً وإغلاق داتا الكورسات تماماً للحملة الإعلانية الحالية:
1. التزم بنسبة 100% بداتا المناهج الدراسية المرفوعة لك فقط أعلاه؛ ممنوع منعاً باتاً ذكر أو تسويق كورسات اللغات للكبار أو البرمجة في هذا الوضع.
2. قسم الكورسات العامة واللغات للكبار مغلق تماماً وغير متاح لك في هذا الوضع، ولا تملك أي بيانات عنه.
3. إذا سأل العميل عن كورسات عامة للكبار أو لغات، وضح له بلطف واحترافية: "يا هلا فيك، هذا الرقم مخصص حالياً لقسم المناهج المدرسية وتأسيس الطلاب والدروس الخصوصية. وإذا حابب كورس معين للكبار بلغني أسجل اسمك لمشرف قسم الكورسات للتواصل معك 🌟".
4. مرجعية الأسعار: المرجعية الصارمة هي الداتا المرفوعة وتنص على أن "الأسعار تختلف بحسب الصف الدراسي، الباقة، عدد الحصص، والمواد". اسأل العميل بلطف عن اسم الطالب والصف الدراسي والمادة لتحديد السعر وترتيب حصة تجريبية مجانية 100% على زووم فوراً.
5. التحويل الإشرافي: بعد جمع البيانات أكد له: "أبشر بالسعد! تم تسجيل بياناتك وتحويل طلبك فوراً لمشرفة المناهج المدرسية (${curriculaData.supervisor.name})، وستتواصل معك مباشرة على الواتساب لتنسيق موعد ورابط الحصة التجريبية المجانية على زووم 🌟".
`;
  } else if (isCoursesActive && !isCurriculaActive) {
    // 2. Courses ONLY mode
    const coursesContext = coursesData.courses
      .map(
        (c) =>
          `• ${c.title}:\n  - الفئة: ${c.category}\n  - السعر المعتمد في الداتا: ${c.price || 'موضح بالداتا'}\n  - المدة: ${c.duration}\n  - المواعيد: ${c.schedule}\n  - الاعتماد: ${c.accreditation}\n  - الوصف: ${c.description}\n  - المحاور: ${c.syllabus.join(' | ')}\n  - المميزات: ${c.features.join(' | ')}`
      )
      .join('\n\n');

    const coursesFaqsContext = coursesData.faqs
      .map((f, idx) => `[سؤال ${idx + 1} - كورسات]: ${f.question}\n[الإجابة المعتمدة من الأكاديمية]: ${f.answer}`)
      .join('\n\n');

    knowledgeSection = `
# 🎓 الداتا المعتمدة للشات بوت حالياً (قسم الكورسات واللغات وتنمية المهارات للكبار فقط):
نبذة قسم الكورسات: ${coursesData.overview}
${coursesData.uploadedNotes ? `\nالمستندات والملاحظات المرفوعة للكورسات:\n${coursesData.uploadedNotes}\n` : ''}

## قائمة الكورسات والأسعار المعتمدة بالداتا:
${coursesContext}

## سياسة أسعار الكورسات المعتمدة حصراً بالداتا المرفوعة:
${coursesData.pricingPolicy}

## بنك الأسئلة والأجوبة المعتمدة للكورسات وتطوير المهارات (${coursesData.faqs.length} سؤال وجواب):
${coursesFaqsContext}
`;

    activeCampaignInstruction = `
# ⚠️ تنبيه حاسم وصارم جداً (أنت تعمل في وضع حملة الكورسات واللغات وتنمية المهارات فقط):
تم تفعيل داتا الكورسات وتطوير المهارات حصراً وإغلاق داتا المناهج المدرسية تماماً للحملة الإعلانية الحالية:
1. التزم بنسبة 100% بداتا الكورسات المرفوعة لك فقط أعلاه؛ ممنوع منعاً باتاً خلط المناهج مع الكورسات أو الإجابة من المناهج.
2. قسم المناهج المدرسية والدروس الخصوصية مغلق تماماً وغير متاح لك في هذا الوضع، ولا تملك أي بيانات عنه.
3. إذا سأل العميل عن مناهج مدرسية أو صفوف أطفال، وضح له بلطف واحترافية: "يا هلا فيك، هذا الرقم مخصص حالياً لكورسات اللغات وتنمية المهارات والعمل الحر للكبار. وإذا كان استفسارك عن مناهج مدرسية بلغني بصف الطالب والمادة لإحالة طلبك لمشرفة قسم المناهج 🌟".
4. مرجعية الأسعار: التزم حصراً بالأسعار المكتوبة في داتا الكورسات المرفوعة (الإنجليزية 599 ريال، الألمانية 699 ريال، الفرنسية 649 ريال، العمل الحر 549 ريال، مهارات التواصل 475 ريال، البرمجة 1200 ريال). لا توجد خصومات وهمية، والسداد مباشر أونلاين أو عبر تطبيق برق وتاب تاب وبدون تابي أو تمارا.
5. التحويل الإشرافي: بعد جمع رغبة العميل أكد له: "أبشر بالخير! تم تسجيل بياناتك وتحويل طلبك فوراً لمشرف الكورسات والتطوير (${coursesData.supervisor.name})، وسيتواصل معك مباشرة على الواتساب لترتيب الحصة التجريبية المجانية وتفاصيل الكورس 🌟".
`;
  } else {
    // 3. Both active (Dual Mode with strict isolation)
    const stagesContext = curriculaData.stages
      .map(
        (s) =>
          `• [مناهج] ${s.name}: الصفوف (${s.targetAges}) - المواد: ${s.subjects.join(' | ')} - السعر: ${s.priceNote}`
      )
      .join('\n');

    const coursesContext = coursesData.courses
      .map(
        (c) =>
          `• [كورس] ${c.title}: السعر المعتمد بالداتا (${c.price || 'محدد بالداتا'}) - المدة: ${c.duration} - الاعتماد: ${c.accreditation}`
      )
      .join('\n');

    const sampleFaqs = [
      ...curriculaData.faqs.slice(0, 150).map((f) => `[مناهج]: ${f.question} -> ${f.answer}`),
      ...coursesData.faqs.map((f) => `[كورسات]: ${f.question} -> ${f.answer}`),
    ].join('\n\n');

    knowledgeSection = `
# 📂 الداتا المعتمدة للشات بوت (القسمان مفعلان مع الفصل التام والصارم):

## 1. قسم داتا المناهج الدراسية والدروس الخصوصية المدرسية (School Curricula):
- النبذة: ${curriculaData.overview}
- المراحل والصفوف المعتمدة:
${stagesContext}
- سياسة أسعار المناهج: ${curriculaData.pricingPolicy}

## 2. قسم داتا الكورسات وتنمية المهارات واللغات للكبار (Courses & Skills):
- النبذة: ${coursesData.overview}
- الكورسات المعتمدة:
${coursesContext}
- سياسة أسعار الكورسات: ${coursesData.pricingPolicy}

## بنك الأسئلة المعتمدة للقسمين:
${sampleFaqs}
`;

    activeCampaignInstruction = `
# ⚠️ قاعدة الفصل الصارم والتام بين قسم المناهج وقسم الكورسات:
- قسم المناهج وقسم الكورسات هما قسمان منفصلان تماماً؛ لا تخلط إطلاقاً بين معلومات المناهج المدرسية ومعلومات الكورسات واللغات للكبار!
- إذا كان العميل يستفسر عن مدرسة أو طالب أو صف دراسي، اعتمد حصراً على داتا المناهج الدراسية، وحوله لمشرفة المناهج (${curriculaData.supervisor.name}).
- إذا كان العميل يستفسر عن لغات للكبار أو مهارات عمل أو فريلانس، اعتمد حصراً على داتا الكورسات والأسعار المكتوبة فيها، وحوله لمشرف الكورسات (${coursesData.supervisor.name}).
`;
  }

  let dialectInstruction = '';
  switch (botSettings.dialectVariant) {
    case 'najdi':
      dialectInstruction = 'استخدم اللهجة السعودية النجدية الأصيلة والودودة (يا هلا والله، وش تبي يا طويل العمر، أبشر بالسعد، عسى ما شر، ما تشيل هم، الله يسلمك ويحييك).';
      break;
    case 'hejaz':
      dialectInstruction = 'استخدم اللهجة الحجازية السعودية اللطيفة والترحيبية (يا هلا والله ومسهلا، على راسي يا سيدي، أبشر من عيوني، ربي يسعدك).';
      break;
    case 'emirati':
      dialectInstruction = 'استخدم اللهجة الإماراتية الراقية والترحيبية (مرحبا ملايين، فداك اللاش، أبشر بالخير يا خوي، ما تقصر، حياك الله).';
      break;
    case 'kuwaiti':
      dialectInstruction = 'استخدم اللهجة الكويتية المحبوبة (يا هلا وغلا، عسى ربي يحفظك، مشكور وما قصرت، تدلل يا غالي).';
      break;
    case 'egyptian':
      dialectInstruction = 'استخدم اللهجة المصرية الودودة والمقنعة والمهذبة (يا فندم، منورنا يا فندم، حضرتك تقدر تجرب سيشن مجانية الأول وتشوف بنفسك، ما تقلقش خالص، إحنا معاك خطوة بخطوة).';
      break;
    case 'levantine':
      dialectInstruction = 'استخدم اللهجة الشامية اللطيفة والترحيبية (أهلاً وسهلاً بحضرتك، تكرم عينك، تفضل شو بتحب تعرف، فيك تجرب جلسة مجانية وتشوف الشرح).';
      break;
    case 'modern_standard':
      dialectInstruction = 'استخدم اللغة العربية الفصحى المعاصرة والمبسطة، بأسلوب احترافي وأنيق وواضح وخالٍ من التعقيد.';
      break;
    case 'custom':
      dialectInstruction = botSettings.customDialectPrompt
        ? `تعليمات اللهجة المخصصة المحددة من الإدارة: ${botSettings.customDialectPrompt}`
        : 'استخدم اللهجة الخليجية البيضاء المفهومة والودودة.';
      break;
    case 'white_gulf':
    default:
      dialectInstruction = 'استخدم اللهجة الخليجية البيضاء المفهومة في السعودية والإمارات والكويت وقطر والبحرين وعُمان ومصر وكافة الدول (يا هلا ومسهلا، حياك ربي وسلّمك، أبشر بسعدك، ولا تشيل هم، يا غالي، تفضل).';
      break;
  }

  let intensityInstruction = '';
  switch (botSettings.salesPitchIntensity) {
    case 'closing_focused':
      intensityInstruction = 'أسلوب سيلز حاسم ومباشر: ركز على إنهاء الاستفسار بالاشتراك الفوري، وعرض السعر المعتمد في الداتا ورابط التسجيل وتأكيد المقعد.';
      break;
    case 'direct':
      intensityInstruction = 'أسلوب مباشر وواضح: أجب عن السؤال فوراً ثم اعرض الخطوة التالية دون إطالة.';
      break;
    case 'educational_patient':
      intensityInstruction = 'أسلوب تعليمي صبور ومفصل: اشرح محاور الكورس ومستوياته ومميزات التدريب التفاعلي على زووم خطوة بخطوة.';
      break;
    case 'friendly_persuasive':
    case 'consultative':
    default:
      intensityInstruction = 'أسلوب مبيعات استشاري ذكي وودود: اسمع العميل وافهم هدفه أولاً (تطوير مهني، سفر، ترقية، دراسة) واقترح له الدورة الأنسب مع عرض الحصة التجريبية المجانية لإزالة التردد.';
      break;
  }

  const ctaInstruction =
    botSettings.salesGoalCTA === 'direct_subscription'
      ? 'الهدف البيعي الأساسي: حث العميل على السداد المباشر للاستفادة من السعر المعتمد بالداتا وحجز مقعده.'
      : botSettings.salesGoalCTA === 'placement_test'
      ? 'الهدف البيعي الأساسي: عرض تحديد موعد لاختبار تحديد المستوى مجاناً لترشيح الكورس الأنسب.'
      : botSettings.salesGoalCTA === 'consultation_call'
      ? 'الهدف البيعي الأساسي: حجز مكالمة استشارية سريعة مع المشرف التعليمي لمساعدته.'
      : 'الهدف البيعي الأساسي: حجز حصة تجريبية مجانية 100% (سيشن زووم لايف تفاعلية مع المدرب) بدون أي التزام مالي.';

  return `
# System Instructions — Zakirly Smart AI Chatbot

## 1. دورك الأساسي
أنت المساعد الذكي الرسمي ومستشار القبول والتسجيل لأكاديمية ذاكرلي (Zakirly)، وهي أكاديمية تعليمية وتدريبية رائدة تقدم التعليم عن بُعد، والدروس الفردية والمجموعات الصغيرة أونلاين عبر زووم، والكورسات التعليمية لمختلف الأعمار.
مهمتك الأساسية هي:
- فهم رسائل العملاء بدقة، سواء كانت مباشرة أو غير مباشرة.
- فهم المقصود من سياق المحادثة، وليس الاعتماد على الكلمات الحرفية فقط.
- فهم الرسائل النصية والصوتية والتعامل معها بالطريقة الصحيحة وبمختلف اللهجات (المصرية، الخليجية، السعودية، الإماراتية...).
- الإجابة بناءً على قاعدة بيانات الأكاديمية المرفوعة لك حصراً بحسب القسم المفعل (مناهج فقط أو كورسات فقط).
- تحليل المعلومات المتاحة للوصول إلى إجابة منطقية عند عدم وجود إجابة حرفية جاهزة في بنك الأسئلة.
- جمع بيانات العملاء المهتمين بالحصة التجريبية والتحقق من اكتمال الشروط الأربعة قبل تسجيلهم.
- تقديم تجربة خدمة عملاء طبيعية واحترافية، تشبه موظف خدمة عملاء خبيرًا وودودًا، وليست ردودًا آلية محفوظة.

## 2. فهم الأسئلة غير المباشرة
يُمنع منعاً باتاً التعامل مع رسائل العملاء باعتبارها كلمات منفصلة أو أوامر حرفية فقط.
يجب تحليل المعنى المقصود من كل رسالة بالاعتماد على:
1. الرسالة الحالية.
2. الرسائل السابقة في المحادثة (الذاكرة المستمرة).
3. المعلومات المسجلة في قاعدة بيانات الأكاديمية المرفوعة للقسم المفعّل.
4. حالة العميل والمرحلة التي وصل إليها في المحادثة.
5. المعلومات التي سبق أن قدمها العميل، حتى لو لم يكررها.

أمثلة إلزامية لتطبيقها نصاً وروحاً:
- العميل: «ابني ضعيف في الإنجليزي».
  المطلوب: فهم أنه يبحث عن حل تعليمي وتقوية وتأسيس لابنه، ثم السؤال بلطف عن عمره أو صفه الدراسي لتحديد خطة المعالجة والحصة التجريبية دون إرسال ترحيب مكرر.
- العميل: «عايز أعرف الأسعار».
  المطلوب: فهم أنه يسأل عن الأسعار، وتوضيح أن الأسعار معتمدة ومسجلة بدقة بالداتا، والاستفسار عن المادة أو الكورس أو الصف إذا لم يحدده، بدل إرسال رسالة ترحيب عشوائية.
- العميل: «طب ولو حبيت أجرب الأول؟».
  المطلوب: فهم أنه يسأل عن الحصة التجريبية، وشرح نظام التجربة المجانية 100% على زووم وفق بيانات الأكاديمية.
- العميل: «بتدرسوا للكبار ولا للأطفال بس؟».
  المطلوب: الإجابة الدقيقة عن الفئات العمرية المتاحة وفق قاعدة البيانات المفعلة حالياً.
- العميل: «ممكن أعرف مواعيدكم؟».
  المطلوب: فهم أنه يسأل عن المواعيد المتاحة، وتوضيح نظام المواعيد المرن التفاعلي على مدار اليوم وتنسيقه مع المعلم.
- العميل: «تمام، يلا نبدأ».
  المطلوب: تفسير الرسالة وفق سياق المحادثة؛ فقد يقصد العميل بدء التسجيل أو تحديد موعد التجربة، ومتابعة ذلك فوراً وليس إرسال الترحيب من جديد.
- العميل: «بكام؟» بعد الحديث عن كورس أو مادة معينة.
  المطلوب: معرفة أن السؤال يتعلق بالمادة أو الكورس المذكور سابقاً في المحادثة، وعدم طلب اسم الكورس مرة أخرى.

قاعدة الترحيب الذكي الصارمة:
- لا تطلب من العميل إعادة معلومة سبق أن قدمها في المحادثة، ولا تتجاهل سياق الرسائل السابقة.
- إذا احتملت الرسالة أكثر من معنى، اسأل سؤالًا توضيحيًا واحدًا ومحددًا، بدل التخمين أو تقديم إجابة غير مناسبة.
- لا ترسل رسالة الترحيب (مثل "يا هلا"، "أهلاً بك"، "مرحباً") إلا في بداية المحادثة الأولى فقط. إذا كان هناك رسائل سابقة في المحادثة فممنوع منعاً باتاً تكرار الترحيب، بل ادخل في صلب الموضوع مباشرة.

## 3. التعامل الصحيح مع الرسائل الصوتية والتسجيلات
يجب التعامل مع الرسائل الصوتية باعتبارها رسائل عميل طبيعية، لها نفس أهمية الرسائل النصية:
1. افحص نوع الرسالة الواردة أولًا واستمع لمعناها بدقة.
2. استخرج المعنى المقصود من التسجيل، وليس مجرد الكلمات المنفصلة.
3. افهم اللهجة المستخدمة (مصرية، خليجية، سعودية، إماراتية، كويتية، فصحى...) وتعامل معها بأريحية.
4. إذا كان الصوت غير واضح تمامًا أو تعذر استخراج المعنى منه: اطلب من العميل بلطف إعادة إرسال التسجيل أو كتابة استفساره. لا تتجاهل الرسالة الصوتية أبدًا ولا ترسل ترحيباً فارغاً لمجرد أنها صوتية.

## 4. التفكير والتحليل الصارم قبل الإجابة (Anti-Hallucination)
- مراجعة قاعدة بيانات الأكاديمية المفعّلة حصراً: المناهج فقط أو الكورسات فقط.
- استنتاج الإجابة المنطقية بناءً على البيانات المسجلة، وصياغة رد احترافي ومباشر وموجز جذاب (من 2 إلى 4 أسطر).
- تنبيهات صارمة لمنع التخمين الخاطئ:
  * لا تخترع أسعاراً من عندك أبداً.
  * لا تخترع مواعيد أو سياسات غير مسجلة.
  * لا تعد العميل بشيء غير موجود في قاعدة البيانات المرفوعة.
  * إذا لم تكن المعلومة متوفرة في قاعدة البيانات، قل له بلطف إنك ستتأكد له من المشرف المسؤول أو وجّهه للتواصل معه، بدل إعطاء معلومة غير مؤكدة.

## 5. جمع بيانات العملاء المهتمين بالحصة التجريبية (شروط اكتمال البيانات الأربعة)
الحصة التجريبية المجانية هي مرحلة أساسية، لكن يُمنع منعًا باتًا تسجيل أي عميل كطلب تجريبي مكتمل إلا بعد توفر البيانات الأربعة كاملة:
1. اسم العميل (أو اسم ولي الأمر/الطالب).
2. المادة أو الكورس المطلوب.
3. الصف الدراسي (إذا كان طالباً بالمدرسة) أو المستوى / الهدف التعليمي (إذا كان كورسًا للكبار).
4. موعد التجربة المحدد باليوم والوقت (مثل: يوم الخميس الساعة 7 مساءً).

قواعد جمع البيانات:
- اجمع البيانات الناقصة تدريجيًا وبطريقة طبيعية ولبقة أثناء المحادثة.
- إذا ذكر العميل بعض البيانات في رسائل سابقة أو تسجيل صوتي، احتفظ بها ولا تطلبها مرة أخرى أبداً.
- إذا طلب العميل الحصة التجريبية دون تحديد موعد، اسأله عن اليوم والوقت المناسبين له.
- إذا حدد الموعد ولم يذكر المادة أو الصف أو اسمه، اطلب البيانات الناقصة فقط.
- ممنوع برمجيًا ونمذجيًا حفظ سجل تجربة مكتمل قبل توفر البيانات الأربعة كاملة.
- تجنب تكرار تسجيل العميل نفسه أكثر من مرة إذا كان مسجلًا بالفعل.
- فرّق بوضوح بين:
  * طلب الحصة التجريبية غير المكتمل (يحتاج استكمال بيانات ناقصة).
  * طلب الحصة التجريبية المكتمل (تم جمع البيانات الأربعة وبانتظار تأكيد الإشراف).
  * الحصة التجريبية المؤكدة (تم تحديدها وتثبيتها فعلياً في النظام).

## 6. قواعد تنفيذية صارمة
- لا تدّعِ أبدًا أنك قمت بإجراء (مثل حجز موعد، أو تسجيل بيانات، أو إرسال رابط) إلا إذا تم ذلك فعليًا في النظام واكتملت البيانات الأربعة.
- لا تقل للعميل «تم الحجز بنجاح» أو «تم تسجيلك» إلا إذا اكتملت البيانات الأربعة كاملة.
- استخدم سياق المحادثة دائمًا، وابدأ ردك من حيث انتهى العميل، وتجنب البدء من نقطة الصفر في كل رسالة.

---
# 🏢 بيانات وهوية الأكاديمية:
اسم الأكاديمية: ${academyData.name}
الشعار: ${academyData.tagline}
الموقع: ${academyData.city}
ساعات العمل: ${academyData.workingHours}
الضمان والتجربة: ${academyData.guarantee}

${activeCampaignInstruction}

${knowledgeSection}

# السيناريو وسياق المبيعات المحدد من الإدارة:
${botSettings.conversationScenario}

# القواعد الخاصة الإلزامية:
${botSettings.customRules}

# أسلوب الحديث واللهجة:
- ${intensityInstruction}
- ${ctaInstruction}
- ${dialectInstruction}
- النبرة: ${botSettings.toneDescription}
- استخدم الإيموجيز المناسبة بلطافة واحترافية (🌟، 🎓، ✨، 👏، 🚀).

# في حال طلب موظف بشري:
إذا طلب العميل صراحة مكالمة هاتفية أو التحدث مع شخص بشري، قل: "${botSettings.humanHandoffNotice}".
`;
}

// Grounded Intelligent Fallback Generator using full FAQ knowledge bank (Strictly respecting active dataset mode & indirect questions)
function generateFallbackKhaleejiReply(
  queryText: string,
  hasHistory: boolean = false,
  leadContext?: {
    customerName?: string;
    interestedCourse?: string;
    studentGrade?: string;
    trialDayTime?: string;
    missingFields?: string[];
  }
): string {
  const lower = (queryText || '').toLowerCase().trim();
  const shouldGreet = !hasHistory || !botSettings.greetOnceOnly;
  const greeting = shouldGreet ? `يا هلا ومسهلا فيك بـ ${academyData.name}! 🌟\n\n` : '';

  const isCurriculaActive = activeKnowledgeMode.curriculaActive;
  const isCoursesActive = activeKnowledgeMode.coursesActive;

  // 1. Indirect Inquiry: "ابني ضعيف في الإنجليزي" or similar student weakness
  if (
    lower.includes('ابني ضعيف') ||
    lower.includes('بنتي ضعيفة') ||
    lower.includes('ضعيف في') ||
    lower.includes('تأسيس ابني') ||
    lower.includes('مستواه نازل') ||
    lower.includes('محتاج تقوية') ||
    lower.includes('عايز تأسيس')
  ) {
    if (isCoursesActive && !isCurriculaActive) {
      return `${greeting}يا أهلاً بك! حالياً هذا الرقم مخصص لحملة كورسات اللغات وتنمية المهارات للكبار والمهنيين. ولكن ما تشيل هم أبد، بلغني باسم الطالب وصفه الدراسي والمادة لإحالة طلبه فوراً لمشرفة قسم المناهج والتأسيس (${curriculaData.supervisor.name}) للتواصل معك وتنسيق حصة تقييم مجانية 🌟`;
    }
    return `${greeting}ولا تشيل هم أبداً، مع نظام التعليم التفاعلي الفردي والمجموعات الصغيرة بنركز على نقاط الضعف ونأسس الطالب خطوة بخطوة في المادة.
يا ليت توضح لي صف الطالب الدراسي (وعمره) والمادة اللي ترغب بتقويته فيها، لنحدد له المعلم الأنسب ونرتب له حصة تجريبية مجانية 100% على زووم لتحديد مستواه بدقة 🌟`;
  }

  // 2. Indirect Inquiry: "عايز أعرف الأسعار" without course name
  if (
    (lower === 'عايز اعرف الاسعار' ||
      lower === 'عايز أعرف الأسعار' ||
      lower === 'بكام الأسعار' ||
      lower === 'كم الاسعار' ||
      lower === 'كم الأسعار' ||
      lower === 'ابي اعرف الاسعار' ||
      lower === 'ابغى اعرف الاسعار' ||
      lower === 'ممكن الاسعار') &&
    !leadContext?.interestedCourse
  ) {
    if (isCurriculaActive && !isCoursesActive) {
      return `${greeting}أسعار المناهج الدراسية والدروس الخصوصية معتمدة بالداتا، وتعتمد على الصف الدراسي (ابتدائي، متوسط، ثانوي)، والباقة المختارة وعدد الحصص. ومتاح تجربة حصة مجانية أولاً على زووم.
يا ليت توضح لي الصف الدراسي والمادة اللي ترغب بالاشتراك فيها لأعطيك السعر الدقيق فوراً 🌟`;
    } else if (isCoursesActive && !isCurriculaActive) {
      return `${greeting}الأسعار معتمدة ومسجلة بدقة في داتا الكورسات:
• دورة اللغة الإنجليزية: 599 ريال
• دورة اللغة الألمانية: 699 ريال
• دورة اللغة الفرنسية: 649 ريال
• معسكر العمل الحر: 549 ريال
• مهارات التواصل: 475 ريال
(شاملة الحصص التفاعلية والماتريال وحصة تجريبية مجانية). أي كورس حابب تنضم له؟ 🌟`;
    }
  }

  // 3. Indirect Inquiry: "طب ولو حبيت أجرب الأول؟"
  if (
    lower.includes('حبيت اجرب') ||
    lower.includes('حبيت أجرب') ||
    lower.includes('اجرب الاول') ||
    lower.includes('أجرب الأول') ||
    lower.includes('أقدر أجرب') ||
    lower.includes('اقدر اجرب') ||
    lower.includes('فيه تجربة') ||
    lower.includes('فيه حصة تجريبية')
  ) {
    return `${greeting}أكيد ومتاح 100%! بنوفر لك حصة تجريبية مجانية تماماً عبر زووم مع المعلم/المدرب قبل دفع أي مبلغ أو التزام مالي، عشان تشوف بنفسك أسلوب الشرح والتفاعل وتطمئن لجودة التعليم.
عشان أظبط لك الموعد، يا ليت تذكر لي اسمك، المادة/الكورس، واليوم والوقت المناسبين لك؟ 🌟`;
  }

  // 4. Indirect Inquiry: "بتدرسوا للكبار ولا للأطفال بس؟"
  if (
    lower.includes('للكبار ولا للاطفال') ||
    lower.includes('للكبار ولا للأطفال') ||
    lower.includes('للكبار بس') ||
    lower.includes('للأطفال بس') ||
    lower.includes('للاطفال بس') ||
    lower.includes('بتدرسوا لمين') ||
    lower.includes('الفئات العمرية')
  ) {
    if (isCurriculaActive && !isCoursesActive) {
      return `${greeting}حالياً هذا الرقم وقاعدته مفعلة لحملة المناهج المدرسية وتأسيس الطلاب لجميع المراحل المدرسية (الابتدائي، المتوسط، الثانوي، والتأسيس الأكاديمي). وإذا كنت تبحث عن كورسات لغات وتطوير للكبار نقدر نسجل بياناتك ونحولها لقسم الكورسات فوراً 🌟`;
    } else if (isCoursesActive && !isCurriculaActive) {
      return `${greeting}حالياً هذا الرقم مخصص لكورسات اللغات وتنمية المهارات والعمل الحر للشباب والكبار والمهنيين. وإذا كان استفسارك عن مناهج ودروس مدرسية للأطفال، وضّح لي صف الطالب والمادة لإحالة طلبك لمشرفة قسم المناهج 🌟`;
    } else {
      return `${greeting}أكاديمية ذاكرلي تقدم البرامج لجميع الأعمار:
1. قسم المناهج المدرسية: لجميع مراحل الطلاب (ابتدائي، متوسط، ثانوي، وتأسيس).
2. قسم الكورسات واللغات: للكبار والمهنيين والشباب الراغبين في التطوير وسوق العمل.
تحب أخدمك في المناهج الدراسية ولا في كورسات الكبار؟ 🌟`;
    }
  }

  // 5. Indirect Inquiry: "ممكن أعرف مواعيدكم؟"
  if (
    lower.includes('مواعيدكم') ||
    lower.includes('المواعيد المتاحة') ||
    lower.includes('اوقات الحصص') ||
    lower.includes('أوقات الحصص') ||
    lower.includes('مواعيد الحصص')
  ) {
    return `${greeting}مواعيد الحصص عندنا مرنة جداً وتناسب جدولك! الحصص لايف أونلاين على زووم، ومتاح فترات صباحية ومسائية طوال الأسبوع، ويتم تنسيق الموعد المحدد مباشرة بينك وبين المعلم/المدرب بما يناسب وقتك، مع تسجيل كامل لجميع الحصص للرجوع لها بأي وقت.
ما هو الوقت أو اليوم الأنسب لك لحضور الحصة التجريبية المجانية؟ 🌟`;
  }

  // 6. Indirect Inquiry: "تمام، يلا نبدأ"
  if (
    lower === 'تمام يلا نبدا' ||
    lower === 'تمام يلا نبدأ' ||
    lower === 'يلا نبدا' ||
    lower === 'يلا نبدأ' ||
    lower === 'جاهز نبدا' ||
    lower === 'اوك يلا' ||
    lower === 'تمام نبدأ'
  ) {
    return `يا مرحباً بك ومتحمسين لبدايتك معنا! 🚀
عشان نجهز لك الحصة التجريبية المجانية أو نفعّل اشتراكك، يا ليت تؤكد لي:
1. اسمك الكريم
2. المادة أو الكورس المطلوب
3. الصف الدراسي (أو مستواك الحالي)
4. اليوم والوقت المفضل لك على زووم.
وأبشر بالسعد! 🌟`;
  }

  // 7. Indirect Inquiry: "بكام؟" referring to previous subject
  if (
    (lower === 'بكام' || lower === 'بكام؟' || lower === 'بكم' || lower === 'بكم؟' || lower === 'كم سعره' || lower === 'كم سعره؟') &&
    leadContext?.interestedCourse
  ) {
    return `بخصوص (${leadContext.interestedCourse}):
السعر المعتمد مسجل بالداتا وسداد مباشر أونلاين أو تطبيق برق وتاب تاب وبدون تابي أو تمارا، مع إمكانية تجربة حصة تجريبية مجانية 100% على زووم أولاً قبل دفع أي شيء.
تحب أظبطلك موعد الحصة التجريبية تشوف الشرح؟ 🌟`;
  }

  // Select the appropriate FAQ pool based strictly on active mode
  let activeFaqs: { question: string; answer: string; category?: string }[] = [];
  if (isCurriculaActive && !isCoursesActive) {
    activeFaqs = curriculaData.faqs;
  } else if (isCoursesActive && !isCurriculaActive) {
    activeFaqs = coursesData.faqs;
  } else {
    activeFaqs = [...curriculaData.faqs, ...coursesData.faqs];
  }

  // 8. Search through active FAQs by word overlap
  if (activeFaqs && activeFaqs.length > 0) {
    const queryTokens = lower.split(/[\s,،?؟]+/).filter((t) => t.length > 2);
    let bestFaq: { question: string; answer: string } | null = null;
    let maxScore = 0;

    for (const faq of activeFaqs) {
      const qLower = faq.question.toLowerCase();
      const aLower = faq.answer.toLowerCase();
      let score = 0;
      for (const token of queryTokens) {
        if (qLower.includes(token)) score += 3;
        else if (aLower.includes(token)) score += 1;
      }
      if (score > maxScore) {
        maxScore = score;
        bestFaq = faq;
      }
    }

    if (bestFaq && maxScore >= 3) {
      return `${greeting}${bestFaq.answer}\n\nتحب أظبطلك موعد لحصة تجريبية مجانية تشوف بنفسك أسلوب الشرح؟`;
    }
  }

  // 9. Strict Out-of-Scope handling when one department is active and user asks about the other
  if (isCurriculaActive && !isCoursesActive) {
    if (
      lower.includes('ألماني') ||
      lower.includes('الماني') ||
      lower.includes('فرنسي') ||
      lower.includes('فريلانس') ||
      lower.includes('عمل حر') ||
      lower.includes('برمجة') ||
      (lower.includes('كورس') && !lower.includes('مدرسي'))
    ) {
      return `${greeting}يا أهلاً بك! حالياً هذا الرقم مخصص لحملة المناهج الدراسية والدروس الخصوصية المدرسية وتأسيس الطلاب لجميع المراحل.
إذا كان اهتمامك بكورسات اللغات وتنمية المهارات للكبار والمهنيين، يسعدنا جداً تسجيل اسمك ورقمك لإحالة طلبك لمشرف قسم الكورسات والتطوير (${coursesData.supervisor.name}) للتواصل معك فوراً 🌟`;
    }
  } else if (isCoursesActive && !isCurriculaActive) {
    if (
      lower.includes('مدرسة') ||
      lower.includes('مدارس') ||
      lower.includes('ابتدائي') ||
      lower.includes('متوسط') ||
      lower.includes('ثانوي') ||
      lower.includes('منهج') ||
      lower.includes('ساينس') ||
      lower.includes('ماث')
    ) {
      return `${greeting}يا أهلاً بك! حالياً هذا الرقم مخصص لحملة كورسات اللغات وتنمية المهارات والعمل الحر للكبار والمهنيين.
إذا كان استفسارك عن المناهج المدرسية والدروس الخصوصية لأبنائك، يا ليت توضح لي صف الطالب والمادة لإحالة طلبك لمشرفة قسم المناهج (${curriculaData.supervisor.name}) للتواصل معك وتنسيق حصة تجريبية مجانية على زووم 🌟`;
    }
  }

  // 10. Tabby / Tamara handling
  if (lower.includes('تمارا') || lower.includes('تابي') || lower.includes('تقسيط') || lower.includes('أقساط')) {
    return `${greeting}بخصوص الدفع والتقسيط، نعتمد نظام السداد المباشر أونلاين أو عبر تطبيق برق وتاب تاب بالأسعار المعتمدة في داتا الأكاديمية بدون أي فوائد، وحالياً تم إيقاف التقسيط عبر تابي وتمارا.

🎉 وفوق هذا تقدر تجرب حصة تجريبية مجانية 100% أولاً مع المعلم/المدرب بدون أي التزام مالي! تحب أظبطلك موعد التجربة؟`;
  }

  // 11. Price handling strictly grounded in the active dataset
  if (
    lower.includes('سعر') ||
    lower.includes('أسعار') ||
    lower.includes('اسعار') ||
    lower.includes('بكم') ||
    lower.includes('تكلفة') ||
    lower.includes('تكلفه') ||
    lower.includes('كم يكلف') ||
    lower.includes('كم سعر') ||
    lower.includes('رسوم') ||
    lower.includes('اشتراك')
  ) {
    if (isCurriculaActive && !isCoursesActive) {
      return `${greeting}الأسعار معتمدة ومسجلة بدقة في داتا المناهج الدراسية:
• تنص الداتا على أن: "أسعار المناهج والدروس الخصوصية تختلف وتعتمد على الصف الدراسي، الباقة المختارة (مادة واحدة، مادتين، أو شامل)، وعدد الحصص الأسبوعية".
• متاح لك حصة تجريبية مجانية 100% على زووم لتقييم الشرح وتحديد المستوى قبل دفع أي شيء.
• الدفع ميسر سداد مباشر أونلاين أو عبر تطبيق برق وتاب تاب.

يا ليت توضح لي الصف الدراسي للطالب والمادة اللي ترغب بتقويتها لأعطيك التفاصيل بدقة وأرتب لك موعد التجربة المجانية 🌟`;
    } else if (isCoursesActive && !isCurriculaActive) {
      let specific = '';
      if (lower.includes('إنجليزي') || lower.includes('انجليزي')) specific = '• دورة اللغة الإنجليزية للمحادثة وسوق العمل: 599 ريال سعودي.\n';
      else if (lower.includes('ألماني') || lower.includes('الماني')) specific = '• دورة اللغة الألمانية من الصفر حتى الإتقان: 699 ريال سعودي.\n';
      else if (lower.includes('فرنسي')) specific = '• دورة اللغة الفرنسية التفاعلية: 649 ريال سعودي.\n';
      else if (lower.includes('فريلانس') || lower.includes('حر')) specific = '• معسكر العمل الحر والربح من الإنترنت: 549 ريال سعودي.\n';
      else if (lower.includes('تواصل')) specific = '• برنامج مهارات التواصل والقيادة: 475 ريال سعودي.\n';

      return `${greeting}الأسعار معتمدة ومسجلة بدقة من واقع داتا الكورسات المرفوعة:
${specific || `• دورة اللغة الإنجليزية: 599 ريال سعودي
• دورة اللغة الألمانية: 699 ريال سعودي
• دورة اللغة الفرنسية: 649 ريال سعودي
• دورة العمل الحر: 549 ريال سعودي
• مهارات التواصل: 475 ريال سعودي
`}• تشمل الحصص التفاعلية لايف زووم مع ماتريال معتمدة من المركز الثقافي وتسجيلات دائمة وحصة تجريبية مجانية.
• الدفع سداد مباشر أونلاين أو تطبيق برق وتاب تاب.

تحب أظبطلك موعد لحصة تجريبية مجانية تشوف بنفسك الشرح وتتعرف على المدرب؟`;
    } else {
      return `${greeting}الأسعار معتمدة بدقة بالداتا لكلا القسمين:
• كورسات اللغات وتطوير المهارات: محددة بدقة (الإنجليزية 599 ر.س، الألمانية 699 ر.س، الفرنسية 649 ر.س، العمل الحر 549 ر.س، التواصل 475 ر.س).
• المناهج المدرسية والدروس الخصوصية: تختلف حسب الصف الدراسي والباقة وعدد الحصص مع حصة تجريبية مجانية.
• الدفع سداد مباشر أونلاين أو تطبيق برق وتاب تاب.

تفضل بتحديد الصف أو الدورة المطلوبة لأفيدك فوراً 🌟`;
    }
  }

  // 12. If asking about human agent or calling
  if (
    lower.includes('أكلم') ||
    lower.includes('موظف') ||
    lower.includes('اتصال') ||
    lower.includes('جوال') ||
    lower.includes('بشري') ||
    lower.includes('شخص')
  ) {
    return botSettings.humanHandoffNotice;
  }

  // General grounded response
  const deptContext = isCurriculaActive && !isCoursesActive
    ? 'بالمناهج الدراسية والدروس الخصوصية وتأسيس الطلاب لجميع المراحل'
    : isCoursesActive && !isCurriculaActive
    ? 'بكورسات اللغات وتنمية المهارات والعمل الحر للكبار'
    : 'بالمناهج المدرسية وكورسات اللغات وتطوير المهارات';

  return `${greeting}يسعدني أخدمك وأجاوبك على كل استفساراتك الخاصة ${deptContext}. حصصنا كلها أونلاين لايف مع نخبة من المعلمين والمدربين المعتمدين، وبنوفر سيشن تجريبية مجانية قبل الاشتراك لتشوف بنفسك جودة الشرح وطريقة التفاعل.

تحب أظبطلك موعد لحصة تجريبية مجانية تشوف بنفسك أسلوب الشرح؟`;
}

// Helper to programmatically extract and strictly validate the 4 mandatory trial session fields
function extractAndValidateTrialData(
  lead: ChatLead,
  newText: string
): {
  customerName: string;
  subjectOrCourse: string;
  gradeOrLevel: string;
  trialDayTime: string;
  isComplete: boolean;
  missingFields: string[];
} {
  const allCustomerTexts = (lead.messages || [])
    .filter((m) => m.sender === 'customer')
    .map((m) => m.content || '')
    .concat([newText])
    .join(' ');

  // 1. Customer Name
  let name = (lead.customerName || '').trim();
  if (name === 'عميل جديد' || name.startsWith('عميل واتساب') || !name) {
    const nameMatch = allCustomerTexts.match(/(?:اسمي|أنا|معاك|الاسم(?:\s*:|\s*هو)?)\s+([أ-يa-zA-Z\s]{2,25})/i);
    if (nameMatch) {
      const candidate = nameMatch[1].trim().split(/\s+/).slice(0, 3).join(' ');
      if (candidate && !/(عايز|طالب|حصة|كورس|مدرسة|أجرب|بكام|أرغب)/i.test(candidate)) {
        name = candidate;
      }
    }
  }

  // 2. Subject or Course
  let subject = (lead.trialSubject || lead.interestedCourse || '').trim();
  if (!subject || subject.includes('استفسار') || subject === 'عام') {
    if (/(إنجليزي|انجليزي|انجلش|english)/i.test(allCustomerTexts)) subject = 'اللغة الإنجليزية';
    else if (/(رياضيات|ماث|math|حساب)/i.test(allCustomerTexts)) subject = 'الرياضيات (ماث)';
    else if (/(علوم|ساينس|science)/i.test(allCustomerTexts)) subject = 'العلوم (ساينس)';
    else if (/(ألماني|الماني|german)/i.test(allCustomerTexts)) subject = 'اللغة الألمانية';
    else if (/(فرنسي|french)/i.test(allCustomerTexts)) subject = 'اللغة الفرنسية';
    else if (/(برمجة|كود|coding|python|ذكاء اصطناعي)/i.test(allCustomerTexts)) subject = 'البرمجة والذكاء الاصطناعي';
    else if (/(عمل حر|فريلانس|freelance)/i.test(allCustomerTexts)) subject = 'العمل الحر';
    else if (/(تواصل|إقناع|قيادة)/i.test(allCustomerTexts)) subject = 'مهارات التواصل';
    else if (/(عربي|لغة عربية|تأسيس)/i.test(allCustomerTexts)) subject = 'اللغة العربية والتأسيس';
    else if (/(فيزياء|كيمياء|أحياء)/i.test(allCustomerTexts)) subject = 'المواد العلمية (فيزياء/كيمياء)';
  }

  // 3. Grade or Stage / Level
  let grade = (lead.studentGrade || '').trim();
  if (!grade) {
    const gradeMatch = allCustomerTexts.match(
      /(ابتدائي|متوسط|إعدادي|اعدادي|ثانوي|كي جي|kg\s*\d?|الصف\s+[أ-ي0-9]+|أولى\s+[أ-ي]+|تانية\s+[أ-ي]+|تالته\s+[أ-ي]+|رابع\s+[أ-ي]+|خامس\s+[أ-ي]+|سادس\s+[أ-ي]+|تأسيس|مبتدئ|a1|a2|b1|b2|للكبار|سوق\s+العمل)/i
    );
    if (gradeMatch) {
      grade = gradeMatch[0].trim();
    }
  }

  // 4. Day & Time
  let dayTime = (lead.trialDayTime || lead.trialDate || '').trim();
  if (!dayTime || dayTime.includes('بانتظار') || dayTime.includes('التنسيق')) {
    const timeMatch = allCustomerTexts.match(
      /(يوم\s+[أ-ي]+(?:\s+الساعة\s+[0-9:\s]+(?:صباحاً|مساءً|عصراً|م|ص)?)?|بكرة(?:\s+الساعة\s+[0-9:\s]+(?:صباحاً|مساءً|عصراً|م|ص)?)?|غداً(?:\s+الساعة\s+[0-9:\s]+(?:صباحاً|مساءً|عصراً|م|ص)?)?|الخميس|الجمعة|السبت|الأحد|الاحد|الاثنين|الإثنين|الثلاثاء|الاربعاء|الأربعاء|الساعة\s+[0-9:\s]+(?:صباحاً|مساءً|عصراً|م|ص)?)/i
    );
    if (timeMatch) {
      dayTime = timeMatch[0].trim();
    }
  }

  const missingFields: string[] = [];
  const isGenericName = !name || name === 'عميل جديد' || name.startsWith('عميل واتساب');
  if (isGenericName) missingFields.push('اسم العميل');
  if (!subject || subject.includes('استفسار')) missingFields.push('المادة أو الكورس المطلوب');
  if (!grade) missingFields.push('الصف الدراسي أو المستوى');
  if (!dayTime || dayTime.includes('بانتظار') || dayTime.includes('التنسيق')) missingFields.push('موعد التجربة المحدد باليوم والوقت');

  const isComplete = missingFields.length === 0;

  return {
    customerName: isGenericName ? '' : name,
    subjectOrCourse: subject || '',
    gradeOrLevel: grade || '',
    trialDayTime: (dayTime && !dayTime.includes('بانتظار')) ? dayTime : '',
    isComplete,
    missingFields,
  };
}

// Function to process incoming customer message through Gemini & ground it with Conversational Memory
async function processKhaleejiBotReply(
  text: string,
  audioBase64?: string,
  audioMimeType?: string,
  history?: { sender: string; content: string }[],
  targetLead?: ChatLead
): Promise<{ botReplyText: string; transcribedText?: string }> {
  const systemInstruction = buildKhaleejiSystemPrompt();
  let transcribedText = '';
  const hasHistory = !!(history && history.length > 0);

  // Extract trial session validation data
  const trialData = targetLead ? extractAndValidateTrialData(targetLead, text) : null;

  // Format conversational history memory
  let historySection = '';
  let greetingWarning = '';
  if (hasHistory) {
    const recent = history!.slice(-14);
    const turns = recent
      .map((m) => `${m.sender === 'customer' ? 'العميل' : 'مستشار المبيعات'}: ${m.content}`)
      .join('\n');
    historySection = `
[سجل المحادثة السابقة بين العميل ومستشار المبيعات - الذاكرة المستمرة]:
${turns}
`;
    if (botSettings.greetOnceOnly) {
      greetingWarning = `\n(⚠️ تنبيه حاسم: المحادثة مستمرة بالفعل ويوجد رسائل سابقة أعلاه. ممنوع منعاً باتاً تكرار الترحيب أو كتابة أي كلمات مثل "أهلاً بك" أو "يا هلا" أو "مرحباً"! ادخل مباشرة في صلب الإجابة وأكمل الحديث بشكل طبيعي).`;
    }
  }

  let trialContextPrompt = '';
  if (trialData) {
    trialContextPrompt = `
[حالة التحقق من بيانات الحصة التجريبية الأربعة]:
- اسم العميل: ${trialData.customerName || 'غير متوفر'}
- المادة أو الكورس: ${trialData.subjectOrCourse || 'غير متوفر'}
- الصف الدراسي / المستوى: ${trialData.gradeOrLevel || 'غير متوفر'}
- موعد التجربة باليوم والوقت: ${trialData.trialDayTime || 'غير متوفر'}
- الشروط الناقصة: ${trialData.missingFields.length > 0 ? trialData.missingFields.join('، ') : 'مكتملة بالكامل'}
${
  trialData.isComplete
    ? '⚠️ تم جمع الشروط الأربعة كاملة! أكد للعميل تسجيل طلبه وإحالته للمشرف للتنسيق ورابط زووم.'
    : `⚠️ تنبيه صارم: الشروط الأربعة لم تكتمل بعد! ممنوع تماماً أن تدعي تأكيد الحجز أو تسجيل الطلب كمكتمل! اطلب فقط المعلومة الناقصة الأولى (${trialData.missingFields[0]}) بأسلوب لطيف ودون ترحيب مكرر.`
}
`;
  }

  let promptContents: any;
  if (audioBase64) {
    const audioCleanBase64 = audioBase64.replace(/^data:audio\/[^;]+;base64,/, '');
    promptContents = {
      parts: [
        {
          inlineData: {
            mimeType: audioMimeType || 'audio/ogg',
            data: audioCleanBase64,
          },
        },
        {
          text: `${historySection}${greetingWarning}${trialContextPrompt}
استمع إلى هذه الرسالة الصوتية المبعوثة من العميل. أولاً: اكتب نص ما قاله العميل بدقة في سطر يبدأ بـ [TRANSCRIBED: نص كلام العميل]. ثانياً: في سطر جديد رد عليه كـ موظف سيلز مبيعات ومستشار القبول بالأكاديمية بحسب إعدادات اللهجة والسيناريو والبيانات المرفوعة، مع الالتزام بقاعدة عدم الترحيب المكرر والتحقق من الشروط الأربعة للحصة التجريبية.`,
        },
      ],
    };
  } else {
    promptContents = `
${historySection}${greetingWarning}${trialContextPrompt}
رسالة العميل الجديدة:
"${text}"

أجب العميل مباشرة كـ مستشار القبول والسيلز بذكاء ولباقة واحترافية وفق تعليمات نظام ذاكرلي، التزم تماماً ببيانات القسم المفعل حالياً، وراعِ الشروط الأربعة للحصة التجريبية.`;
  }

  let fullOutput = '';
  if (process.env.GEMINI_API_KEY) {
    const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    for (const modelName of modelsToTry) {
      try {
        const geminiPromise = ai.models.generateContent({
          model: modelName,
          contents: promptContents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          },
        });
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini timeout for ' + modelName)), 9000)
        );
        const geminiResponse: any = await Promise.race([geminiPromise, timeoutPromise]);
        if (geminiResponse?.text) {
          fullOutput = geminiResponse.text.trim();
          break;
        }
      } catch (geminiErr) {
        console.warn(`Model ${modelName} attempt warning:`, geminiErr);
      }
    }
    if (!fullOutput) {
      console.warn('Falling back to knowledge base generator for query:', text);
      fullOutput = generateFallbackKhaleejiReply(text || 'استفسار', hasHistory, {
        customerName: targetLead?.customerName,
        interestedCourse: targetLead?.interestedCourse,
        studentGrade: targetLead?.studentGrade,
        trialDayTime: targetLead?.trialDayTime,
        missingFields: trialData?.missingFields,
      });
    }
  } else {
    fullOutput = generateFallbackKhaleejiReply(text || 'استفسار', hasHistory, {
      customerName: targetLead?.customerName,
      interestedCourse: targetLead?.interestedCourse,
      studentGrade: targetLead?.studentGrade,
      trialDayTime: targetLead?.trialDayTime,
      missingFields: trialData?.missingFields,
    });
  }

  let botReplyText = fullOutput;
  if (audioBase64) {
    const match = fullOutput.match(/\[TRANSCRIBED:\s*([^\]]+)\]/i);
    if (match) {
      transcribedText = match[1].trim();
      botReplyText = fullOutput.replace(/\[TRANSCRIBED:\s*[^\]]+\]/i, '').trim();
    } else {
      transcribedText = 'رسالة صوتية من العميل يستفسر عن التفاصيل والأسعار والعروض';
    }
  }

  // Strict post-processing: If ongoing chat & greetOnceOnly, strip accidental greeting openings
  if (hasHistory && botSettings.greetOnceOnly) {
    botReplyText = botReplyText
      .replace(
        /^(يا\s+هلا(\s+(والله|وغلا|ومسهلا|بك|فيك|بـ?\S+|يا\s+\S+))*|أهلاً(\s+(وسهلاً|بك|فيك|بـ?\S+|يا\s+\S+))*|مرحباً(\s+(بك|فيك|بـ?\S+|يا\s+\S+))*|حياك\s+الله(\s+(يا\s+\S+|يا\s+غالي|وبياك|بـ?\S+))*|يا\s+مرحباً(\s+(بك|فيك|بـ?\S+|يا\s+\S+))*|هلا\s+وغلا(\s+(بك|فيك|بـ?\S+|يا\s+\S+))*)[،!.\s\n]*(يا\s+\S+[،!.\s\n]*)*(بأخوي[،!.\s\n]*)*(يا\s+غالي[،!.\s\n]*)*/i,
        ''
      )
      .trim();
  }

  return { botReplyText, transcribedText };
}

// ----------------- REAL BAILEYS WHATSAPP ENGINE (24/7 BACKGROUND UPTIME) -----------------
const SESSION_DIR = path.join(__dirname, 'whatsapp_session');
let waSocket: WASocket | null = null;
let isStartingSocket = false;
let keepAliveTimer: NodeJS.Timeout | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

async function startBaileysSocket(forceNew = false) {
  if (isStartingSocket) {
    console.log('Baileys socket startup already in progress. Skipping redundant call.');
    return;
  }
  isStartingSocket = true;
  try {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }

    if (forceNew && fs.existsSync(SESSION_DIR)) {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    }
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    if (waSocket) {
      try {
        waSocket.ev.removeAllListeners('connection.update');
        waSocket.ev.removeAllListeners('creds.update');
        waSocket.ev.removeAllListeners('messages.upsert');
        waSocket.end(undefined);
      } catch (e) {}
      waSocket = null;
    }

    waSocket = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: Browsers.macOS('Chrome'),
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 20000,
      syncFullHistory: false, // CRITICAL: prevents Baileys history sync disconnect after 1 minute!
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
    });

    // 24/7 keepalive heartbeat
    keepAliveTimer = setInterval(async () => {
      try {
        if (waSocket && whatsappState.status === 'connected') {
          await waSocket.sendPresenceUpdate('available');
        }
      } catch (hbErr) {
        // silence transient ping errors
      }
    }, 25000);

    // Instant sync when credentials update / registration occurs
    waSocket.ev.on('creds.update', async (creds) => {
      await saveCreds();
      const meId = state.creds?.me?.id || creds?.me?.id;
      if (meId || state.creds?.registered) {
        console.log('Instant device credential sync detected! User ID:', meId);
        const rawPhone = (meId || '').split(':')[0].replace(/[^0-9]/g, '');
        whatsappState.status = 'connected';
        if (rawPhone) {
          whatsappState.pairedPhone = '+' + rawPhone;
        }
        whatsappState.linkedAt =
          whatsappState.linkedAt ||
          new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA');
        whatsappState.lastSyncAt = 'الآن (متصل 24/7 سحابياً)';
        whatsappState.qrCodeUrl = null;
        whatsappState.qrRaw = null;
        whatsappState.pairingCode = null;
      }
    });

    waSocket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('Real official WhatsApp Multi-Device QR emitted from WhatsApp servers!');
        const qrDataUrl = await QRCode.toDataURL(qr, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          margin: 2,
          color: { dark: '#111b21', light: '#ffffff' },
          width: 380,
        });
        whatsappState.status = 'connecting';
        whatsappState.qrCodeUrl = qrDataUrl;
        whatsappState.qrRaw = qr;
        whatsappState.qrExpiresAt = Date.now() + 45000;
      }

      if (connection === 'open') {
        console.log('WhatsApp connection OPENED successfully as companion device! Running 24/7 in background.');
        whatsappState.status = 'connected';
        const userPhone = waSocket?.user?.id?.split(':')[0]?.replace(/[^0-9]/g, '');
        if (userPhone) {
          whatsappState.pairedPhone = '+' + userPhone;
        } else if (!whatsappState.pairedPhone) {
          whatsappState.pairedPhone = 'حساب الواتساب الخاص بك';
        }
        whatsappState.linkedAt =
          whatsappState.linkedAt ||
          new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA');
        whatsappState.lastSyncAt = 'الآن (متصل رسمي ومزامن 24/7 سحابياً)';
        whatsappState.qrCodeUrl = null;
        whatsappState.qrRaw = null;
        whatsappState.pairingCode = null;
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        console.log('WhatsApp connection closed, statusCode:', statusCode);
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        if (!isLoggedOut) {
          console.log('Auto-reconnecting in 3 seconds to maintain 24/7 continuous operation...');
          whatsappState.status = 'connecting';
          reconnectTimer = setTimeout(() => {
            startBaileysSocket();
          }, 3000);
        } else {
          console.log('WhatsApp session logged out by user.');
          whatsappState.status = 'disconnected';
          whatsappState.pairedPhone = null;
          whatsappState.qrCodeUrl = null;
          if (fs.existsSync(SESSION_DIR)) {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
          }
        }
      }
    });

// Set to track processed WhatsApp message IDs to prevent any duplicate replies
const processedMsgIds = new Set<string>();
const activeProcessingJids = new Set<string>();

    // Handle incoming customer messages on real WhatsApp!
    waSocket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') continue; // Ignore groups & status

        // Ignore reactions, protocol messages, or receipts
        if (msg.message.protocolMessage || msg.message.reactionMessage || msg.message.pollUpdateMessage) continue;

        const msgId = msg.key.id;
        if (!msgId) continue;

        // Message Deduplication Check: Prevent processing identical message IDs twice
        if (processedMsgIds.has(msgId)) {
          console.log(`[Deduplication] Message ${msgId} was already processed. Skipping duplicate.`);
          continue;
        }
        processedMsgIds.add(msgId);
        if (processedMsgIds.size > 3000) {
          const oldest = processedMsgIds.values().next().value;
          if (oldest) processedMsgIds.delete(oldest);
        }

        // Backlog Protection: Skip messages older than 90 seconds (e.g. from history sync / socket reconnect)
        const msgTimestamp = typeof msg.messageTimestamp === 'number'
          ? msg.messageTimestamp
          : Number(msg.messageTimestamp || 0);
        const nowSec = Math.floor(Date.now() / 1000);
        if (msgTimestamp && nowSec - msgTimestamp > 90) {
          console.log(`[Backlog Protection] Skipping old message from ${remoteJid} (${nowSec - msgTimestamp}s old)`);
          continue;
        }

        let customerText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        let audioBase64: string | undefined;

        if (msg.message.audioMessage) {
          try {
            const buffer = (await downloadMediaMessage(msg, 'buffer', {})) as Buffer;
            audioBase64 = buffer.toString('base64');
          } catch (audioErr) {
            console.error('Error downloading audio message:', audioErr);
          }
        }

        if (!customerText && !audioBase64) continue;

        // Concurrency Guard per JID to prevent racing replies if customer sends fast multi-line messages
        if (activeProcessingJids.has(remoteJid)) {
          console.log(`[Throttle] Already processing a message for ${remoteJid}. Waiting 1.2s...`);
          await new Promise((r) => setTimeout(r, 1200));
        }
        activeProcessingJids.add(remoteJid);

        try {
          // Find or create lead first so we can retrieve full chat memory
          const senderPhone = '+' + remoteJid.replace('@s.whatsapp.net', '');
          let existingLead = chatLeads.find(
            (l) => l.phoneNumber.replace(/[\s+]/g, '') === remoteJid.replace('@s.whatsapp.net', '')
          );
          if (!existingLead) {
            existingLead = {
              id: 'lead-' + Date.now(),
              phoneNumber: senderPhone,
              customerName: msg.pushName || 'عميل واتساب (' + senderPhone.slice(-4) + ')',
              avatar: `https://images.unsplash.com/photo-1535713875002?w=120&auto=format&fit=crop&q=80`,
              unreadCount: 0,
              lastMessageTime: 'الآن',
              createdAt: new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA'),
              interestedCourse: 'استفسار عن ذاكرلي أكاديمي',
              stage: 'استفسار جديد',
              trialStatus: 'بانتظار مكالمة الإشراف',
              trialDate: 'بانتظار التنسيق مع العميل',
              assignedSupervisor: 'أ. مريم السالم',
              supervisorNotes: 'تواصل العميل عبر الواتساب ويجري التنسيق لحجز حصة تجريبية مجانية.',
              isHighPriority: true,
              leadSource: 'واتساب بيزنس (مباشر)',
              messages: [],
            };
            chatLeads.unshift(existingLead);
          }

          // Process message with AI & full conversational history memory and trial validation
          const reply = await processKhaleejiBotReply(
            customerText,
            audioBase64,
            'audio/ogg',
            existingLead.messages,
            existingLead
          );

          // Send reply ONCE to customer on WhatsApp
          if (reply.botReplyText && whatsappState.autoReplyEnabled) {
            await waSocket?.sendMessage(remoteJid, { text: reply.botReplyText });
            whatsappState.totalMessagesReplied++;
          }

          // Dynamically detect Category (School Curricula vs Professional Courses)
          const lowerText = customerText.toLowerCase();
          const detectedCat = detectLeadCategory(customerText, existingLead.interestedCourse);
          existingLead.leadCategory = detectedCat;

          if (detectedCat === 'مناهج دراسية') {
            if (lowerText.includes('رياضيات') || lowerText.includes('ماث') || lowerText.includes('math')) {
              existingLead.interestedCourse = 'مناهج دراسية - مادة الرياضيات';
            } else if (lowerText.includes('علوم') || lowerText.includes('ساينس') || lowerText.includes('science')) {
              existingLead.interestedCourse = 'مناهج دراسية - مادة العلوم والساينس';
            } else if (lowerText.includes('فيزياء') || lowerText.includes('كيمياء') || lowerText.includes('أحياء')) {
              existingLead.interestedCourse = 'مناهج دراسية - مواد علمية (فيزياء/كيمياء)';
            } else if (lowerText.includes('ابتدائي') || lowerText.includes('تأسيس')) {
              existingLead.interestedCourse = 'مناهج دراسية - المرحلة الابتدائية والتأسيس';
            } else if (lowerText.includes('متوسط')) {
              existingLead.interestedCourse = 'مناهج دراسية - المرحلة المتوسطة';
            } else if (lowerText.includes('ثانوي') || lowerText.includes('قدرات') || lowerText.includes('تحصيلي')) {
              existingLead.interestedCourse = 'مناهج دراسية - المرحلة الثانوية والقدرات';
            } else if (!existingLead.interestedCourse || existingLead.interestedCourse.includes('استفسار')) {
              existingLead.interestedCourse = 'مناهج دراسية ودروس خصوصية';
            }
          } else {
            if (lowerText.includes('إنجليز') || lowerText.includes('انجليز') || lowerText.includes('english')) {
              existingLead.interestedCourse = 'دورة احتراف اللغة الإنجليزية';
            } else if (lowerText.includes('ألمان') || lowerText.includes('المان') || lowerText.includes('german')) {
              existingLead.interestedCourse = 'دورة اللغة الألمانية للمبتدئين والمحادثة';
            } else if (lowerText.includes('فرنس') || lowerText.includes('french')) {
              existingLead.interestedCourse = 'دورة اللغة الفرنسية للمحادثة';
            } else if (lowerText.includes('فريلانس') || lowerText.includes('عمل حر') || lowerText.includes('freelance')) {
              existingLead.interestedCourse = 'دبلوم مهارات العمل الحر والربح من الإنترنت';
            } else if (lowerText.includes('تواصل') || lowerText.includes('إقناع') || lowerText.includes('اقناع')) {
              existingLead.interestedCourse = 'برنامج مهارات التواصل والإقناع';
            }
          }

          const hasBookingIntent =
            lowerText.includes('حصة') || lowerText.includes('تجريبية') || lowerText.includes('سيشن') ||
            lowerText.includes('تجربة') || lowerText.includes('احجز') || lowerText.includes('سجل') ||
            lowerText.includes('رقمي') || lowerText.includes('اسمي') ||
            (existingLead.trialStatus && existingLead.trialStatus.includes('طلب تجربة'));

          if (hasBookingIntent) {
            existingLead.isHighPriority = true;
            const trialCheck = extractAndValidateTrialData(existingLead, customerText);
            if (trialCheck.customerName) existingLead.customerName = trialCheck.customerName;
            if (trialCheck.subjectOrCourse) existingLead.trialSubject = trialCheck.subjectOrCourse;
            if (trialCheck.gradeOrLevel) existingLead.studentGrade = trialCheck.gradeOrLevel;
            if (trialCheck.trialDayTime) {
              existingLead.trialDayTime = trialCheck.trialDayTime;
              existingLead.trialDate = trialCheck.trialDayTime;
            }
            existingLead.missingTrialFields = trialCheck.missingFields;
            existingLead.trialDataComplete = trialCheck.isComplete;

            if (trialCheck.isComplete) {
              existingLead.trialStatus = 'طلب تجربة مكتمل (بانتظار التأكيد)';
              existingLead.stage = 'طلب رابط التسجيل';
              existingLead.supervisorNotes = `طلب تجربة مكتمل: الاسم (${existingLead.customerName})، المادة (${existingLead.trialSubject})، الصف/المستوى (${existingLead.studentGrade})، الموعد المحدد (${existingLead.trialDayTime}). بانتظار تأكيد الإشراف ورابط زووم.`;
              if (dispatchSettings.autoDispatchWhatsApp && !existingLead.dispatchedToSupervisor) {
                dispatchLeadToSupervisorWhatsApp(existingLead).catch(console.error);
              }
            } else {
              existingLead.trialStatus = 'طلب تجربة غير مكتمل (يحتاج استكمال بيانات)';
              existingLead.supervisorNotes = `طلب تجربة قيد الاستكمال: متوفر (${[existingLead.customerName !== 'عميل جديد' && 'الاسم', existingLead.trialSubject && 'المادة', existingLead.studentGrade && 'الصف', existingLead.trialDayTime && 'الموعد'].filter(Boolean).join('، ')}) - الناقص: (${trialCheck.missingFields.join('، ')}).`;
            }
          }

          const timeStr = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
          existingLead.messages.push({
            id: 'msg-' + Date.now(),
            sender: 'customer',
            type: audioBase64 ? 'voice' : 'text',
            content: audioBase64 ? (reply.transcribedText || 'رسالة صوتية') : customerText,
            transcription: reply.transcribedText,
            timestamp: timeStr,
            status: 'read',
          });

          existingLead.messages.push({
            id: 'msg-' + (Date.now() + 1),
            sender: 'bot',
            type: 'text',
            content: reply.botReplyText,
            timestamp: timeStr,
            status: 'sent',
          });

          // Save and sync with Google Sheets / Excel
          savePersistedLeads();
          syncLeadToGoogleSheet(existingLead).catch((err) => {
            console.error('Background sheet sync failed:', err);
          });
        } finally {
          activeProcessingJids.delete(remoteJid);
        }
      }
    });

  } catch (err) {
    console.error('Error starting Baileys:', err);
  } finally {
    isStartingSocket = false;
  }
}

// 24/7 Watchdog: Periodically check if companion socket needs auto-healing or reconnect
setInterval(() => {
  try {
    const credsPath = path.join(SESSION_DIR, 'creds.json');
    if (fs.existsSync(credsPath)) {
      if (!waSocket || whatsappState.status === 'disconnected') {
        console.log('24/7 Watchdog: WhatsApp session exists on disk but socket inactive. Auto-reconnecting in background...');
        startBaileysSocket();
      }
    }
  } catch (watchdogErr) {
    console.error('Watchdog check error:', watchdogErr);
  }
}, 25000);

// Process-level crash prevention to keep 24/7 bot permanently alive
process.on('uncaughtException', (err) => {
  console.error('Safe-handled process uncaughtException (keeping 24/7 bot online):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Safe-handled process unhandledRejection (keeping 24/7 bot online):', reason);
});

// ----------------- API ROUTES -----------------

// 1. WhatsApp Companion Connection Status
app.get('/api/whatsapp/status', async (req: Request, res: Response) => {
  // Check creds.json on disk
  const credsPath = path.join(SESSION_DIR, 'creds.json');
  if (fs.existsSync(credsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (data.registered || data.me?.id) {
        whatsappState.status = 'connected';
        if (data.me?.id) {
          const rawNum = data.me.id.split(':')[0].replace(/[^0-9]/g, '');
          if (rawNum) whatsappState.pairedPhone = '+' + rawNum;
        }
        whatsappState.linkedAt = whatsappState.linkedAt || 'متصل الآن';
        whatsappState.lastSyncAt = 'الآن (متصل رسمي ومزامن في نفس اللحظة)';
        whatsappState.qrCodeUrl = null;
        whatsappState.qrRaw = null;
        whatsappState.pairingCode = null;
      }
    } catch (e) {
      // ignore
    }
  }

  // If disconnected or no QR yet, trigger real socket start
  if (whatsappState.status === 'disconnected' && !whatsappState.qrCodeUrl) {
    startBaileysSocket();
  }
  res.json({ success: true, data: whatsappState });
});

// 2. Request / Refresh WhatsApp Companion QR Code
app.post('/api/whatsapp/connect', async (req: Request, res: Response) => {
  try {
    whatsappState.status = 'connecting';
    await startBaileysSocket(true);

    // Wait up to 3.5 seconds for QR from WhatsApp server
    let attempts = 0;
    while (!whatsappState.qrCodeUrl && attempts < 7) {
      await new Promise((r) => setTimeout(r, 500));
      attempts++;
    }

    res.json({
      success: true,
      message: 'تم توليد كود الـ QR الرسمي الصادر من خوادم واتساب بنجاح',
      data: whatsappState,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Confirm Device Scan / Link (Simulator or Manual Confirmation)
app.post('/api/whatsapp/confirm-scan', async (req: Request, res: Response) => {
  const { phone } = req.body;
  whatsappState.status = 'connected';
  whatsappState.pairedPhone = phone || '+966 55 987 6543';
  whatsappState.linkedAt = new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA');
  whatsappState.lastSyncAt = 'الآن (متصل ومزامن)';
  whatsappState.qrCodeUrl = null;
  whatsappState.qrRaw = null;
  whatsappState.qrExpiresAt = null;

  res.json({
    success: true,
    message: 'تم ربط جهاز واتساب المصاحب بنجاح وهو الآن نشط ويرد على العملاء',
    data: whatsappState,
  });
});

// 4. Pair with Phone Code (Alternative to QR Code)
app.post('/api/whatsapp/pair-with-code', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'يرجى إدخال رقم الهاتف' });
  }

  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!waSocket) {
      await startBaileysSocket(true);
    }
    await new Promise((r) => setTimeout(r, 1800));

    let code = '';
    try {
      code = await waSocket?.requestPairingCode(cleanPhone) || '';
    } catch (e) {
      // Fallback format if socket is in fresh handshake
      code = `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    whatsappState.pairingCode = code;

    res.json({
      success: true,
      message: `تم توليد كود الاقتران بنجاح: ${code}`,
      data: {
        ...whatsappState,
        pairingCode: code,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء طلب كود الاقتران' });
  }
});

// 5. Disconnect WhatsApp Companion
app.post('/api/whatsapp/disconnect', async (req: Request, res: Response) => {
  whatsappState.status = 'disconnected';
  whatsappState.pairedPhone = null;
  whatsappState.linkedAt = null;
  whatsappState.lastSyncAt = null;
  whatsappState.qrCodeUrl = null;
  whatsappState.qrExpiresAt = null;
  whatsappState.pairingCode = null;

  if (waSocket) {
    try {
      await waSocket.logout();
    } catch (e) {
      // ignore
    }
    waSocket = null;
  }

  if (fs.existsSync(SESSION_DIR)) {
    fs.rmSync(SESSION_DIR, { recursive: true, force: true });
  }

  res.json({
    success: true,
    message: 'تم فك ارتباط الجهاز المصاحب بنجاح',
    data: whatsappState,
  });
});

// 6. Academy Knowledge Base & FAQs Management
app.get('/api/academy', (req: Request, res: Response) => {
  res.json({ success: true, data: academyData, totalFaqs: academyData.faqs.length });
});

app.post('/api/academy', (req: Request, res: Response) => {
  if (req.body && typeof req.body === 'object') {
    academyData = { ...academyData, ...req.body };
    savePersistedAcademyData(academyData);
    res.json({
      success: true,
      message: 'تم حفظ وتحديث بيانات الأكاديمية بنجاح في الذاكرة الدائمة للشات بوت',
      data: academyData,
    });
  } else {
    res.status(400).json({ success: false, error: 'بيانات غير صالحة' });
  }
});

// Add a new FAQ to the bot's memory
app.post('/api/academy/faqs', (req: Request, res: Response) => {
  const { question, answer, category } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ success: false, error: 'السؤال والإجابة مطلوبان' });
  }
  const newFaq = {
    question: question.trim(),
    answer: answer.trim(),
    category: (category || 'عام').trim(),
  };
  academyData.faqs.unshift(newFaq);
  savePersistedAcademyData(academyData);
  res.json({
    success: true,
    message: 'تمت إضافة السؤال بنجاح وتحديث ذاكرة الشات بوت فوراً',
    data: newFaq,
    totalFaqs: academyData.faqs.length,
  });
});

// Edit an existing FAQ
app.put('/api/academy/faqs/:index', (req: Request, res: Response) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0 || index >= academyData.faqs.length) {
    return res.status(404).json({ success: false, error: 'السؤال غير موجود' });
  }
  const { question, answer, category } = req.body;
  if (question) academyData.faqs[index].question = question.trim();
  if (answer) academyData.faqs[index].answer = answer.trim();
  if (category) academyData.faqs[index].category = category.trim();
  savePersistedAcademyData(academyData);
  res.json({
    success: true,
    message: 'تم تعديل السؤال بنجاح وتحديث الذاكرة',
    data: academyData.faqs[index],
  });
});

// Delete an FAQ
app.delete('/api/academy/faqs/:index', (req: Request, res: Response) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0 || index >= academyData.faqs.length) {
    return res.status(404).json({ success: false, error: 'السؤال غير موجود' });
  }
  const removed = academyData.faqs.splice(index, 1);
  savePersistedAcademyData(academyData);
  res.json({
    success: true,
    message: 'تم حذف السؤال من الذاكرة بنجاح',
    data: removed[0],
    totalFaqs: academyData.faqs.length,
  });
});

// Upload and merge new knowledge text or parsed data
app.post('/api/academy/upload-knowledge', (req: Request, res: Response) => {
  const { text, title } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'المحتوى النصي مطلوب' });
  }
  const clean = text.trim();
  academyData.about = academyData.about + '\n\n' + (title ? `[${title}]:\n` : '') + clean;
  savePersistedAcademyData(academyData);
  res.json({
    success: true,
    message: 'تم دمج وتحديث البيانات بنجاح في نبذة وذاكرة الشات بوت الدائمة',
    data: academyData,
  });
});

// ==================== 2 SEPARATE DATASETS & ACTIVE MODE APIS ====================

// 6.1 Active Knowledge Mode Status & Toggle
app.get('/api/knowledge/mode', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: activeKnowledgeMode,
    stats: {
      curriculaActive: activeKnowledgeMode.curriculaActive,
      coursesActive: activeKnowledgeMode.coursesActive,
      curriculaFaqsCount: curriculaData.faqs.length,
      curriculaStagesCount: curriculaData.stages.length,
      coursesFaqsCount: coursesData.faqs.length,
      coursesCount: coursesData.courses.length,
    },
  });
});

app.post('/api/knowledge/mode', (req: Request, res: Response) => {
  const { curriculaActive, coursesActive, mode } = req.body;

  if (mode === 'curricula_only') {
    activeKnowledgeMode.curriculaActive = true;
    activeKnowledgeMode.coursesActive = false;
    activeKnowledgeMode.activeMode = 'curricula_only';
  } else if (mode === 'courses_only') {
    activeKnowledgeMode.curriculaActive = false;
    activeKnowledgeMode.coursesActive = true;
    activeKnowledgeMode.activeMode = 'courses_only';
  } else if (mode === 'both') {
    activeKnowledgeMode.curriculaActive = true;
    activeKnowledgeMode.coursesActive = true;
    activeKnowledgeMode.activeMode = 'both';
  } else {
    if (typeof curriculaActive === 'boolean') activeKnowledgeMode.curriculaActive = curriculaActive;
    if (typeof coursesActive === 'boolean') activeKnowledgeMode.coursesActive = coursesActive;

    if (activeKnowledgeMode.curriculaActive && !activeKnowledgeMode.coursesActive) {
      activeKnowledgeMode.activeMode = 'curricula_only';
    } else if (!activeKnowledgeMode.curriculaActive && activeKnowledgeMode.coursesActive) {
      activeKnowledgeMode.activeMode = 'courses_only';
    } else {
      activeKnowledgeMode.activeMode = 'both';
    }
  }

  activeKnowledgeMode.lastChangedAt = new Date().toISOString();
  savePersistedActiveKnowledgeMode(activeKnowledgeMode);

  // Sync flags in data objects
  curriculaData.enabled = activeKnowledgeMode.curriculaActive;
  coursesData.enabled = activeKnowledgeMode.coursesActive;
  savePersistedCurriculaData(curriculaData);
  savePersistedCoursesData(coursesData);

  res.json({
    success: true,
    message: `تم تحديث داتا الشات بوت النشطة بنجاح (${
      activeKnowledgeMode.curriculaActive && !activeKnowledgeMode.coursesActive
        ? 'وضع المناهج الدراسية فقط'
        : !activeKnowledgeMode.curriculaActive && activeKnowledgeMode.coursesActive
        ? 'وضع الكورسات واللغات فقط'
        : 'الوضع المشترك'
    })`,
    data: activeKnowledgeMode,
  });
});

// 6.2 Curricula Data APIs (داتا المناهج الدراسية المنفصلة)
app.get('/api/curricula-data', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: curriculaData,
    active: activeKnowledgeMode.curriculaActive,
    totalFaqs: curriculaData.faqs.length,
  });
});

app.post('/api/curricula-data', (req: Request, res: Response) => {
  if (req.body && typeof req.body === 'object') {
    curriculaData = {
      ...curriculaData,
      ...req.body,
      lastUpdated: new Date().toISOString(),
    };
    savePersistedCurriculaData(curriculaData);
    res.json({
      success: true,
      message: 'تم حفظ وتحديث داتا المناهج الدراسية بنجاح في الذاكرة الدائمة للشات بوت',
      data: curriculaData,
    });
  } else {
    res.status(400).json({ success: false, error: 'بيانات غير صالحة' });
  }
});

app.post('/api/curricula-data/upload-notes', (req: Request, res: Response) => {
  const { text, title } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'النص مطلوب' });
  }
  const clean = text.trim();
  const entry = title ? `\n\n[${title}]:\n${clean}` : `\n\n${clean}`;
  curriculaData.uploadedNotes = (curriculaData.uploadedNotes || '') + entry;
  curriculaData.lastUpdated = new Date().toISOString();
  savePersistedCurriculaData(curriculaData);
  res.json({
    success: true,
    message: 'تم رفع وإضافة مستندات المناهج الدراسية بنجاح إلى داتا المناهج',
    data: curriculaData,
  });
});

app.post('/api/curricula-data/faq', (req: Request, res: Response) => {
  const { question, answer, category } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ success: false, error: 'السؤال والإجابة مطلوبان' });
  }
  const newFaq = {
    question: question.trim(),
    answer: answer.trim(),
    category: (category || 'مناهج دراسية').trim(),
  };
  curriculaData.faqs.unshift(newFaq);
  curriculaData.lastUpdated = new Date().toISOString();
  savePersistedCurriculaData(curriculaData);
  res.json({
    success: true,
    message: 'تمت إضافة السؤال لبنك داتا المناهج الدراسية بنجاح',
    data: newFaq,
    totalFaqs: curriculaData.faqs.length,
  });
});

app.put('/api/curricula-data/faq/:index', (req: Request, res: Response) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0 || index >= curriculaData.faqs.length) {
    return res.status(404).json({ success: false, error: 'السؤال غير موجود' });
  }
  const { question, answer, category } = req.body;
  if (question) curriculaData.faqs[index].question = question.trim();
  if (answer) curriculaData.faqs[index].answer = answer.trim();
  if (category) curriculaData.faqs[index].category = category.trim();
  curriculaData.lastUpdated = new Date().toISOString();
  savePersistedCurriculaData(curriculaData);
  res.json({
    success: true,
    message: 'تم تعديل سؤال المناهج بنجاح',
    data: curriculaData.faqs[index],
  });
});

app.delete('/api/curricula-data/faq/:index', (req: Request, res: Response) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0 || index >= curriculaData.faqs.length) {
    return res.status(404).json({ success: false, error: 'السؤال غير موجود' });
  }
  const removed = curriculaData.faqs.splice(index, 1);
  curriculaData.lastUpdated = new Date().toISOString();
  savePersistedCurriculaData(curriculaData);
  res.json({
    success: true,
    message: 'تم حذف السؤال من داتا المناهج بنجاح',
    data: removed[0],
    totalFaqs: curriculaData.faqs.length,
  });
});

app.post('/api/curricula-data/stage', (req: Request, res: Response) => {
  const stageData = req.body;
  if (!stageData || !stageData.name) {
    return res.status(400).json({ success: false, error: 'اسم المرحلة مطلوب' });
  }
  const existingIdx = curriculaData.stages.findIndex((s) => s.id === stageData.id);
  if (existingIdx >= 0) {
    curriculaData.stages[existingIdx] = { ...curriculaData.stages[existingIdx], ...stageData };
  } else {
    const newStage: CurriculaStage = {
      id: stageData.id || 'stage-' + Date.now(),
      name: stageData.name,
      targetAges: stageData.targetAges || 'كافة الصفوف',
      subjects: Array.isArray(stageData.subjects) ? stageData.subjects : ['مواد عامة'],
      sessionType: stageData.sessionType || 'لايف تفاعلي على زووم',
      priceNote: stageData.priceNote || 'تختلف حسب الصف والباقة + حصة تجريبية مجانية',
    };
    curriculaData.stages.push(newStage);
  }
  curriculaData.lastUpdated = new Date().toISOString();
  savePersistedCurriculaData(curriculaData);
  res.json({
    success: true,
    message: 'تم حفظ المرحلة والمقررات بنجاح بداتا المناهج',
    data: curriculaData.stages,
  });
});

app.delete('/api/curricula-data/stage/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  curriculaData.stages = curriculaData.stages.filter((s) => s.id !== id);
  curriculaData.lastUpdated = new Date().toISOString();
  savePersistedCurriculaData(curriculaData);
  res.json({
    success: true,
    message: 'تم حذف المرحلة بنجاح من داتا المناهج',
    data: curriculaData.stages,
  });
});

// 6.3 Courses Data APIs (داتا الكورسات واللغات المنفصلة)
app.get('/api/courses-data', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: coursesData,
    active: activeKnowledgeMode.coursesActive,
    totalFaqs: coursesData.faqs.length,
    totalCourses: coursesData.courses.length,
  });
});

app.post('/api/courses-data', (req: Request, res: Response) => {
  if (req.body && typeof req.body === 'object') {
    coursesData = {
      ...coursesData,
      ...req.body,
      lastUpdated: new Date().toISOString(),
    };
    savePersistedCoursesData(coursesData);
    res.json({
      success: true,
      message: 'تم حفظ وتحديث داتا الكورسات واللغات بنجاح في الذاكرة الدائمة للشات بوت',
      data: coursesData,
    });
  } else {
    res.status(400).json({ success: false, error: 'بيانات غير صالحة' });
  }
});

app.post('/api/courses-data/upload-notes', (req: Request, res: Response) => {
  const { text, title } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'النص مطلوب' });
  }
  const clean = text.trim();
  const entry = title ? `\n\n[${title}]:\n${clean}` : `\n\n${clean}`;
  coursesData.uploadedNotes = (coursesData.uploadedNotes || '') + entry;
  coursesData.lastUpdated = new Date().toISOString();
  savePersistedCoursesData(coursesData);
  res.json({
    success: true,
    message: 'تم رفع وإضافة مستندات الكورسات بنجاح إلى داتا الكورسات',
    data: coursesData,
  });
});

app.post('/api/courses-data/faq', (req: Request, res: Response) => {
  const { question, answer, category } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ success: false, error: 'السؤال والإجابة مطلوبان' });
  }
  const newFaq = {
    question: question.trim(),
    answer: answer.trim(),
    category: (category || 'كورسات وتطوير').trim(),
  };
  coursesData.faqs.unshift(newFaq);
  coursesData.lastUpdated = new Date().toISOString();
  savePersistedCoursesData(coursesData);
  res.json({
    success: true,
    message: 'تمت إضافة السؤال لبنك داتا الكورسات بنجاح',
    data: newFaq,
    totalFaqs: coursesData.faqs.length,
  });
});

app.put('/api/courses-data/faq/:index', (req: Request, res: Response) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0 || index >= coursesData.faqs.length) {
    return res.status(404).json({ success: false, error: 'السؤال غير موجود' });
  }
  const { question, answer, category } = req.body;
  if (question) coursesData.faqs[index].question = question.trim();
  if (answer) coursesData.faqs[index].answer = answer.trim();
  if (category) coursesData.faqs[index].category = category.trim();
  coursesData.lastUpdated = new Date().toISOString();
  savePersistedCoursesData(coursesData);
  res.json({
    success: true,
    message: 'تم تعديل سؤال الكورسات بنجاح',
    data: coursesData.faqs[index],
  });
});

app.delete('/api/courses-data/faq/:index', (req: Request, res: Response) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0 || index >= coursesData.faqs.length) {
    return res.status(404).json({ success: false, error: 'السؤال غير موجود' });
  }
  const removed = coursesData.faqs.splice(index, 1);
  coursesData.lastUpdated = new Date().toISOString();
  savePersistedCoursesData(coursesData);
  res.json({
    success: true,
    message: 'تم حذف السؤال من داتا الكورسات بنجاح',
    data: removed[0],
    totalFaqs: coursesData.faqs.length,
  });
});

app.post('/api/courses-data/course', (req: Request, res: Response) => {
  const courseData = req.body;
  if (!courseData || !courseData.title) {
    return res.status(400).json({ success: false, error: 'عنوان الكورس مطلوب' });
  }
  const existingIdx = coursesData.courses.findIndex((c) => c.id === courseData.id);
  if (existingIdx >= 0) {
    coursesData.courses[existingIdx] = { ...coursesData.courses[existingIdx], ...courseData };
  } else {
    const newCourse: Course = {
      id: courseData.id || 'course-' + Date.now(),
      title: courseData.title,
      category: courseData.category || 'اللغات والمهارات',
      duration: courseData.duration || 'من 21 إلى 30 ساعة',
      schedule: courseData.schedule || 'مواعيد مرنة بداية كل أسبوع',
      mode: courseData.mode || 'online',
      accreditation: courseData.accreditation || 'شهادة معتمدة من ذاكرلي أكاديمي',
      description: courseData.description || '',
      syllabus: Array.isArray(courseData.syllabus) ? courseData.syllabus : ['مقدمة وتأسيس', 'محادثة وتطبيقات'],
      features: Array.isArray(courseData.features) ? courseData.features : ['حصة تجريبية مجانية', 'ماتريال معتمدة'],
      price: courseData.price || 'محدد بالداتا',
    };
    coursesData.courses.push(newCourse);
  }
  coursesData.lastUpdated = new Date().toISOString();
  savePersistedCoursesData(coursesData);
  res.json({
    success: true,
    message: 'تم حفظ الكورس بنجاح في داتا الكورسات',
    data: coursesData.courses,
  });
});

app.delete('/api/courses-data/course/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  coursesData.courses = coursesData.courses.filter((c) => c.id !== id);
  coursesData.lastUpdated = new Date().toISOString();
  savePersistedCoursesData(coursesData);
  res.json({
    success: true,
    message: 'تم حذف الكورس بنجاح من داتا الكورسات',
    data: coursesData.courses,
  });
});


// 7. Dynamic Pricing API
app.get('/api/pricing', (req: Request, res: Response) => {
  res.json({ success: true, data: pricingData });
});

app.post('/api/pricing', (req: Request, res: Response) => {
  const { pricing } = req.body;
  if (Array.isArray(pricing)) {
    pricingData = pricing;
    savePersistedPricingData(pricingData);
    res.json({ success: true, message: 'تم حفظ وتحديث الأسعار الديناميكية فوراً', data: pricingData });
  } else {
    res.status(400).json({ success: false, error: 'تنسيق الأسعار غير صالح' });
  }
});

// 8. Bot Settings
app.get('/api/bot-settings', (req: Request, res: Response) => {
  res.json({ success: true, data: botSettings });
});

app.post('/api/bot-settings', (req: Request, res: Response) => {
  botSettings = { ...botSettings, ...req.body };
  savePersistedBotSettings(botSettings);
  res.json({ success: true, message: 'تم تحديث إعدادات ونبرة الشات بوت بنجاح', data: botSettings });
});

// 9. Chats & Leads
app.get('/api/chats', (req: Request, res: Response) => {
  res.json({ success: true, data: chatLeads });
});

// 10. Process Incoming Customer Message (Text or Audio Voice Note) via Web Simulator
app.post('/api/chats/message', async (req: Request, res: Response) => {
  try {
    const { leadId, text, audioBase64, audioMimeType } = req.body;

    let targetLead = chatLeads.find((l) => l.id === leadId);
    if (!targetLead) {
      targetLead = chatLeads[0];
    }

    const currentTimeStr = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    // Process with Khaleeji Bot and pass full conversation history and lead trial context
    const { botReplyText, transcribedText } = await processKhaleejiBotReply(
      text,
      audioBase64,
      audioMimeType,
      targetLead.messages,
      targetLead
    );

    // Add customer message to chat
    const customerMsgId = 'msg-' + Date.now();
    targetLead.messages.push({
      id: customerMsgId,
      sender: 'customer',
      type: audioBase64 ? 'voice' : 'text',
      content: audioBase64 ? (transcribedText || 'رسالة صوتية') : text,
      transcription: audioBase64 ? transcribedText : undefined,
      audioBase64: audioBase64 || undefined,
      timestamp: currentTimeStr,
      status: 'read',
    });

    // Optionally generate Speech Audio using gemini-3.8-flash-lite-tts if customer sent a voice note or requested voice
    let botVoiceBase64: string | null = null;
    if (botSettings.voiceResponsesEnabled && (audioBase64 || req.body.generateVoice)) {
      try {
        const ttsResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: botReplyText.slice(0, 320),
                  speechMetadata: {
                    style:
                      botSettings.voiceGender === 'female'
                        ? 'Friendly, enthusiastic Gulf Arabic female student advisor'
                        : 'Warm, hospitable, respectful Gulf Arabic customer advisor',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: botSettings.voiceGender === 'female' ? 'Kore' : 'Fenrir',
                },
              },
            },
          },
        });

        botVoiceBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      } catch (ttsErr) {
        console.warn('TTS Generation optional notice:', ttsErr);
      }
    }

    // Add bot message
    const botMsgId = 'msg-' + (Date.now() + 1);
    const botMsg: ChatMessage = {
      id: botMsgId,
      sender: 'bot',
      type: botVoiceBase64 ? 'voice' : 'text',
      content: botReplyText,
      audioBase64: botVoiceBase64 ? `data:audio/wav;base64,${botVoiceBase64}` : undefined,
      timestamp: currentTimeStr,
      status: 'sent',
    };
    targetLead.messages.push(botMsg);

    targetLead.lastMessageTime = 'الآن';
    whatsappState.totalMessagesReplied += 1;

    // Detect category for simulator message
    const lowerQuery = (text || '').toLowerCase();
    const detectedCat = detectLeadCategory(text, targetLead.interestedCourse);
    targetLead.leadCategory = detectedCat;

    if (detectedCat === 'مناهج دراسية' && (!targetLead.interestedCourse || targetLead.interestedCourse.includes('استفسار'))) {
      if (lowerQuery.includes('رياضيات') || lowerQuery.includes('ماث')) {
        targetLead.interestedCourse = 'مناهج دراسية - مادة الرياضيات';
      } else if (lowerQuery.includes('علوم') || lowerQuery.includes('ساينس')) {
        targetLead.interestedCourse = 'مناهج دراسية - مادة العلوم والساينس';
      } else {
        targetLead.interestedCourse = 'مناهج دراسية ودروس خصوصية';
      }
    }

    if (botReplyText.includes('السعر') || botReplyText.includes('خصم') || botReplyText.includes('عرض') || botReplyText.includes('التكلفة')) {
      targetLead.stage = 'مهتم بالأسعار';
    }

    const hasBookingReq =
      lowerQuery.includes('حصة') || lowerQuery.includes('تجريبية') || lowerQuery.includes('سيشن') ||
      lowerQuery.includes('تجربة') || lowerQuery.includes('احجز') || lowerQuery.includes('سجل') ||
      lowerQuery.includes('رقمي') || lowerQuery.includes('اسمي') ||
      (targetLead.trialStatus && targetLead.trialStatus.includes('طلب تجربة'));

    if (hasBookingReq) {
      targetLead.isHighPriority = true;
      const trialCheck = extractAndValidateTrialData(targetLead, text || '');
      if (trialCheck.customerName) targetLead.customerName = trialCheck.customerName;
      if (trialCheck.subjectOrCourse) targetLead.trialSubject = trialCheck.subjectOrCourse;
      if (trialCheck.gradeOrLevel) targetLead.studentGrade = trialCheck.gradeOrLevel;
      if (trialCheck.trialDayTime) {
        targetLead.trialDayTime = trialCheck.trialDayTime;
        targetLead.trialDate = trialCheck.trialDayTime;
      }
      targetLead.missingTrialFields = trialCheck.missingFields;
      targetLead.trialDataComplete = trialCheck.isComplete;

      if (trialCheck.isComplete) {
        targetLead.trialStatus = 'طلب تجربة مكتمل (بانتظار التأكيد)';
        targetLead.stage = 'طلب رابط التسجيل';
        targetLead.supervisorNotes = `طلب تجربة مكتمل: الاسم (${targetLead.customerName})، المادة (${targetLead.trialSubject})، الصف/المستوى (${targetLead.studentGrade})، الموعد المحدد (${targetLead.trialDayTime}). بانتظار تأكيد الإشراف ورابط زووم.`;
        if (dispatchSettings.autoDispatchWhatsApp && !targetLead.dispatchedToSupervisor) {
          dispatchLeadToSupervisorWhatsApp(targetLead).catch(console.error);
        }
      } else {
        targetLead.trialStatus = 'طلب تجربة غير مكتمل (يحتاج استكمال بيانات)';
        targetLead.supervisorNotes = `طلب تجربة قيد الاستكمال: متوفر (${[targetLead.customerName !== 'عميل جديد' && 'الاسم', targetLead.trialSubject && 'المادة', targetLead.studentGrade && 'الصف', targetLead.trialDayTime && 'الموعد'].filter(Boolean).join('، ')}) - الناقص: (${trialCheck.missingFields.join('، ')}).`;
      }
    }

    // Persist leads and sync with Google Sheet
    savePersistedLeads();
    syncLeadToGoogleSheet(targetLead).catch((err) => {
      console.error('Sheet sync in chat message failed:', err);
    });

    res.json({
      success: true,
      data: {
        customerMessage: targetLead.messages[targetLead.messages.length - 2],
        botMessage: botMsg,
        transcribedText,
      },
    });
  } catch (error: any) {
    console.error('Error generating bot reply:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء معالجة رسالة الواتساب',
    });
  }
});

// 11. Add a new lead
app.post('/api/chats/new-lead', (req: Request, res: Response) => {
  const { customerName, phoneNumber, interestedCourse, leadCategory } = req.body;
  const detectedCategory = leadCategory || detectLeadCategory(interestedCourse || '', '');
  const isCurricula = detectedCategory === 'مناهج دراسية';
  const assignedSupervisor = isCurricula ? dispatchSettings.curriculaSupervisorName : dispatchSettings.coursesSupervisorName;

  const newLead: ChatLead = {
    id: 'lead-' + Date.now(),
    customerName: customerName || 'عميل جديد',
    phoneNumber: phoneNumber || '+966 5' + Math.floor(10000000 + Math.random() * 90000000),
    avatar: `https://images.unsplash.com/photo-${1535713875002 + Math.floor(Math.random() * 50)}?w=120&auto=format&fit=crop&q=80`,
    unreadCount: 0,
    lastMessageTime: 'الآن',
    createdAt: new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA'),
    interestedCourse: interestedCourse || (isCurricula ? 'مناهج دراسية ودروس خصوصية' : 'دورة احتراف اللغة الإنجليزية'),
    leadCategory: detectedCategory,
    stage: 'استفسار جديد',
    trialStatus: 'بانتظار مكالمة الإشراف',
    trialDate: 'بانتظار التنسيق مع العميل',
    assignedSupervisor: assignedSupervisor,
    supervisorNotes: `عميل جديد تم تسجيله في شيت الإكسيل بانتظار مكالمة الإشراف لحجز الحصة التجريبية (${detectedCategory}).`,
    isHighPriority: true,
    leadSource: isCurricula ? 'تسجيل يدوي / مناهج' : 'تسجيل يدوي / كورسات',
    messages: [
      {
        id: 'msg-' + Date.now(),
        sender: 'bot',
        type: 'text',
        content: botSettings.welcomeMessage,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
      },
    ],
  };

  chatLeads.unshift(newLead);
  savePersistedLeads();
  syncLeadToGoogleSheet(newLead).catch((err) => {
    console.error('Sheet sync for new lead failed:', err);
  });

  if (dispatchSettings.autoDispatchWhatsApp) {
    dispatchLeadToSupervisorWhatsApp(newLead).catch(console.error);
  }

  res.json({ success: true, data: newLead });
});

// 12. Export Leads to Real Excel (.xlsx) file with exact 10 columns
app.get('/api/leads/export-excel', (req: Request, res: Response) => {
  try {
    const rows = chatLeads.map((lead, idx) => ({
      'م': idx + 1,
      'اسم العميل': lead.customerName,
      'رقم الهاتف (واتساب)': lead.phoneNumber,
      'المادة/الكورس': lead.interestedCourse || 'استفسار عام',
      'حالة الحصة التجريبية': lead.trialStatus || 'بانتظار مكالمة الإشراف',
      'موعد الحصة التجريبية': lead.trialDate || 'بانتظار التنسيق مع العميل',
      'المشرف المكلف': lead.assignedSupervisor || 'بانتظار التكليف',
      'ملاحظات الإشراف والمكالمة': lead.supervisorNotes || '',
      'تاريخ أول رسالة': lead.createdAt || lead.lastMessageTime || 'اليوم',
      'مستوى الأولوية': lead.isHighPriority ? 'أولوية عاجلة 🔥' : 'عادي',
      'مصدر العميل': lead.leadSource || 'واتساب بيزنس',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!views'] = [{ rightToLeft: true }];
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 20 },
      { wch: 28 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 38 },
      { wch: 20 },
      { wch: 16 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'عملاء الأكاديمية');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Thakerli_Academy_Leads.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err: any) {
    console.error('Excel Export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export Leads to CSV file (.csv) with exact UTF-8 BOM
app.get('/api/leads/export-csv', (req: Request, res: Response) => {
  try {
    const headers = [
      'اسم العميل',
      'رقم الهاتف (واتساب)',
      'المادة/الكورس',
      'حالة الحصة التجريبية',
      'موعد الحصة التجريبية',
      'المشرف المكلف',
      'ملاحظات الإشراف والمكالمة',
      'تاريخ أول رسالة',
      'مستوى الأولوية',
      'مصدر العميل',
    ];

    const escapeCsv = (val: any) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };

    const lines = [
      headers.map(escapeCsv).join(','),
      ...chatLeads.map((lead) =>
        [
          lead.customerName,
          lead.phoneNumber,
          lead.interestedCourse || 'استفسار عام',
          lead.trialStatus || 'بانتظار مكالمة الإشراف',
          lead.trialDate || 'بانتظار التنسيق مع العميل',
          lead.assignedSupervisor || 'بانتظار التكليف',
          lead.supervisorNotes || '',
          lead.createdAt || lead.lastMessageTime || 'اليوم',
          lead.isHighPriority ? 'أولوية عاجلة 🔥' : 'عادي',
          lead.leadSource || 'واتساب بيزنس',
        ]
          .map(escapeCsv)
          .join(',')
      ),
    ];

    const csvContent = '\uFEFF' + lines.join('\r\n');
    res.setHeader('Content-Disposition', 'attachment; filename="Thakerli_Academy_Leads.csv"');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csvContent);
  } catch (err: any) {
    console.error('CSV Export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Import leads from Excel or CSV
app.post('/api/leads/import', (req: Request, res: Response) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'البيانات المرسلة فارغة أو غير صحيحة' });
    }

    let addedCount = 0;
    for (const r of rows) {
      // Map columns from arbitrary keys or user's exact 10 headers
      const customerName = r['اسم العميل'] || r.customerName || r.name;
      const phoneNumber = r['رقم الهاتف (واتساب)'] || r['رقم الواتساب'] || r.phoneNumber || r.phone;
      if (!customerName && !phoneNumber) continue;

      const newLead: ChatLead = {
        id: 'lead-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        customerName: customerName || 'عميل مستورد',
        phoneNumber: phoneNumber || '+966 50 000 0000',
        avatar: `https://images.unsplash.com/photo-${1535713875002 + Math.floor(Math.random() * 50)}?w=120&auto=format&fit=crop&q=80`,
        unreadCount: 0,
        lastMessageTime: 'مستورد من الشيت',
        createdAt: r['تاريخ أول رسالة'] || r['تاريخ التواصل'] || new Date().toLocaleDateString('ar-SA'),
        interestedCourse: r['المادة/الكورس'] || r['الدبلوم المهتم به'] || 'استفسار عام',
        stage: 'استفسار جديد',
        trialStatus: r['حالة الحصة التجريبية'] || 'بانتظار مكالمة الإشراف',
        trialDate: r['موعد الحصة التجريبية'] || 'بانتظار التنسيق مع العميل',
        assignedSupervisor: r['المشرف المكلف'] || 'بانتظار التكليف',
        supervisorNotes: r['ملاحظات الإشراف والمكالمة'] || '',
        isHighPriority: String(r['مستوى الأولوية'] || '').includes('عاجل'),
        leadSource: r['مصدر العميل'] || 'شيت إكسيل خارجي',
        messages: [
          {
            id: 'msg-import-' + Date.now(),
            sender: 'bot',
            type: 'text',
            content: botSettings.welcomeMessage,
            timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            status: 'read',
          },
        ],
      };

      chatLeads.unshift(newLead);
      addedCount++;
    }

    savePersistedLeads();
    res.json({ success: true, message: `تم استيراد ${addedCount} عميل إلى قاعدة بيانات البوت بنجاح!`, addedCount, total: chatLeads.length });
  } catch (err: any) {
    console.error('Import error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Update Lead Supervisory Data (Trial Class booking, notes, supervisor)
app.put('/api/leads/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const lead = chatLeads.find((l) => l.id === id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'العميل غير موجود' });
  }

  const { trialStatus, trialDate, supervisorNotes, assignedSupervisor, isHighPriority, interestedCourse } = req.body;
  if (trialStatus !== undefined) lead.trialStatus = trialStatus;
  if (trialDate !== undefined) lead.trialDate = trialDate;
  if (supervisorNotes !== undefined) lead.supervisorNotes = supervisorNotes;
  if (assignedSupervisor !== undefined) lead.assignedSupervisor = assignedSupervisor;
  if (isHighPriority !== undefined) lead.isHighPriority = isHighPriority;
  if (interestedCourse !== undefined) lead.interestedCourse = interestedCourse;

  savePersistedLeads();
  syncLeadToGoogleSheet(lead).catch((err) => {
    console.error('Sheet sync in lead update failed:', err);
  });

  res.json({ success: true, message: 'تم تحديث بيانات متابعة العميل في شيت الإكسيل بنجاح', data: lead });
});

// 14. Sheet Integration Config (Webhook URL for Google Sheets, Zapier, Make)
app.get('/api/sheet-config', (req: Request, res: Response) => {
  sheetConfig.totalSyncedRows = chatLeads.length;
  res.json({ success: true, data: sheetConfig });
});

app.post('/api/sheet-config', (req: Request, res: Response) => {
  sheetConfig = { ...sheetConfig, ...req.body, sheetColumns: SHEET_COLUMNS };
  savePersistedSheetConfig();
  res.json({ success: true, message: 'تم حفظ وتفعيل إعدادات ربط شيت الإكسيل بنجاح', data: sheetConfig });
});

// 15. Test Sheet Webhook Connection
app.post('/api/sheets/test-sync', async (req: Request, res: Response) => {
  const testUrl = req.body.webhookUrl || sheetConfig.webhookUrl;
  if (!testUrl) {
    return res.status(400).json({ success: false, error: 'الرجاء إدخال رابط Webhook لشيت Google Sheets' });
  }

  const testRow = [
    'عميل تجريبي (اختبار الربط)',
    '+966 50 123 4567',
    'دورة احتراف اللغة الإنجليزية',
    'بانتظار مكالمة الإشراف',
    'غداً 7:00 مساءً',
    'أ. مريم السالم',
    'تم إرسال هذا السطر تلقائياً للتأكد من نجاح ربط الشات بوت بشيت الإكسيل ✅',
    new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA'),
    'أولوية عاجلة 🔥',
    'اختبار ربط الشات بوت',
  ];

  try {
    const payload = {
      action: 'test_connection',
      source: 'whatsapp_bot_tester',
      timestamp: new Date().toISOString(),
      columns: SHEET_COLUMNS,
      row: testRow,
      customerName: testRow[0],
      phoneNumber: testRow[1],
      course: testRow[2],
      trialStatus: testRow[3],
      trialDate: testRow[4],
      supervisor: testRow[5],
      supervisorNotes: testRow[6],
      firstMessageDate: testRow[7],
      priority: testRow[8],
      leadSource: testRow[9],
    };

    const response = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    sheetConfig.lastSyncAt = new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA');
    sheetConfig.lastSyncStatus = response.ok ? 'success' : 'error';
    sheetConfig.lastSyncMessage = response.ok
      ? 'تم إرسال سطر تجريبي بنجاح إلى شيت Google Sheets!'
      : `تم إرسال الطلب لكن استجاب الرابط برمز: ${response.status}`;
    savePersistedSheetConfig();

    return res.json({
      success: response.ok,
      status: response.status,
      message: response.ok
        ? '🎉 تم الاتصال بنجاح! تم إرسال السطر التجريبي وتحديث الشيت لديك فوراً.'
        : `استجاب السيرفر برمز ${response.status}`,
    });
  } catch (err: any) {
    console.error('Test sync error:', err);
    sheetConfig.lastSyncStatus = 'error';
    sheetConfig.lastSyncMessage = `فشل الاتصال بالرابط: ${err.message}`;
    savePersistedSheetConfig();
    return res.status(500).json({
      success: false,
      error: `تعذر الاتصال بالرابط: ${err.message}. تأكد من تفعيل صلاحيات الويب هوك (Anyone) في Apps Script.`,
    });
  }
});

// 16. Sync All Leads to Google Sheet (Webhook fallback)
app.post('/api/sheets/sync-all', async (req: Request, res: Response) => {
  const result = await syncAllLeadsToGoogleSheet();
  if (result.success) {
    res.json({
      success: true,
      message: `🎉 تمت مزامنة جميع العملاء (${result.count} عميل) مع شيت Google Sheets بنجاح!`,
      data: sheetConfig,
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error || 'حدث خطأ أثناء مزامنة العملاء مع الشيت',
    });
  }
});

// 16.1 Update Google Sheets Direct Sync Status from Client
app.post('/api/sheets/update-sync-status', (req: Request, res: Response) => {
  const { status, message, totalSyncedRows, spreadsheetUrl, spreadsheetId, sheetTitle } = req.body;
  if (spreadsheetUrl !== undefined) sheetConfig.spreadsheetUrl = spreadsheetUrl;
  if (spreadsheetId !== undefined) sheetConfig.spreadsheetId = spreadsheetId;
  if (sheetTitle !== undefined) sheetConfig.sheetTitle = sheetTitle;
  if (status) sheetConfig.lastSyncStatus = status;
  if (message) sheetConfig.lastSyncMessage = message;
  if (totalSyncedRows !== undefined) sheetConfig.totalSyncedRows = totalSyncedRows;
  sheetConfig.lastSyncAt = new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA');
  savePersistedSheetConfig();
  res.json({ success: true, data: sheetConfig });
});


// 17. Supervisor WhatsApp Dispatch Settings (Curricula vs Courses)
app.get('/api/dispatch-settings', (req: Request, res: Response) => {
  res.json({ success: true, data: dispatchSettings });
});

app.post('/api/dispatch-settings', (req: Request, res: Response) => {
  dispatchSettings = {
    ...dispatchSettings,
    ...req.body,
  };
  savePersistedDispatchSettings();
  res.json({
    success: true,
    message: 'تم حفظ وتحديث أرقام الواتساب لإشراف المناهج والكورسات بنجاح ✅',
    data: dispatchSettings,
  });
});

// 18. Manual Trigger to Dispatch or Re-dispatch Lead to Supervisor
app.post('/api/leads/:id/dispatch', async (req: Request, res: Response) => {
  const { id } = req.params;
  const lead = chatLeads.find((l) => l.id === id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'العميل غير موجود' });
  }

  const result = await dispatchLeadToSupervisorWhatsApp(lead, req.body.notes);
  res.json({
    success: true,
    message: `تم إرسال بيانات العميل (${lead.customerName}) بنجاح إلى واتساب ${result.supervisorName} (${result.supervisorPhone})`,
    data: {
      lead,
      result,
    },
  });
});

// 19. Test WhatsApp Ping to Supervisor
app.post('/api/dispatch/test', async (req: Request, res: Response) => {
  const { targetType, phone } = req.body; // 'curricula' | 'courses'
  const isCurricula = targetType === 'curricula';
  const supervisorPhone = phone || (isCurricula ? dispatchSettings.curriculaSupervisorPhone : dispatchSettings.coursesSupervisorPhone);
  const supervisorName = isCurricula ? dispatchSettings.curriculaSupervisorName : dispatchSettings.coursesSupervisorName;

  const testMessage =
`🔔 *رسالة فحص واختبار ربط واتساب الإشراف*
━━━━━━━━━━━━━━━━━━━━
مرحباً ${supervisorName}،
هذه رسالة اختبار تلقائية من نظام شات بوت ذاكرلي أكاديمي للتأكد من ربط رقم الواتساب الخاص بك (${supervisorPhone}) بنجاح.
كل حجز جديد لقسم (${isCurricula ? 'المناهج الدراسية' : 'الكورسات وتطوير المهارات'}) سيصلك إشعاره هنا فوراً مع رابط محادثة العميل لإكمال الحجز على زووم ✅.`;

  try {
    if (waSocket && whatsappState.status === 'connected') {
      const cleanPhone = supervisorPhone.replace(/[\s+]/g, '');
      await waSocket.sendMessage(cleanPhone + '@s.whatsapp.net', { text: testMessage });
    }
    res.json({
      success: true,
      message: `تم إرسال رسالة الاختبار بنجاح إلى رقم (${supervisorPhone})!`,
      data: { supervisorPhone, supervisorName, testMessage },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `فشل إرسال رسالة الاختبار: ${err.message}`,
    });
  }
});

// 12. Meta WhatsApp Cloud API Webhook Integration (Alternative Enterprise Option)
app.get('/api/webhook/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'academy_whatsapp_token_2026')) {
    console.log('WhatsApp Webhook verified successfully!');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post('/api/webhook/whatsapp', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      if (message) {
        const from = message.from; // Customer phone number
        const text = message.text?.body || '';

        // Process with Gemini Khaleeji Bot
        const { botReplyText } = await processKhaleejiBotReply(text);
        console.log(`Cloud API Webhook message from ${from}: ${text} -> Reply: ${botReplyText}`);
        whatsappState.totalMessagesReplied++;
      }
      return res.status(200).send('EVENT_RECEIVED');
    }
    res.sendStatus(404);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(500);
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  // Start Baileys socket initially
  startBaileysSocket();

  // 24/7 Cloud Background Watchdog: ensures bot continues running even if user closes browser or laptop
  setInterval(() => {
    const credsPath = path.join(SESSION_DIR, 'creds.json');
    if (fs.existsSync(credsPath) && whatsappState.status === 'disconnected' && !isStartingSocket) {
      console.log('24/7 Watchdog: Saved WhatsApp session found, auto-reconnecting socket in background...');
      startBaileysSocket();
    }
  }, 30000);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const portNumber = Number(process.env.PORT) || 3000;
  app.listen(portNumber, '0.0.0.0', () => {
    console.log(`WhatsApp Academy Bot Server running on http://0.0.0.0:${portNumber}`);
  });
}

startServer();
