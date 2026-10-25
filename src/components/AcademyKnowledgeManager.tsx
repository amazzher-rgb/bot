import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  BookOpen,
  HelpCircle,
  Building2,
  Plus,
  Trash2,
  Edit3,
  Save,
  Check,
  FileText,
  Upload,
  Search,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  MessageSquare,
  ShieldCheck,
  Layers,
  FileUp,
  X,
  Target,
  ToggleLeft,
  ToggleRight,
  Power,
  AlertTriangle,
  School,
  Briefcase,
  RefreshCw,
  PhoneCall,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  AcademyData,
  Course,
  CurriculaData,
  CurriculaStage,
  CoursesData,
  ActiveKnowledgeMode
} from '../types';

interface AcademyKnowledgeManagerProps {
  academyData: AcademyData;
  onSaveAcademy: (data: AcademyData) => Promise<void>;
  onModeChangeNotification?: (modeName: string) => void;
}

export const AcademyKnowledgeManager: React.FC<AcademyKnowledgeManagerProps> = ({
  academyData,
  onSaveAcademy,
  onModeChangeNotification,
}) => {
  // Top level active dataset tab
  const [activeMainTab, setActiveMainTab] = useState<'curricula' | 'courses' | 'general'>('curricula');

  // Mode state from backend
  const [knowledgeMode, setKnowledgeMode] = useState<ActiveKnowledgeMode>({
    curriculaActive: true,
    coursesActive: false,
    activeMode: 'curricula_only',
  });
  const [isLoadingMode, setIsLoadingMode] = useState(false);

  // Curricula Dataset state
  const [curriculaData, setCurriculaData] = useState<CurriculaData | null>(null);
  const [curriculaSubTab, setCurriculaSubTab] = useState<'faqs' | 'stages' | 'upload' | 'pricing'>('faqs');
  const [curriculaSearchQuery, setCurriculaSearchQuery] = useState('');
  const [curriculaFaqPage, setCurriculaFaqPage] = useState(1);
  const [curriculaUploadText, setCurriculaUploadText] = useState('');
  const [curriculaUploadTitle, setCurriculaUploadTitle] = useState('');

  // Curricula Modals
  const [showAddCurriculaFaq, setShowAddCurriculaFaq] = useState(false);
  const [newCurriculaQ, setNewCurriculaQ] = useState('');
  const [newCurriculaA, setNewCurriculaA] = useState('');
  const [newCurriculaCategory, setNewCurriculaCategory] = useState('مناهج دراسية وتأسيس');

  const [editingCurriculaFaqIdx, setEditingCurriculaFaqIdx] = useState<number | null>(null);
  const [editCurriculaQ, setEditCurriculaQ] = useState('');
  const [editCurriculaA, setEditCurriculaA] = useState('');
  const [editCurriculaCat, setEditCurriculaCat] = useState('');

  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [newStage, setNewStage] = useState<Partial<CurriculaStage>>({
    name: '',
    targetAges: '',
    subjects: ['رياضيات', 'علوم', 'لغة إنجليزية'],
    sessionType: 'حصص تفاعلية لايف عبر زووم (فردية أو مجموعات صغيرة)',
    priceNote: 'حسب الصف والباقة وعدد الحصص + حصة تجريبية مجانية',
  });
  const [newStageSubjectsInput, setNewStageSubjectsInput] = useState('رياضيات، علوم، لغة إنجليزية');

  // Courses Dataset state
  const [coursesData, setCoursesData] = useState<CoursesData | null>(null);
  const [coursesSubTab, setCoursesSubTab] = useState<'courses' | 'faqs' | 'upload' | 'pricing'>('courses');
  const [coursesSearchQuery, setCoursesSearchQuery] = useState('');
  const [coursesFaqPage, setCoursesFaqPage] = useState(1);
  const [coursesUploadText, setCoursesUploadText] = useState('');
  const [coursesUploadTitle, setCoursesUploadTitle] = useState('');

  // Courses Modals
  const [showAddCoursesFaq, setShowAddCoursesFaq] = useState(false);
  const [newCoursesQ, setNewCoursesQ] = useState('');
  const [newCoursesA, setNewCoursesA] = useState('');
  const [newCoursesCategory, setNewCoursesCategory] = useState('كورسات وتطوير المهارات');

  const [editingCoursesFaqIdx, setEditingCoursesFaqIdx] = useState<number | null>(null);
  const [editCoursesQ, setEditCoursesQ] = useState('');
  const [editCoursesA, setEditCoursesA] = useState('');
  const [editCoursesCat, setEditCoursesCat] = useState('');

  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    title: '',
    category: 'اللغات والمهارات',
    duration: 'من 21 إلى 30 ساعة',
    schedule: 'مواعيد مرنة بداية كل أسبوع',
    mode: 'online',
    accreditation: 'شهادة معتمدة من ذاكرلي أكاديمي',
    description: '',
    syllabus: ['مقدمة وتأسيس', 'تطبيقات عملية ومحادثة', 'مشروع التخرج والاعتماد'],
    features: ['حصة تجريبية مجانية', 'ماتريال معتمدة من المركز الثقافي', 'حصص مسجلة'],
    price: '',
  });

  // General Academy Data State
  const [generalData, setGeneralData] = useState<AcademyData>(academyData);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const itemsPerPage = 8;

  const showNotification = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    if (onModeChangeNotification) onModeChangeNotification(msg);
  };

  // Fetch all 2 datasets and active mode
  const fetchAllDatasets = useCallback(async () => {
    try {
      const [modeRes, curriculaRes, coursesRes] = await Promise.all([
        fetch('/api/knowledge/mode').then((r) => r.json()),
        fetch('/api/curricula-data').then((r) => r.json()),
        fetch('/api/courses-data').then((r) => r.json()),
      ]);

      if (modeRes.success) {
        setKnowledgeMode(modeRes.data);
      }
      if (curriculaRes.success) {
        setCurriculaData(curriculaRes.data);
      }
      if (coursesRes.success) {
        setCoursesData(coursesRes.data);
      }
    } catch (err) {
      console.error('Error loading datasets:', err);
    }
  }, []);

  useEffect(() => {
    fetchAllDatasets();
  }, [fetchAllDatasets]);

  // Handle toggling knowledge mode (Switching between Curricula only, Courses only, or Both)
  const handleSetMode = async (modePreset: 'curricula_only' | 'courses_only' | 'both') => {
    setIsLoadingMode(true);
    try {
      const res = await fetch('/api/knowledge/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: modePreset }),
      });
      const data = await res.json();
      if (data.success) {
        setKnowledgeMode(data.data);
        showNotification(
          modePreset === 'curricula_only'
            ? '✅ تم تفعيل [داتا المناهج الدراسية فقط] للشات بوت وإغلاق الكورسات تماماً'
            : modePreset === 'courses_only'
            ? '✅ تم تفعيل [داتا الكورسات واللغات فقط] للشات بوت وإغلاق المناهج تماماً'
            : '✅ تم تفعيل [كلا القسمين] للشات بوت مع الفصل التام والصارم'
        );
        fetchAllDatasets();
      }
    } catch (err) {
      console.error('Error changing mode:', err);
    } finally {
      setIsLoadingMode(false);
    }
  };

  const handleToggleCurricula = async () => {
    const nextVal = !knowledgeMode.curriculaActive;
    setIsLoadingMode(true);
    try {
      const res = await fetch('/api/knowledge/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curriculaActive: nextVal,
          coursesActive: knowledgeMode.coursesActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKnowledgeMode(data.data);
        showNotification(nextVal ? '🟢 تم تشغيل (ON) داتا المناهج الدراسية للشات بوت' : '⚪ تم إيقاف (OFF) داتا المناهج الدراسية');
        fetchAllDatasets();
      }
    } finally {
      setIsLoadingMode(false);
    }
  };

  const handleToggleCourses = async () => {
    const nextVal = !knowledgeMode.coursesActive;
    setIsLoadingMode(true);
    try {
      const res = await fetch('/api/knowledge/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curriculaActive: knowledgeMode.curriculaActive,
          coursesActive: nextVal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKnowledgeMode(data.data);
        showNotification(nextVal ? '🔵 تم تشغيل (ON) داتا الكورسات واللغات للشات بوت' : '⚪ تم إيقاف (OFF) داتا الكورسات واللغات');
        fetchAllDatasets();
      }
    } finally {
      setIsLoadingMode(false);
    }
  };

  // ---------------- Curricula Actions ----------------
  const handleUploadCurriculaNotes = async () => {
    if (!curriculaUploadText.trim()) return;
    try {
      const res = await fetch('/api/curricula-data/upload-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: curriculaUploadText,
          title: curriculaUploadTitle || 'مستند مناهج دراسية إضافي',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurriculaData(data.data);
        setCurriculaUploadText('');
        setCurriculaUploadTitle('');
        showNotification('تم إضافة مستند المناهج بنجاح إلى داتا المناهج الدراسية');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCurriculaFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCurriculaQ.trim() || !newCurriculaA.trim()) return;
    try {
      const res = await fetch('/api/curricula-data/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newCurriculaQ,
          answer: newCurriculaA,
          category: newCurriculaCategory,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setShowAddCurriculaFaq(false);
        setNewCurriculaQ('');
        setNewCurriculaA('');
        showNotification('تمت إضافة السؤال بنجاح إلى داتا المناهج');
        fetchAllDatasets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEditCurriculaFaq = async () => {
    if (editingCurriculaFaqIdx === null) return;
    try {
      const res = await fetch(`/api/curricula-data/faq/${editingCurriculaFaqIdx}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: editCurriculaQ,
          answer: editCurriculaA,
          category: editCurriculaCat,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setEditingCurriculaFaqIdx(null);
        showNotification('تم تعديل سؤال المناهج بنجاح');
        fetchAllDatasets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCurriculaFaq = async (index: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السؤال من داتا المناهج؟')) return;
    try {
      const res = await fetch(`/api/curricula-data/faq/${index}`, {
        method: 'DELETE',
      });
      const d = await res.json();
      if (d.success) {
        showNotification('تم حذف السؤال من داتا المناهج');
        fetchAllDatasets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStage.name?.trim()) return;
    const subjectsArray = newStageSubjectsInput
      .split(/[,،]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/curricula-data/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newStage,
          subjects: subjectsArray,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setShowAddStageModal(false);
        setNewStage({
          name: '',
          targetAges: '',
          subjects: ['رياضيات', 'علوم', 'لغة إنجليزية'],
          sessionType: 'حصص تفاعلية لايف عبر زووم',
          priceNote: 'حسب الصف والباقة وعدد الحصص + حصة تجريبية مجانية',
        });
        showNotification('تمت إضافة المرحلة التعليمية بنجاح إلى داتا المناهج');
        fetchAllDatasets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المرحلة من داتا المناهج؟')) return;
    try {
      const res = await fetch(`/api/curricula-data/stage/${stageId}`, {
        method: 'DELETE',
      });
      const d = await res.json();
      if (d.success) {
        showNotification('تم حذف المرحلة من داتا المناهج');
        fetchAllDatasets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- Courses Actions ----------------
  const handleUploadCoursesNotes = async () => {
    if (!coursesUploadText.trim()) return;
    try {
      const res = await fetch('/api/courses-data/upload-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: coursesUploadText,
          title: coursesUploadTitle || 'مستند كورسات ولغات إضافي',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCoursesData(data.data);
        setCoursesUploadText('');
        setCoursesUploadTitle('');
        showNotification('تم إضافة مستند الكورسات بنجاح إلى داتا الكورسات واللغات');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCoursesFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoursesQ.trim() || !newCoursesA.trim()) return;
    try {
      const res = await fetch('/api/courses-data/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newCoursesQ,
          answer: newCoursesA,
          category: newCoursesCategory,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setShowAddCoursesFaq(false);
        setNewCoursesQ('');
        setNewCoursesA('');
        showNotification('تمت إضافة السؤال بنجاح إلى داتا الكورسات');
        fetchAllDatasets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEditCoursesFaq = async () => {
    if (editingCoursesFaqIdx === null) return;
    try {
      const res = await fetch(`/api/courses-data/faq/${editingCoursesFaqIdx}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: editCoursesQ,
          answer: editCoursesA,
          category: editCoursesCat,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setEditingCoursesFaqIdx(null);
        showNotification('تم تعديل سؤال الكورسات بنجاح');
        fetchAllDatasets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCoursesFaq = async (index: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السؤال من داتا الكورسات؟')) return;
    try {
      const res = await fetch(`/api/courses-data/faq/${index}`, {
        method: 'DELETE',
      });
      const d = await res.json();
      if (d.success) {
        showNotification('تم حذف السؤال من داتا الكورسات');
        fetchAllDatasets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.title?.trim()) return;

    try {
      const res = await fetch('/api/courses-data/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse),
      });
      const d = await res.json();
      if (d.success) {
        setShowCourseModal(false);
        setNewCourse({
          title: '',
          category: 'اللغات والمهارات',
          duration: 'من 21 إلى 30 ساعة',
          schedule: 'مواعيد مرنة بداية كل أسبوع',
          mode: 'online',
          accreditation: 'شهادة معتمدة من ذاكرلي أكاديمي',
          description: '',
          syllabus: ['مقدمة وتأسيس', 'تطبيقات عملية ومحادثة', 'مشروع التخرج والاعتماد'],
          features: ['حصة تجريبية مجانية', 'ماتريال معتمدة من المركز الثقافي', 'حصص مسجلة'],
          price: '',
        });
        showNotification('تمت إضافة الكورس بنجاح إلى داتا الكورسات');
        fetchAllDatasets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الكورس من داتا الكورسات؟')) return;
    try {
      const res = await fetch(`/api/courses-data/course/${courseId}`, {
        method: 'DELETE',
      });
      const d = await res.json();
      if (d.success) {
        showNotification('تم حذف الكورس من داتا الكورسات');
        fetchAllDatasets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Curricula FAQs
  const filteredCurriculaFaqs = useMemo(() => {
    if (!curriculaData?.faqs) return [];
    if (!curriculaSearchQuery.trim()) return curriculaData.faqs.map((f, idx) => ({ ...f, originalIndex: idx }));
    const q = curriculaSearchQuery.toLowerCase().trim();
    return curriculaData.faqs
      .map((f, idx) => ({ ...f, originalIndex: idx }))
      .filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  }, [curriculaData, curriculaSearchQuery]);

  const curriculaTotalPages = Math.ceil(filteredCurriculaFaqs.length / itemsPerPage) || 1;
  const paginatedCurriculaFaqs = useMemo(() => {
    const start = (curriculaFaqPage - 1) * itemsPerPage;
    return filteredCurriculaFaqs.slice(start, start + itemsPerPage);
  }, [filteredCurriculaFaqs, curriculaFaqPage]);

  // Filtered Courses FAQs
  const filteredCoursesFaqs = useMemo(() => {
    if (!coursesData?.faqs) return [];
    if (!coursesSearchQuery.trim()) return coursesData.faqs.map((f, idx) => ({ ...f, originalIndex: idx }));
    const q = coursesSearchQuery.toLowerCase().trim();
    return coursesData.faqs
      .map((f, idx) => ({ ...f, originalIndex: idx }))
      .filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  }, [coursesData, coursesSearchQuery]);

  const coursesTotalPages = Math.ceil(filteredCoursesFaqs.length / itemsPerPage) || 1;
  const paginatedCoursesFaqs = useMemo(() => {
    const start = (coursesFaqPage - 1) * itemsPerPage;
    return filteredCoursesFaqs.slice(start, start + itemsPerPage);
  }, [filteredCoursesFaqs, coursesFaqPage]);

  // Save General Academy Data
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    try {
      await onSaveAcademy(generalData);
      showNotification('تم حفظ بيانات وهوية الأكاديمية العامة بنجاح');
    } finally {
      setIsSavingGeneral(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {saveSuccessMsg && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium animate-bounce border border-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* TOP HERO & CAMPAIGN DATASET SWITCHER (2 SEPARATE DATASETS CONTROLLER) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-emerald-400 mb-3 shadow-inner">
                <BrainCircuit className="w-4 h-4 text-emerald-400" />
                <span>نظام الداتا المنفصلة للشات بوت (Zero-Hallucination Isolation)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <span>إدارة داتا الشات بوت:</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                  المناهج الدراسية vs الكورسات
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
                تحكم كامل في تفعيل داتا الشات بوت الحالية بنقرة زر: فعّل داتا المناهج (ON) لحملات المدارس ليعتمد الشات بوت حصراً على مناهج الطلاب، أو فعّل داتا الكورسات (ON) لحملات لغات الكبار لتكون هي الداتا المعتمدة فقط دون خلط مطلق.
              </p>
            </div>

            {/* Quick Live Mode Indicator Pill */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shrink-0 shadow-lg flex flex-col gap-2 min-w-[280px]">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>الداتا النشطة للشات بوت الآن:</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div className="flex items-center gap-2 font-bold text-sm">
                {knowledgeMode.curriculaActive && !knowledgeMode.coursesActive && (
                  <span className="text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl w-full">
                    <School className="w-4 h-4" />
                    <span>📚 داتا المناهج الدراسية فقط (نشطة)</span>
                  </span>
                )}
                {!knowledgeMode.curriculaActive && knowledgeMode.coursesActive && (
                  <span className="text-blue-400 flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-xl w-full">
                    <Briefcase className="w-4 h-4" />
                    <span>🎓 داتا الكورسات واللغات فقط (نشطة)</span>
                  </span>
                )}
                {knowledgeMode.curriculaActive && knowledgeMode.coursesActive && (
                  <span className="text-purple-400 flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded-xl w-full">
                    <Layers className="w-4 h-4" />
                    <span>⚡ كلاهما مفعّل (مع الفصل التام)</span>
                  </span>
                )}
                {!knowledgeMode.curriculaActive && !knowledgeMode.coursesActive && (
                  <span className="text-amber-400 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl w-full">
                    <AlertTriangle className="w-4 h-4" />
                    <span>⚠️ كل الداتا مغلقة (يرد بالنبذة العامة فقط)</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 1-CLICK CAMPAIGN PRESET BUTTONS & TOGGLES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Curricula Campaign Preset */}
            <button
              onClick={() => handleSetMode('curricula_only')}
              disabled={isLoadingMode}
              className={`p-4 rounded-2xl border transition-all text-right cursor-pointer flex flex-col justify-between gap-3 relative ${
                knowledgeMode.curriculaActive && !knowledgeMode.coursesActive
                  ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <School className="w-5 h-5" />
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    knowledgeMode.curriculaActive && !knowledgeMode.coursesActive
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {knowledgeMode.curriculaActive && !knowledgeMode.coursesActive ? 'مفعّل الآن ✅' : 'اختر هذا الوضع'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-white text-base">حملة المناهج الدراسية فقط</h3>
                <p className="text-xs text-slate-400 mt-1">
                  المناهج: <strong className="text-emerald-400 font-bold">ON</strong> | الكورسات: <strong className="text-slate-500 font-bold">OFF</strong>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  مخصص لإعلانات المدارس والتأسيس؛ يتجاهل الكورسات تماماً ويرد من داتا المناهج حصراً.
                </p>
              </div>
            </button>

            {/* Courses Campaign Preset */}
            <button
              onClick={() => handleSetMode('courses_only')}
              disabled={isLoadingMode}
              className={`p-4 rounded-2xl border transition-all text-right cursor-pointer flex flex-col justify-between gap-3 relative ${
                !knowledgeMode.curriculaActive && knowledgeMode.coursesActive
                  ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <Briefcase className="w-5 h-5" />
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    !knowledgeMode.curriculaActive && knowledgeMode.coursesActive
                      ? 'bg-blue-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {!knowledgeMode.curriculaActive && knowledgeMode.coursesActive ? 'مفعّل الآن ✅' : 'اختر هذا الوضع'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-white text-base">حملة الكورسات واللغات فقط</h3>
                <p className="text-xs text-slate-400 mt-1">
                  المناهج: <strong className="text-slate-500 font-bold">OFF</strong> | الكورسات: <strong className="text-blue-400 font-bold">ON</strong>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  مخصص لإعلانات اللغات وسوق العمل للكبار؛ يعتمد حصراً على أسعار وداتا الكورسات.
                </p>
              </div>
            </button>

            {/* Dual Campaign Preset */}
            <button
              onClick={() => handleSetMode('both')}
              disabled={isLoadingMode}
              className={`p-4 rounded-2xl border transition-all text-right cursor-pointer flex flex-col justify-between gap-3 relative ${
                knowledgeMode.curriculaActive && knowledgeMode.coursesActive
                  ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <Layers className="w-5 h-5" />
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    knowledgeMode.curriculaActive && knowledgeMode.coursesActive
                      ? 'bg-purple-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {knowledgeMode.curriculaActive && knowledgeMode.coursesActive ? 'مفعّل الآن ✅' : 'اختر هذا الوضع'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-white text-base">الوضع المشترك (كلاهما مفعّل)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  المناهج: <strong className="text-purple-400 font-bold">ON</strong> | الكورسات: <strong className="text-purple-400 font-bold">ON</strong>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  تفعيل القسمين مع إلزام البوت بالفصل التام وعدم الخلط بين أسئلة المدارس والكورسات.
                </p>
              </div>
            </button>
          </div>

          {/* Individual Switches Bar */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300">مفاتيح التشغيل الفردية (ON / OFF):</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {/* Curricula Toggle */}
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-xs font-medium text-slate-300">داتا المناهج:</span>
                <button
                  onClick={handleToggleCurricula}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    knowledgeMode.curriculaActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {knowledgeMode.curriculaActive ? 'ON نشط' : 'OFF متوقف'}
                </button>
              </div>

              {/* Courses Toggle */}
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-xs font-medium text-slate-300">داتا الكورسات:</span>
                <button
                  onClick={handleToggleCourses}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    knowledgeMode.coursesActive
                      ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {knowledgeMode.coursesActive ? 'ON نشط' : 'OFF متوقف'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP LEVEL NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {/* Tab 1: Curricula Dataset */}
          <button
            onClick={() => setActiveMainTab('curricula')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-bold text-sm transition cursor-pointer ${
              activeMainTab === 'curricula'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/30'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <School className="w-4 h-4" />
            <span>1. داتا المناهج الدراسية</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                knowledgeMode.curriculaActive
                  ? activeMainTab === 'curricula'
                    ? 'bg-slate-950 text-emerald-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {knowledgeMode.curriculaActive ? 'ON نشطة للشات' : 'OFF مقفلة'}
            </span>
          </button>

          {/* Tab 2: Courses Dataset */}
          <button
            onClick={() => setActiveMainTab('courses')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-bold text-sm transition cursor-pointer ${
              activeMainTab === 'courses'
                ? 'bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/30'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>2. داتا الكورسات واللغات</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                knowledgeMode.coursesActive
                  ? activeMainTab === 'courses'
                    ? 'bg-slate-950 text-blue-400'
                    : 'bg-blue-500/20 text-blue-400'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {knowledgeMode.coursesActive ? 'ON نشطة للشات' : 'OFF مقفلة'}
            </span>
          </button>

          {/* Tab 3: General Academy Branding */}
          <button
            onClick={() => setActiveMainTab('general')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition cursor-pointer ${
              activeMainTab === 'general'
                ? 'bg-slate-700 text-white border border-slate-600'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>بيانات الأكاديمية والهوية</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: CURRICULA DATASET MANAGEMENT (داتا المناهج الدراسية المنفصلة) */}
      {/* ========================================================================= */}
      {activeMainTab === 'curricula' && curriculaData && (
        <div className="space-y-6">
          {/* Subtabs Bar for Curricula */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurriculaSubTab('faqs')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  curriculaSubTab === 'faqs'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>بنك أسئلة المناهج ({curriculaData.faqs.length})</span>
              </button>

              <button
                onClick={() => setCurriculaSubTab('stages')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  curriculaSubTab === 'stages'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                <span>المراحل والمقررات والصفوف ({curriculaData.stages.length})</span>
              </button>

              <button
                onClick={() => setCurriculaSubTab('upload')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  curriculaSubTab === 'upload'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>رفع مستندات ونصوص المناهج</span>
              </button>

              <button
                onClick={() => setCurriculaSubTab('pricing')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  curriculaSubTab === 'pricing'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>سياسة أسعار المناهج بالداتا</span>
              </button>
            </div>

            {/* Curricula Supervisor info tag */}
            <div className="text-xs text-slate-400 flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span>مشرفة المناهج: <strong>{curriculaData.supervisor.name}</strong> ({curriculaData.supervisor.phone})</span>
            </div>
          </div>

          {/* Subtab: Curricula FAQs */}
          {curriculaSubTab === 'faqs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="relative w-full sm:w-96">
                  <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث في بنك أسئلة المناهج المدرسية..."
                    value={curriculaSearchQuery}
                    onChange={(e) => {
                      setCurriculaSearchQuery(e.target.value);
                      setCurriculaFaqPage(1);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={() => setShowAddCurriculaFaq(true)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة سؤال جديد للمناهج</span>
                </button>
              </div>

              {/* FAQs List */}
              <div className="space-y-3">
                {paginatedCurriculaFaqs.map((faq) => (
                  <div
                    key={faq.originalIndex}
                    className="bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {faq.category || 'مناهج دراسية'}
                          </span>
                          <h4 className="font-bold text-white text-base leading-snug">
                            {faq.question}
                          </h4>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed font-sans pr-2 border-r-2 border-emerald-500/40">
                          {faq.answer}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingCurriculaFaqIdx(faq.originalIndex);
                            setEditCurriculaQ(faq.question);
                            setEditCurriculaA(faq.answer);
                            setEditCurriculaCat(faq.category || 'مناهج دراسية');
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                          title="تعديل السؤال"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCurriculaFaq(faq.originalIndex)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                          title="حذف السؤال"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {paginatedCurriculaFaqs.length === 0 && (
                  <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/60">
                    لا توجد نتائج مطابقة لبحثك في داتا المناهج.
                  </div>
                )}
              </div>

              {/* Pagination */}
              {curriculaTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    صفحة {curriculaFaqPage} من {curriculaTotalPages} (إجمالي {filteredCurriculaFaqs.length} سؤال)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurriculaFaqPage((p) => Math.max(1, p - 1))}
                      disabled={curriculaFaqPage === 1}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurriculaFaqPage((p) => Math.min(curriculaTotalPages, p + 1))}
                      disabled={curriculaFaqPage === curriculaTotalPages}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subtab: Curricula Stages & Subjects */}
          {curriculaSubTab === 'stages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div>
                  <h3 className="font-bold text-white text-base">المراحل والصفوف التعليمية المعتمدة بالداتا</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    هذه المراحل هي التي يعتمد عليها الشات بوت عند سؤال العميل عن صفوف ومواد أبنائه.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddStageModal(true)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مرحلة جديدة</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {curriculaData.stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 relative flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <h4 className="font-bold text-white text-base flex items-center gap-2">
                            <School className="w-4 h-4 text-emerald-400" />
                            <span>{stage.name}</span>
                          </h4>
                          <span className="inline-block text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            الصفوف: {stage.targetAges}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteStage(stage.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                          title="حذف المرحلة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-3 space-y-2 text-xs text-slate-300">
                        <div>
                          <strong className="text-slate-400">المواد والمقررات:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {stage.subjects.map((sub, idx) => (
                              <span key={idx} className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <strong className="text-slate-400">أسلوب ونظام الحصص:</strong>
                          <p className="text-slate-300 mt-0.5">{stage.sessionType}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400">التسعير بالداتا:</span>
                      <span className="font-bold text-emerald-400">{stage.priceNote}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab: Upload Curricula Notes & Docs */}
          {curriculaSubTab === 'upload' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-emerald-400" />
                  <span>رفع مستندات ونصوص داتا المناهج المدرسية</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  ألصق أي مستندات أو مذكرات أو تفاصيل عن المناهج المدرسية والصفوف والأسعار ليتم دمجها فوراً في الذاكرة الحصرية لقسم المناهج.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="عنوان المستند أو المذكرة (مثال: تفاصيل باقات المنهج السعودي ومتابعة زووم)"
                  value={curriculaUploadTitle}
                  onChange={(e) => setCurriculaUploadTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />

                <textarea
                  rows={6}
                  placeholder="ألصق محتوى مستند المناهج هنا بالتفصيل..."
                  value={curriculaUploadText}
                  onChange={(e) => setCurriculaUploadText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
                />

                <button
                  onClick={handleUploadCurriculaNotes}
                  disabled={!curriculaUploadText.trim()}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>حفظ وإضافة إلى داتا المناهج</span>
                </button>
              </div>

              {curriculaData.uploadedNotes && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400">المستندات الإضافية المرفوعة للمناهج حالياً:</h4>
                  <div className="bg-slate-950 rounded-xl p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-800/80">
                    {curriculaData.uploadedNotes}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subtab: Curricula Pricing Policy */}
          {curriculaSubTab === 'pricing' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="font-bold text-white text-lg">سياسة أسعار المناهج المعتمدة بالداتا</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    هذا النص يتم تلقينه للشات بوت ليكون مرجعيته الصارمة عند السؤال عن أسعار المناهج، لمنع أي اجتهاد أو هلوسة.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 leading-relaxed font-sans">
                {curriculaData.pricingPolicy}
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <strong>💡 تنبيه حاسم:</strong>
                <p>
                  الشات بوت في وضع المناهج الدراسية لا يذكر أي أسعار عشوائية أو خصومات وهمية، بل يوضح للعميل أن الأسعار محددة بالداتا حسب الصف والمادة والباقة، ويسأله عن بيانات الطالب لحجز حصته التجريبية المجانية على زووم فوراً.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: COURSES DATASET MANAGEMENT (داتا الكورسات واللغات المنفصلة)   */}
      {/* ========================================================================= */}
      {activeMainTab === 'courses' && coursesData && (
        <div className="space-y-6">
          {/* Subtabs Bar for Courses */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCoursesSubTab('courses')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  coursesSubTab === 'courses'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>دليل الكورسات والأسعار بالداتا ({coursesData.courses.length})</span>
              </button>

              <button
                onClick={() => setCoursesSubTab('faqs')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  coursesSubTab === 'faqs'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>بنك أسئلة الكورسات ({coursesData.faqs.length})</span>
              </button>

              <button
                onClick={() => setCoursesSubTab('upload')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  coursesSubTab === 'upload'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>رفع مستندات ونصوص الكورسات</span>
              </button>

              <button
                onClick={() => setCoursesSubTab('pricing')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  coursesSubTab === 'pricing'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>سياسة أسعار الكورسات بالداتا</span>
              </button>
            </div>

            {/* Courses Supervisor info tag */}
            <div className="text-xs text-slate-400 flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
              <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
              <span>مشرف الكورسات: <strong>{coursesData.supervisor.name}</strong> ({coursesData.supervisor.phone})</span>
            </div>
          </div>

          {/* Subtab: Courses Catalog with Official Data Prices */}
          {coursesSubTab === 'courses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div>
                  <h3 className="font-bold text-white text-base">الكورسات والبرامج التدريبية المعتمدة بالداتا</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    الأسعار المكتوبة هنا هي المرجع الحصري للشات بوت عند الرد على استفسارات الأسعار.
                  </p>
                </div>
                <button
                  onClick={() => setShowCourseModal(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة كورس جديد</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coursesData.courses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 relative flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <h4 className="font-bold text-white text-base flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-blue-400" />
                            <span>{course.title}</span>
                          </h4>
                          <span className="inline-block text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                            الفئة: {course.category}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                          title="حذف الكورس"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>

                      <div className="mt-3 space-y-1 text-xs text-slate-300">
                        <div>⏱ المدة: <span className="text-slate-200">{course.duration}</span></div>
                        <div>🗓 المواعيد: <span className="text-slate-200">{course.schedule}</span></div>
                        <div>🎓 الاعتماد: <span className="text-slate-200">{course.accreditation}</span></div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs text-slate-400">السعر المعتمد بالداتا:</span>
                      <span className="text-sm font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                        {course.price || 'محدد بالداتا'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab: Courses FAQs */}
          {coursesSubTab === 'faqs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="relative w-full sm:w-96">
                  <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث في بنك أسئلة الكورسات واللغات..."
                    value={coursesSearchQuery}
                    onChange={(e) => {
                      setCoursesSearchQuery(e.target.value);
                      setCoursesFaqPage(1);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={() => setShowAddCoursesFaq(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-lg shadow-blue-600/20 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة سؤال جديد للكورسات</span>
                </button>
              </div>

              {/* FAQs List */}
              <div className="space-y-3">
                {paginatedCoursesFaqs.map((faq) => (
                  <div
                    key={faq.originalIndex}
                    className="bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {faq.category || 'كورسات وتطوير'}
                          </span>
                          <h4 className="font-bold text-white text-base leading-snug">
                            {faq.question}
                          </h4>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed font-sans pr-2 border-r-2 border-blue-500/40">
                          {faq.answer}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingCoursesFaqIdx(faq.originalIndex);
                            setEditCoursesQ(faq.question);
                            setEditCoursesA(faq.answer);
                            setEditCoursesCat(faq.category || 'كورسات وتطوير');
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                          title="تعديل السؤال"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCoursesFaq(faq.originalIndex)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                          title="حذف السؤال"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {paginatedCoursesFaqs.length === 0 && (
                  <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/60">
                    لا توجد نتائج مطابقة لبحثك في داتا الكورسات.
                  </div>
                )}
              </div>

              {/* Pagination */}
              {coursesTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    صفحة {coursesFaqPage} من {coursesTotalPages} (إجمالي {filteredCoursesFaqs.length} سؤال)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCoursesFaqPage((p) => Math.max(1, p - 1))}
                      disabled={coursesFaqPage === 1}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCoursesFaqPage((p) => Math.min(coursesTotalPages, p + 1))}
                      disabled={coursesFaqPage === coursesTotalPages}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subtab: Upload Courses Notes & Docs */}
          {coursesSubTab === 'upload' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-blue-400" />
                  <span>رفع مستندات ونصوص داتا الكورسات واللغات</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  ألصق أي محتوى أو حقائب تدريبية خاصة بدورات اللغات أو العمل الحر أو البرمجة ليتم دمجها فوراً في داتا الكورسات.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="عنوان المستند (مثال: محاور دورة المحادثة المكثفة للغة الإنجليزية)"
                  value={coursesUploadTitle}
                  onChange={(e) => setCoursesUploadTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />

                <textarea
                  rows={6}
                  placeholder="ألصق محتوى مستند الكورسات هنا بالتفصيل..."
                  value={coursesUploadText}
                  onChange={(e) => setCoursesUploadText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
                />

                <button
                  onClick={handleUploadCoursesNotes}
                  disabled={!coursesUploadText.trim()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer shadow-lg shadow-blue-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>حفظ وإضافة إلى داتا الكورسات</span>
                </button>
              </div>

              {coursesData.uploadedNotes && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400">المستندات الإضافية المرفوعة للكورسات حالياً:</h4>
                  <div className="bg-slate-950 rounded-xl p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-800/80">
                    {coursesData.uploadedNotes}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subtab: Courses Pricing Policy */}
          {coursesSubTab === 'pricing' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                  <ShieldCheck className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="font-bold text-white text-lg">سياسة أسعار الكورسات المعتمدة بالداتا</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    المرجعية الدائمة والصارمة هي الأسعار المكتوبة بالداتا المرفوعة فقط بدون أي خصومات وهمية.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 leading-relaxed font-sans">
                {coursesData.pricingPolicy}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {coursesData.courses.map((c) => (
                  <div key={c.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 truncate">{c.title}</span>
                    <span className="text-xs font-extrabold text-emerald-400 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      {c.price || 'محدد بالداتا'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: GENERAL ACADEMY IDENTITY (الهوية وبيانات الأكاديمية العامة) */}
      {/* ========================================================================= */}
      {activeMainTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span>هوية وبيانات الأكاديمية العامة المشتركة</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              الاسم والشعار والموقع وساعات العمل التي يعتمد عليها الشات بوت عند التعريف بالأكاديمية في كلا القسمين.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">اسم الأكاديمية</label>
              <input
                type="text"
                value={generalData.name}
                onChange={(e) => setGeneralData({ ...generalData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">الشعار التسويقي (Tagline)</label>
              <input
                type="text"
                value={generalData.tagline}
                onChange={(e) => setGeneralData({ ...generalData, tagline: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">الموقع والمدينة</label>
              <input
                type="text"
                value={generalData.city}
                onChange={(e) => setGeneralData({ ...generalData, city: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">ساعات وأيام العمل</label>
              <input
                type="text"
                value={generalData.workingHours}
                onChange={(e) => setGeneralData({ ...generalData, workingHours: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">نبذة كاملة عن الأكاديمية</label>
            <textarea
              rows={4}
              value={generalData.about}
              onChange={(e) => setGeneralData({ ...generalData, about: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">ضمان الحصة التجريبية والجودة</label>
            <input
              type="text"
              value={generalData.guarantee}
              onChange={(e) => setGeneralData({ ...generalData, guarantee: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={isSavingGeneral}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingGeneral ? 'جاري الحفظ...' : 'حفظ بيانات الهوية العامة'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* MODALS SECTION (FOR CURRICULA & COURSES) */}
      {/* ========================================================================= */}

      {/* 1. Modal: Add Curricula FAQ */}
      {showAddCurriculaFaq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <School className="w-4 h-4 text-emerald-400" />
                <span>إضافة سؤال جديد لبنك داتا المناهج</span>
              </h3>
              <button
                onClick={() => setShowAddCurriculaFaq(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCurriculaFaq} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">السؤال المتوقع من ولي الأمر أو الطالب</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كم مدة الحصة لطلاب الابتدائي؟"
                  value={newCurriculaQ}
                  onChange={(e) => setNewCurriculaQ(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">تصنيف السؤال</label>
                <input
                  type="text"
                  value={newCurriculaCategory}
                  onChange={(e) => setNewCurriculaCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">الإجابة المعتمدة من الأكاديمية</label>
                <textarea
                  rows={4}
                  required
                  placeholder="اكتب الإجابة النموذجية المعتمدة..."
                  value={newCurriculaA}
                  onChange={(e) => setNewCurriculaA(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCurriculaFaq(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إضافة السؤال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Edit Curricula FAQ */}
      {editingCurriculaFaqIdx !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">تعديل سؤال المناهج الدراسية</h3>
              <button
                onClick={() => setEditingCurriculaFaqIdx(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">السؤال</label>
                <input
                  type="text"
                  value={editCurriculaQ}
                  onChange={(e) => setEditCurriculaQ(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">التصنيف</label>
                <input
                  type="text"
                  value={editCurriculaCat}
                  onChange={(e) => setEditCurriculaCat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">الإجابة</label>
                <textarea
                  rows={4}
                  value={editCurriculaA}
                  onChange={(e) => setEditCurriculaA(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCurriculaFaqIdx(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditCurriculaFaq}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Add Curricula Stage */}
      {showAddStageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <School className="w-4 h-4 text-emerald-400" />
                <span>إضافة مرحلة أو صف دراسي لداتا المناهج</span>
              </h3>
              <button
                onClick={() => setShowAddStageModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStage} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">اسم المرحلة الدراسية</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مرحلة الثانوية العامة (مسارات وعام)"
                  value={newStage.name}
                  onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">الصفوف المستهدفة</label>
                <input
                  type="text"
                  placeholder="مثال: الصف الأول، الثاني، والثالث الثانوي"
                  value={newStage.targetAges}
                  onChange={(e) => setNewStage({ ...newStage, targetAges: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">المواد والمقررات (مفصولة بفاصلة)</label>
                <input
                  type="text"
                  placeholder="رياضيات، فيزياء، كيمياء، إنجليزي، قدرات"
                  value={newStageSubjectsInput}
                  onChange={(e) => setNewStageSubjectsInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">ملاحظة التسعير بالداتا</label>
                <input
                  type="text"
                  value={newStage.priceNote}
                  onChange={(e) => setNewStage({ ...newStage, priceNote: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStageModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  حفظ المرحلة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Add Course to Courses Dataset */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span>إضافة كورس جديد لداتا الكورسات واللغات</span>
              </h3>
              <button
                onClick={() => setShowCourseModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCourse} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">عنوان الكورس التدريبي</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: دورة اللغة الإيطالية التفاعلية للمبتدئين"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">الفئة</label>
                  <input
                    type="text"
                    value={newCourse.category}
                    onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">السعر المعتمد بالداتا (ريال)</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 599 ريال سعودي"
                    value={newCourse.price}
                    onChange={(e) => setNewCourse({ ...newCourse, price: e.target.value })}
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-4 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">المدة التدريبية</label>
                  <input
                    type="text"
                    value={newCourse.duration}
                    onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">المواعيد</label>
                  <input
                    type="text"
                    value={newCourse.schedule}
                    onChange={(e) => setNewCourse({ ...newCourse, schedule: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">نبذة عن الكورس</label>
                <textarea
                  rows={2}
                  placeholder="وصف مختصر لمحتوى الكورس والهدف منه..."
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  حفظ الكورس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Add Courses FAQ */}
      {showAddCoursesFaq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" />
                <span>إضافة سؤال جديد لبنك داتا الكورسات</span>
              </h3>
              <button
                onClick={() => setShowAddCoursesFaq(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCoursesFaq} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">السؤال المتوقع من المتدرب</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: هل الكورس يؤهل لاختبار الآيلتس؟"
                  value={newCoursesQ}
                  onChange={(e) => setNewCoursesQ(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">تصنيف السؤال</label>
                <input
                  type="text"
                  value={newCoursesCategory}
                  onChange={(e) => setNewCoursesCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">الإجابة المعتمدة من الأكاديمية</label>
                <textarea
                  rows={4}
                  required
                  placeholder="اكتب الإجابة النموذجية المعتمدة..."
                  value={newCoursesA}
                  onChange={(e) => setNewCoursesA(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCoursesFaq(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إضافة السؤال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Edit Courses FAQ */}
      {editingCoursesFaqIdx !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">تعديل سؤال الكورسات</h3>
              <button
                onClick={() => setEditingCoursesFaqIdx(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">السؤال</label>
                <input
                  type="text"
                  value={editCoursesQ}
                  onChange={(e) => setEditCoursesQ(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">التصنيف</label>
                <input
                  type="text"
                  value={editCoursesCat}
                  onChange={(e) => setEditCoursesCat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">الإجابة</label>
                <textarea
                  rows={4}
                  value={editCoursesA}
                  onChange={(e) => setEditCoursesA(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCoursesFaqIdx(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditCoursesFaq}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
