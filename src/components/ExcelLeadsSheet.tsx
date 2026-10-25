import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Phone,
  MessageSquare,
  Search,
  Filter,
  Calendar,
  UserCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Edit3,
  Save,
  Check,
  Share2,
  AlertCircle,
  Plus,
  RefreshCw,
  Copy,
  ChevronDown,
  Layers,
  Settings,
  Upload,
  Send,
  Zap,
  Code2,
  CheckCircle,
  HelpCircle,
  FileText,
  PhoneCall,
  BookOpen,
  LogIn,
  LogOut,
  Link as LinkIcon
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ChatLead, TrialClassStatus, SheetIntegrationConfig } from '../types';
import * as XLSX from 'xlsx';
import {
  initAuth,
  googleSignIn,
  logout as googleLogout,
  extractSpreadsheetId,
  verifyAndSetupGoogleSheet,
  appendRowToGoogleSheet,
  batchAppendLeadsToGoogleSheet,
  formatLeadRow,
} from '../lib/sheetsService';

interface ExcelLeadsSheetProps {
  leads: ChatLead[];
  onUpdateLead: (id: string, updates: Partial<ChatLead>) => Promise<void>;
  onOpenChatWithLead: (leadId: string) => void;
  onRefreshData: () => Promise<void>;
  onNavigateToRouting?: () => void;
}

