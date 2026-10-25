import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ChatLead } from '../types';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google Auth Provider with Google Sheets full edit scope
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

// Cache the access token in memory only (never localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const SHEET_COLUMNS = [
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

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token was cleared or expired in memory; user needs re-auth for Sheets API access
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google using popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم يتم استلام رمز الوصول (Access Token) من حساب Google');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setMemoryAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Extracts the Google Spreadsheet ID from a URL or raw ID.
 * Supports:
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 * - 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 */
export function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If user pasted bare ID (alphanumeric with hyphens/underscores, usually 25-60 chars)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Verifies spreadsheet access and automatically creates the 10 headers if sheet is empty
 */
export async function verifyAndSetupGoogleSheet(
  spreadsheetId: string,
  token: string
): Promise<{ success: boolean; title: string; firstSheetName: string; error?: string }> {
  try {
    // 1. Fetch metadata to get title and first sheet name
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!metaRes.ok) {
      const errJson = await metaRes.json().catch(() => ({}));
      const msg = errJson.error?.message || `خطأ استجابة Google Sheets (HTTP ${metaRes.status})`;
      if (metaRes.status === 404) {
        throw new Error('لم يتم العثور على الشيت! تأكد من نسخ رابط شيت جوجل بشكل صحيح.');
      } else if (metaRes.status === 403) {
        throw new Error('ليس لديك صلاحية تعديل هذا الشيت. تأكد من أن حساب جوجل المسجل يمتلك صلاحية المحرر (Editor) على الملف.');
      }
      throw new Error(msg);
    }

    const metaData = await metaRes.json();
    const title = metaData.properties?.title || 'Google Sheet';
    const firstSheetName = metaData.sheets?.[0]?.properties?.title || 'Sheet1';

    // 2. Check if Row 1 has headers
    const checkRange = `${encodeURIComponent(firstSheetName)}!A1:J1`;
    const readRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${checkRange}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (readRes.ok) {
      const readData = await readRes.json();
      const hasValues = readData.values && readData.values.length > 0 && readData.values[0].length > 0;

      // If sheet has no header row, automatically insert our 10 columns!
      if (!hasValues) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
            firstSheetName
          )}!A1:J1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${firstSheetName}!A1:J1`,
              majorDimension: 'ROWS',
              values: [SHEET_COLUMNS],
            }),
          }
        );
      }
    }

    return {
      success: true,
      title,
      firstSheetName,
    };
  } catch (err: any) {
    console.error('Verify sheet error:', err);
    return {
      success: false,
      title: '',
      firstSheetName: '',
      error: err.message || 'فشل فحص شيت جوجل',
    };
  }
}

/**
 * Appends a lead or test row directly to the user's Google Sheet
 */
export async function appendRowToGoogleSheet(
  spreadsheetId: string,
  rowData: string[],
  token: string,
  sheetName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetRange = sheetName ? `${encodeURIComponent(sheetName)}!A1` : 'A1';
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${targetRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          majorDimension: 'ROWS',
          values: [rowData],
        }),
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `HTTP ${res.status}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Append row error:', err);
    return { success: false, error: err.message || 'فشلت إضافة السطر إلى الشيت' };
  }
}

/**
 * Converts a ChatLead to the exact 10 columns of the Academy Google Sheet
 */
export function formatLeadRow(lead: ChatLead): string[] {
  return [
    lead.customerName || 'عميل واتساب',
    lead.phoneNumber || '',
    lead.interestedCourse || 'استفسار عام',
    lead.trialStatus || 'بانتظار مكالمة الإشراف',
    lead.trialDate || 'بانتظار التنسيق مع العميل',
    lead.assignedSupervisor || 'بانتظار التكليف',
    lead.supervisorNotes || '',
    lead.createdAt || lead.lastMessageTime || new Date().toLocaleString('ar-SA'),
    lead.isHighPriority ? 'أولوية عاجلة 🔥' : 'عادي',
    lead.leadSource || 'واتساب بيزنس',
  ];
}

/**
 * Syncs multiple leads to the Google Sheet in a single batch
 */
export async function batchAppendLeadsToGoogleSheet(
  spreadsheetId: string,
  leads: ChatLead[],
  token: string,
  sheetName?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!leads.length) return { success: true, count: 0 };
    const rows = leads.map(formatLeadRow);
    const targetRange = sheetName ? `${encodeURIComponent(sheetName)}!A1` : 'A1';

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${targetRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          majorDimension: 'ROWS',
          values: rows,
        }),
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `HTTP ${res.status}`);
    }

    return { success: true, count: rows.length };
  } catch (err: any) {
    console.error('Batch append error:', err);
    return { success: false, count: 0, error: err.message || 'فشلت المزامنة المجمعة' };
  }
}