export const ExcelLeadsSheet: React.FC<ExcelLeadsSheetProps> = ({
  leads,
  onUpdateLead,
  onOpenChatWithLead,
  onRefreshData,
  onNavigateToRouting,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [schedulingModalLead, setSchedulingModalLead] = useState<ChatLead | null>(null);
  const [trialDateInput, setTrialDateInput] = useState('');
  const [trialSupervisorInput, setTrialSupervisorInput] = useState('أ. مريم السالم');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [googleSheetsModalOpen, setGoogleSheetsModalOpen] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [sheetTitle, setSheetTitle] = useState('');
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [sheetConfig, setSheetConfig] = useState<SheetIntegrationConfig | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [dispatchingLeadId, setDispatchingLeadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Firebase Auth listener for Google Sheets access
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleDispatchLeadToSupervisor = async (lead: ChatLead) => {
    setDispatchingLeadId(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: lead.supervisorNotes || '' }),
      });
      const data = await res.json();
      if (data.success) {
        await onRefreshData();
        setImportNotice(`✅ تم توجيه بيانات (${lead.customerName}) فورياً إلى ${data.supervisorName} (${data.supervisorPhone}) على الواتساب!`);
      } else {
        alert(data.error || 'فشل توجيه بيانات العميل للمشرف');
      }
    } catch (e: any) {
      console.error(e);
      alert('خطأ أثناء إرسال بيانات العميل للمشرف');
    } finally {
      setDispatchingLeadId(null);
      setTimeout(() => setImportNotice(null), 5000);
    }
  };

  // Fetch sheet config on mount
  useEffect(() => {
    fetch('/api/sheet-config')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setSheetConfig(res.data);
          setSpreadsheetUrl(res.data.spreadsheetUrl || res.data.webhookUrl || '');
          setSheetTitle(res.data.sheetTitle || '');
          setAutoSyncEnabled(res.data.autoSyncEnabled !== false);
        }
      })
      .catch((err) => console.error('Failed to load sheet config:', err));
  }, []);

  // Status badge styling
  const getStatusBadge = (status: TrialClassStatus) => {
    switch (status) {
      case 'طلب تجربة مكتمل (بانتظار التأكيد)':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'طلب تجربة غير مكتمل (يحتاج استكمال بيانات)':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'حصة تجريبية مؤكدة':
        return 'bg-emerald-600/25 text-emerald-200 border-emerald-400/40 font-bold';
      case 'بانتظار مكالمة الإشراف':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'تم تحديد موعد الحصة':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'حضر الحصة التجريبية':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'تم الاشتراك والدفع':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'لم يرد / مؤجل':
        return 'bg-slate-700 text-slate-300 border-slate-600';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phoneNumber.includes(searchTerm) ||
      (lead.interestedCourse && lead.interestedCourse.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.supervisorNotes && lead.supervisorNotes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'high_priority'
        ? lead.isHighPriority
        : lead.trialStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export directly from client to .xlsx with exact 10 columns
  const handleClientExportExcel = () => {
    setIsExporting(true);
    try {
      const rows = filteredLeads.map((lead) => ({
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

      XLSX.writeFile(workbook, `Thakerli_Academy_Leads_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Export CSV (.csv)
  const handleClientExportCsv = () => {
    window.open('/api/leads/export-csv', '_blank');
  };

  // Import existing sheet file
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportNotice(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      if (!rows || rows.length === 0) {
        setImportNotice('الملف فارغ أو لا يحتوي على صفوف بيانات.');
        return;
      }

      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const json = await res.json();
      if (json.success) {
        setImportNotice(`✅ ${json.message}`);
        await onRefreshData();
      } else {
        setImportNotice(`❌ فشل الاستيراد: ${json.error}`);
      }
    } catch (err: any) {
      console.error('File import failed:', err);
      setImportNotice(`❌ خطأ في معالجة الملف: ${err.message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setImportNotice(null), 5000);
    }
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const handleSaveNotes = async (leadId: string) => {
    await onUpdateLead(leadId, { supervisorNotes: tempNotes });
    setEditingNotesId(null);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingModalLead) return;
    await onUpdateLead(schedulingModalLead.id, {
      trialStatus: 'تم تحديد موعد الحصة',
      trialDate: trialDateInput || 'تم التحديد مع العميل',
      assignedSupervisor: trialSupervisorInput,
      supervisorNotes: (schedulingModalLead.supervisorNotes || '') + ` [تم تحديد الموعد: ${trialDateInput}]`,
    });
    setSchedulingModalLead(null);
  };

  // Google Authentication Handlers
  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setSyncFeedback(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        setSyncFeedback({
          type: 'success',
          message: `✅ تم تسجيل الدخول بنجاح بحساب Google (${res.user.email})! جاهز للربط بالشيت.`,
        });
      }
    } catch (err: any) {
      setSyncFeedback({ type: 'error', message: err.message || 'فشل تسجيل الدخول بحساب Google' });
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleLogout();
    setGoogleUser(null);
    setGoogleToken(null);
    setSyncFeedback({ type: 'success', message: 'تم تسجيل الخروج من حساب Google بنجاح' });
  };

  // Direct Test Connection to Google Sheet
  const handleDirectTestSync = async () => {
    const sheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!sheetId) {
      setSyncFeedback({ type: 'error', message: 'الرجاء إدخال رابط شيت Google Sheets صحيح أو معرف الشيت' });
      return;
    }

    let token = googleToken;
    if (!token) {
      try {
        const res = await googleSignIn();
        if (res) {
          token = res.accessToken;
          setGoogleUser(res.user);
          setGoogleToken(token);
        }
      } catch (e: any) {
        setSyncFeedback({ type: 'error', message: 'يرجى تسجيل الدخول بحساب Google أولاً لتفويض تعديل الشيت' });
        return;
      }
    }

    if (!token) {
      setSyncFeedback({ type: 'error', message: 'لم يتم العثور على صلاحية الوصول للشيت' });
      return;
    }

    setIsTestingSync(true);
    setSyncFeedback(null);
    try {
      // 1. Verify sheet access and ensure header row
      const setup = await verifyAndSetupGoogleSheet(sheetId, token);
      if (!setup.success) {
        throw new Error(setup.error);
      }
      setSheetTitle(setup.title);

      // 2. Append test row
      const testRow = [
        'عميل تجريبي (اختبار الربط المباشر)',
        '+966 50 123 4567',
        'دورة احتراف اللغة الإنجليزية',
        'بانتظار مكالمة الإشراف',
        'غداً 7:00 مساءً',
        'أ. مريم السالم',
        'تم إرسال هذا السطر تلقائياً للتأكد من نجاح ربط الشات بوت بشيت الإكسيل المباشر ✅',
        new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA'),
        'أولوية عاجلة 🔥',
        'اختبار الرابط المباشر',
      ];

      const appendRes = await appendRowToGoogleSheet(sheetId, testRow, token, setup.firstSheetName);
      if (!appendRes.success) {
        throw new Error(appendRes.error);
      }

      // 3. Update backend state
      await fetch('/api/sheets/update-sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetUrl,
          spreadsheetId: sheetId,
          sheetTitle: setup.title,
          status: 'success',
          message: `تم التحقق بنجاح من الشيت [${setup.title}] وإرسال السطر التجريبي`,
          totalSyncedRows: leads.length + 1,
        }),
      });

      const cfgRes = await fetch('/api/sheet-config');
      const cfgData = await cfgRes.json();
      if (cfgData.success) setSheetConfig(cfgData.data);

      setSyncFeedback({
        type: 'success',
        message: `🎉 تم الاتصال بنجاح بالشيت [${setup.title}]! تم تنسيق الأعمدة العشرة تلقائياً وإضافة السطر التجريبي فوراً.`,
      });
    } catch (err: any) {
      console.error('Direct test error:', err);
      setSyncFeedback({
        type: 'error',
        message: err.message || 'فشل الاتصال بالشيت. تأكد من صحة الرابط وأن حساب جوجل يمتلك صلاحية المحرر (Editor).',
      });
    } finally {
      setIsTestingSync(false);
    }
  };

  // Direct Sync All Existing Leads to Google Sheet
  const handleDirectSyncAll = async () => {
    const sheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!sheetId) {
      setSyncFeedback({ type: 'error', message: 'الرجاء إدخال رابط شيت Google Sheets أولاً' });
      return;
    }

    let token = googleToken;
    if (!token) {
      try {
        const res = await googleSignIn();
        if (res) {
          token = res.accessToken;
          setGoogleUser(res.user);
          setGoogleToken(token);
        }
      } catch (e: any) {
        setSyncFeedback({ type: 'error', message: 'يرجى تسجيل الدخول بحساب Google أولاً لمزامنة البيانات' });
        return;
      }
    }

    if (!token) return;

    setIsSyncingAll(true);
    setSyncFeedback(null);
    try {
      const setup = await verifyAndSetupGoogleSheet(sheetId, token);
      if (!setup.success) {
        throw new Error(setup.error);
      }
      setSheetTitle(setup.title);

      const batchRes = await batchAppendLeadsToGoogleSheet(sheetId, leads, token, setup.firstSheetName);
      if (!batchRes.success) {
        throw new Error(batchRes.error);
      }

      await fetch('/api/sheets/update-sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetUrl,
          spreadsheetId: sheetId,
          sheetTitle: setup.title,
          status: 'success',
          message: `تمت مزامنة جميع العملاء (${batchRes.count} عميل) مع الشيت بنجاح`,
          totalSyncedRows: batchRes.count,
        }),
      });

      const cfgRes = await fetch('/api/sheet-config');
      const cfgData = await cfgRes.json();
      if (cfgData.success) setSheetConfig(cfgData.data);

      setSyncFeedback({
        type: 'success',
        message: `🎉 تمت مزامنة جميع العملاء (${batchRes.count} عميل) بنجاح إلى شيت [${setup.title}]!`,
      });
    } catch (err: any) {
      console.error('Direct sync all error:', err);
      setSyncFeedback({ type: 'error', message: err.message || 'فشلت المزامنة المجمعة مع الشيت' });
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Save Direct Sheet Configuration
  const handleSaveSheetConfig = async () => {
    const sheetId = extractSpreadsheetId(spreadsheetUrl);
    try {
      const res = await fetch('/api/sheet-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetUrl,
          spreadsheetId: sheetId || '',
          sheetTitle: sheetTitle || sheetConfig?.sheetTitle || '',
          autoSyncEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSheetConfig(data.data);
        setSyncFeedback({
          type: 'success',
          message: '✅ تم حفظ وتفعيل إعدادات ربط شيت Google Sheets المباشر بنجاح!',
        });
        setTimeout(() => {
          setSyncFeedback(null);
          setGoogleSheetsModalOpen(false);
        }, 1500);
      }
    } catch (err: any) {
      setSyncFeedback({ type: 'error', message: err.message || 'فشل حفظ الإعدادات' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner & Sync Status */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 p-6 rounded-3xl border border-emerald-500/30 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileSpreadsheet className="w-6 h-6" />
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                شيت إكسيل متابعة العملاء وحجز الحصص التجريبية
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  مربوط بالشات بوت
                </span>
              </h2>
            </div>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              يسجل هذا الشيت تلقائياً كل عميل يراسل البوت عبر الواتساب بالمطابقة مع الأعمدة العشرة المحددة. يمكنك تصدير الملف كـ Excel (.xlsx) أو CSV أو ربطه فورياً برابط شيت Google Sheets مباشر!
            </p>

            {/* Live Connection Tag */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
              {sheetConfig?.spreadsheetUrl || sheetConfig?.spreadsheetId ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="font-bold">Google Sheets: مربوط برابط مباشر {sheetConfig.sheetTitle ? `[${sheetConfig.sheetTitle}]` : ''}</span>
                  <span className="text-[11px] text-slate-400">({sheetConfig.totalSyncedRows || leads.length} عميل مسجل)</span>
                  {sheetConfig.spreadsheetUrl && (
                    <a
                      href={sheetConfig.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-200 underline flex items-center gap-1 font-semibold mr-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>فتح الشيت</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>المزامنة السحابية: جاهز للربط بلينك شيت Google Sheets المباشر</span>
                </div>
              )}

              {sheetConfig?.lastSyncAt && (
                <span className="text-slate-400 text-[11px]">
                  آخر مزامنة: {sheetConfig.lastSyncAt}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Hidden file input for import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              title="استيراد شيت إكسيل أو CSV وإضافته للبوت"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>{isImporting ? 'جاري الاستيراد...' : 'استيراد شيت'}</span>
            </button>

            <button
              onClick={handleClientExportExcel}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تحميل إكسيل (.xlsx)</span>
            </button>

            <button
              onClick={handleClientExportCsv}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
              title="تحميل كملف CSV باللغة العربية UTF-8"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => {
                setSyncFeedback(null);
                setGoogleSheetsModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-blue-400" />
              <span>ربط ومزامنة Google Sheets</span>
            </button>

            {onNavigateToRouting && (
              <button
                onClick={onNavigateToRouting}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs sm:text-sm font-semibold transition cursor-pointer"
                title="إدارة وتعديل أرقام واتساب إشراف المناهج والكورسات"
              >
                <PhoneCall className="w-4 h-4 text-teal-400" />
                <span>أرقام توجيه الواتساب (مناهج / كورسات)</span>
              </button>
            )}

            <button
              onClick={onRefreshData}
              title="تحديث البيانات لحظياً"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Import notice toast */}
        {importNotice && (
          <div className="mt-3 p-3 rounded-xl bg-slate-800/90 border border-emerald-500/40 text-xs text-emerald-300 font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{importNotice}</span>
          </div>
        )}
      </div>

      {/* Supervisory KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/70">
          <span className="text-xs text-slate-400 block mb-1">إجمالي العملاء في الشيت</span>
          <p className="text-2xl font-black text-white">{leads.length} <span className="text-xs font-normal text-slate-400">عميل</span></p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
          <span className="text-xs text-amber-300 block mb-1 font-semibold">بانتظار مكالمة الإشراف</span>
          <p className="text-2xl font-black text-amber-400">
            {leads.filter((l) => l.trialStatus === 'بانتظار مكالمة الإشراف').length}{' '}
            <span className="text-xs font-normal text-amber-300">مطلوب الاتصال بهم</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30">
          <span className="text-xs text-blue-300 block mb-1 font-semibold">تم تحديد موعد الحصة</span>
          <p className="text-2xl font-black text-blue-400">
            {leads.filter((l) => l.trialStatus === 'تم تحديد موعد الحصة').length}{' '}
            <span className="text-xs font-normal text-blue-300">محجوز لهم زووم</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
          <span className="text-xs text-emerald-300 block mb-1 font-semibold">حضر الحصة / اشترك</span>
          <p className="text-2xl font-black text-emerald-400">
            {leads.filter((l) => l.trialStatus === 'حضر الحصة التجريبية' || l.trialStatus === 'تم الاشتراك والدفع').length}{' '}
            <span className="text-xs font-normal text-emerald-300">ناجح ومسجل</span>
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم العميل، رقم الواتساب، المادة/الكورس، أو ملاحظات الإشراف..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            الكل ({leads.length})
          </button>

          <button
            onClick={() => setStatusFilter('بانتظار مكالمة الإشراف')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'بانتظار مكالمة الإشراف'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-900 text-amber-300/80 hover:text-amber-200'
            }`}
          >
            بانتظار المكالمة ({leads.filter((l) => l.trialStatus === 'بانتظار مكالمة الإشراف').length})
          </button>

          <button
            onClick={() => setStatusFilter('تم تحديد موعد الحصة')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'تم تحديد موعد الحصة'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-blue-300/80 hover:text-blue-200'
            }`}
          >
            تم التحديد ({leads.filter((l) => l.trialStatus === 'تم تحديد موعد الحصة').length})
          </button>

          <button
            onClick={() => setStatusFilter('حضر الحصة التجريبية')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'حضر الحصة التجريبية'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-emerald-300/80 hover:text-emerald-200'
            }`}
          >
            حضر الحصة ({leads.filter((l) => l.trialStatus === 'حضر الحصة التجريبية').length})
          </button>

          <button
            onClick={() => setStatusFilter('high_priority')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'high_priority'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-900 text-rose-300/80 hover:text-rose-200'
            }`}
          >
            أولوية عاجلة 🔥 ({leads.filter((l) => l.isHighPriority).length})
          </button>
        </div>
      </div>

      {/* Main Spreadsheet Table - Matching the Exact 10 Headers */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs sm:text-[13px]">
            {/* Table Header with the Exact 10 columns */}
            <thead>
              <tr className="bg-slate-800/95 text-slate-300 border-b border-slate-700/80 font-bold select-none whitespace-nowrap">
                <th className="py-3 px-3 w-10 text-center text-slate-400">#</th>
                <th className="py-3 px-4 min-w-[170px]">اسم العميل</th>
                <th className="py-3 px-4 min-w-[180px]">رقم الهاتف (واتساب)</th>
                <th className="py-3 px-4 min-w-[200px]">المادة/الكورس</th>
                <th className="py-3 px-4 min-w-[210px]">حالة الحصة التجريبية</th>
                <th className="py-3 px-4 min-w-[200px]">موعد الحصة التجريبية</th>
                <th className="py-3 px-4 min-w-[160px]">المشرف المكلف</th>
                <th className="py-3 px-4 min-w-[260px]">ملاحظات الإشراف والمكالمة</th>
                <th className="py-3 px-4 min-w-[140px]">تاريخ أول رسالة</th>
                <th className="py-3 px-3 min-w-[110px] text-center">مستوى الأولوية</th>
                <th className="py-3 px-3 min-w-[120px] text-center">مصدر العميل</th>
                <th className="py-3 px-3 text-center min-w-[130px]">إجراءات فورية</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    لا يوجد عملاء يطابقون خيارات البحث الحالية.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, index) => {
                  const isEditingNotes = editingNotesId === lead.id;

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      {/* 1. # Index */}
                      <td className="py-3.5 px-3 text-center font-mono text-slate-500">
                        {index + 1}
                      </td>

                      {/* 2. اسم العميل */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={lead.avatar}
                            alt={lead.customerName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{lead.customerName}</span>
                              {lead.isHighPriority && (
                                <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded font-black border border-rose-500/30">
                                  🔥 عاجل
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. رقم الهاتف (واتساب) */}
                      <td className="py-3.5 px-4 font-mono text-slate-200">
                        <div className="flex items-center gap-2">
                          <span dir="ltr">{lead.phoneNumber}</span>
                          <button
                            onClick={() => handleCopyPhone(lead.phoneNumber)}
                            title="نسخ الرقم"
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                          >
                            {copiedPhone === lead.phoneNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 4. المادة/الكورس */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-200">
                          {lead.interestedCourse || 'استفسار عام'}
                        </span>
                      </td>

                      {/* 5. حالة الحصة التجريبية */}
                      <td className="py-3.5 px-4">
                        <select
                          value={lead.trialStatus || 'بانتظار مكالمة الإشراف'}
                          onChange={(e) =>
                            onUpdateLead(lead.id, { trialStatus: e.target.value as TrialClassStatus })
                          }
                          className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer focus:outline-none bg-slate-900 ${getStatusBadge(
                            lead.trialStatus || 'بانتظار مكالمة الإشراف'
                          )}`}
                        >
                          <option value="بانتظار مكالمة الإشراف">⏳ بانتظار مكالمة الإشراف</option>
                          <option value="تم تحديد موعد الحصة">📅 تم تحديد موعد الحصة</option>
                          <option value="حضر الحصة التجريبية">✅ حضر الحصة التجريبية</option>
                          <option value="تم الاشتراك والدفع">🎉 تم الاشتراك والدفع</option>
                          <option value="لم يرد / مؤجل">📞 لم يرد / مؤجل</option>
                        </select>
                      </td>

                      {/* 6. موعد الحصة التجريبية */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <input
                            type="text"
                            defaultValue={lead.trialDate || 'بانتظار التنسيق مع العميل'}
                            onBlur={(e) =>
                              onUpdateLead(lead.id, { trialDate: e.target.value })
                            }
                            className="w-full bg-transparent border-b border-dashed border-slate-700 hover:border-slate-500 py-1 text-slate-300 text-xs focus:outline-none focus:border-blue-400"
                          />
                        </div>
                      </td>

                      {/* 7. المشرف المكلف */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <input
                            type="text"
                            defaultValue={lead.assignedSupervisor || 'بانتظار التكليف'}
                            onBlur={(e) =>
                              onUpdateLead(lead.id, { assignedSupervisor: e.target.value })
                            }
                            className="w-full bg-transparent border-b border-dashed border-slate-700 hover:border-slate-500 py-1 text-slate-300 text-xs focus:outline-none focus:border-blue-400"
                          />
                          <div className="flex items-center gap-1.5 text-[10px]">
                            {lead.dispatchedToSupervisor ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                <Check className="w-3 h-3" />
                                <span>أُرسل للواتساب</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-400/90 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                <Clock className="w-2.5 h-2.5" />
                                <span>بانتظار الإرسال</span>
                              </span>
                            )}
                            <span className="text-slate-400">
                              {lead.leadCategory === 'مناهج دراسية' ? '📚 مناهج' : '🎓 كورسات'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 8. ملاحظات الإشراف والمكالمة */}
                      <td className="py-3.5 px-4">
                        {isEditingNotes ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={tempNotes}
                              onChange={(e) => setTempNotes(e.target.value)}
                              placeholder="أدخل الملاحظة..."
                              className="w-full bg-slate-800 border border-emerald-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveNotes(lead.id)}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                              title="حفظ الملاحظة"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="p-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 cursor-pointer"
                              title="إلغاء"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingNotesId(lead.id);
                              setTempNotes(lead.supervisorNotes || '');
                            }}
                            className="cursor-pointer group-hover:text-white flex items-center justify-between gap-1 text-slate-300"
                            title="انقر لتعديل ملاحظة الإشراف"
                          >
                            <span className="line-clamp-2 text-xs">
                              {lead.supervisorNotes || (
                                <span className="text-slate-500 italic">انقر لإضافة ملاحظة اتصال...</span>
                              )}
                            </span>
                            <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 shrink-0 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        )}
                      </td>

                      {/* 9. تاريخ أول رسالة */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {lead.createdAt || lead.lastMessageTime || 'اليوم'}
                      </td>

                      {/* 10. مستوى الأولوية */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => onUpdateLead(lead.id, { isHighPriority: !lead.isHighPriority })}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                            lead.isHighPriority
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {lead.isHighPriority ? 'عاجل 🔥' : 'عادي'}
                        </button>
                      </td>

                      {/* 11. مصدر العميل */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                          {lead.leadSource || 'واتساب بيزنس'}
                        </span>
                      </td>

                      {/* 12. إجراءات فورية */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Forward / Dispatch to Supervisor WhatsApp */}
                          <button
                            onClick={() => handleDispatchLeadToSupervisor(lead)}
                            disabled={dispatchingLeadId === lead.id}
                            title={
                              lead.dispatchedToSupervisor
                                ? `إعادة إرسال بيانات العميل لواتساب المشرف (${lead.dispatchedToPhone || ''})`
                                : 'إرسال بيانات العميل فوراً لواتساب المشرف (مناهج / كورسات)'
                            }
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              lead.dispatchedToSupervisor
                                ? 'bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border-teal-500/30'
                                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 animate-pulse'
                            }`}
                          >
                            {dispatchingLeadId === lead.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Book Class Quick Modal */}
                          <button
                            onClick={() => {
                              setSchedulingModalLead(lead);
                              setTrialDateInput(lead.trialDate || '');
                              setTrialSupervisorInput(lead.assignedSupervisor || 'أ. مريم السالم');
                            }}
                            title="تحديد موعد الحصة التجريبية"
                            className="p-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 transition cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* Direct Phone Call */}
                          <a
                            href={`tel:${lead.phoneNumber.replace(/[\s+]/g, '')}`}
                            title="اتصال هاتفي مباشر"
                            className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>

                          {/* Open WhatsApp Web directly */}
                          <a
                            href={`https://wa.me/${lead.phoneNumber.replace(/[\s+]/g, '')}?text=${encodeURIComponent(
                              `يا هلا بك يا ${lead.customerName}، معك فريق الإشراف بأكاديمية ذاكرلي بخصوص الحصة التجريبية المجانية 🌟`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="محادثة واتساب مباشرة مع العميل"
                            className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>

                          {/* View in App Simulator */}
                          <button
                            onClick={() => onOpenChatWithLead(lead.id)}
                            title="عرض في المحاكي"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="p-4 bg-slate-800/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span>يتم تحديث هذا الشيت تلقائياً كلما أرسل عميل جديد رسالة للشات بوت على الواتساب.</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>مزامنة مباشرة 100% مع قاعدة بيانات البوت</span>
            </span>
          </div>
        </div>
      </div>

      {/* Schedule Trial Class Modal */}
      {schedulingModalLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span>حجز الحصة التجريبية لـ {schedulingModalLead.customerName}</span>
              </h3>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">رقم الواتساب:</label>
                <input
                  type="text"
                  disabled
                  value={schedulingModalLead.phoneNumber}
                  dir="ltr"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">المادة/الكورس المطلوب:</label>
                <input
                  type="text"
                  disabled
                  value={schedulingModalLead.interestedCourse || 'دورة احتراف اللغة الإنجليزية'}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-slate-300"
                />
              </div>

              <div>
                <label className="block text-blue-300 mb-1 font-semibold">
                  موعد الحصة التجريبية (اليوم والوقت):
                </label>
                <input
                  type="text"
                  required
                  value={trialDateInput}
                  onChange={(e) => setTrialDateInput(e.target.value)}
                  placeholder="مثال: الخميس القادم 23 أكتوبر - 8:00 مساءً"
                  className="w-full bg-slate-800 border border-blue-500/50 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">المشرف المسؤول عن المكالمة والحصة:</label>
                <select
                  value={trialSupervisorInput}
                  onChange={(e) => setTrialSupervisorInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="أ. مريم السالم">أ. مريم السالم (مشرفة القبول)</option>
                  <option value="أ. ناصر الحربي">أ. ناصر الحربي (مسؤول العلاقات والتسجيل)</option>
                  <option value="أ. فهد العتيبي">أ. فهد العتيبي (مشرف الأكاديمية)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition cursor-pointer"
                >
                  تأكيد الحجز وتحديث الشيت
                </button>
                <button
                  type="button"
                  onClick={() => setSchedulingModalLead(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Sheets Direct Link & Sync Modal */}
      {googleSheetsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
                <Share2 className="w-5 h-5 text-emerald-400" />
                <span>ربط ومزامنة Google Sheets برابط مباشر</span>
              </h3>
              <button
                onClick={() => setGoogleSheetsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              تم تحديث طريقة الربط لتصبح <strong>مباشرة عبر رابط Google Sheets</strong> فقط! لا تحتاج لنسخ أو إعداد أي كود برمجي أو Apps Script. فقط الصق رابط الشيت وسجل الدخول بحساب Google.
            </p>

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  syncFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {syncFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <div className="flex-1 leading-relaxed">
                  <span>{syncFeedback.message}</span>
                  {spreadsheetUrl && extractSpreadsheetId(spreadsheetUrl) && (
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-1 text-emerald-400 hover:underline text-[11px] font-bold"
                    >
                      فتح الشيت في Google Sheets للتأكد من البيانات ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Step 1: Direct Google Sheet URL */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                <label className="block text-slate-200 font-bold flex items-center justify-between">
                  <span>الخطوة 1: رابط شيت Google Sheets المباشر</span>
                  <span className="text-[11px] text-emerald-400 font-normal">رابط من المتصفح مباشرة</span>
                </label>
                <input
                  type="url"
                  value={spreadsheetUrl}
                  onChange={(e) => setSpreadsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none transition"
                />

                {/* Spreadsheet ID preview tag */}
                {spreadsheetUrl && (
                  <div className="flex items-center justify-between pt-1">
                    {extractSpreadsheetId(spreadsheetUrl) ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono bg-emerald-950/50 px-2 py-1 rounded-lg border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" />
                        <span>معرّف الشيت: {extractSpreadsheetId(spreadsheetUrl)?.slice(0, 16)}...</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-400">يرجى التأكد من نسخ الرابط كاملاً من شريط المتصفح</span>
                    )}

                    {extractSpreadsheetId(spreadsheetUrl) && (
                      <a
                        href={spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>فتح الرابط في تبويب جديد</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Google Authentication */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
                <label className="block text-slate-200 font-bold flex items-center justify-between">
                  <span>الخطوة 2: صلاحية الربط مع حساب Google</span>
                  {googleUser ? (
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>متصل ومفوض</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400 font-normal">مطلوب لمرة واحدة</span>
                  )}
                </label>

                {googleUser ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30">
                    <div className="flex items-center gap-2.5">
                      {googleUser.photoURL ? (
                        <img src={googleUser.photoURL} alt="" className="w-7 h-7 rounded-full border border-emerald-500/40" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-emerald-600/30 text-emerald-300 flex items-center justify-center font-bold text-xs">
                          G
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-white text-xs leading-none">{googleUser.displayName || 'مستخدم Google'}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{googleUser.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleSignOut}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>تسجيل خروج</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isSigningInGoogle}
                      className="gsi-material-button w-full"
                    >
                      <div className="gsi-material-button-state"></div>
                      <div className="gsi-material-button-content-wrapper">
                        <div className="gsi-material-button-icon">
                          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                          </svg>
                        </div>
                        <span className="gsi-material-button-contents">
                          {isSigningInGoogle ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول بحساب Google لتفعيل الربط المباشر'}
                        </span>
                      </div>
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                      تأكد من اختيار نفس حساب Google الذي يمتلك صلاحية تعديل الشيت.
                    </p>
                  </div>
                )}
              </div>

              {/* Auto Sync Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 border border-slate-700/80">
                <div>
                  <span className="font-bold text-slate-200 block">إرسال العملاء الجدد فورياً للشيت</span>
                  <span className="text-[11px] text-slate-400">إضافة صف جديد في شيت جوجل بمجرد بدء المحادثة مع العميل</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Direct Actions: Test Ping & Sync All */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDirectTestSync}
                  disabled={isTestingSync || !spreadsheetUrl}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isTestingSync ? 'جاري فحص الشيت...' : 'فحص الرابط وإرسال سطر تجريبي'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDirectSyncAll}
                  disabled={isSyncingAll || !spreadsheetUrl}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-50 text-blue-300 border border-blue-500/30 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isSyncingAll ? 'جاري المزامنة...' : `مزامنة كافة العملاء الآن (${leads.length})`}</span>
                </button>
              </div>

              {/* No Apps Script Reassurance Box */}
              <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/30 text-[11px] text-emerald-300 leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تنسيق الأعمدة العشرة يتم تلقائياً:</span>
                </p>
                <p className="text-slate-300 text-[10.5px]">
                  إذا كان الشيت جديداً أو فارغاً، سيقوم النظام تلقائياً بإنشاء وترتيب الأعمدة العشرة (اسم العميل، رقم الواتساب، المادة، حالة الحصة، موعد الحصة، المشرف المكلف، ملاحظات الإشراف، تاريخ أول رسالة، الأولوية، مصدر العميل).
                </p>
              </div>

              {/* Main Submit & Close Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveSheetConfig}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  حفظ وتفعيل
                </button>
                <button
                  type="button"
                  onClick={() => setGoogleSheetsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
