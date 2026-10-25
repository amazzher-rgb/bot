import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Smartphone, RefreshCw, CheckCircle2, ShieldCheck, Laptop } from 'lucide-react';
import { WhatsAppState } from '../types';

interface WhatsAppQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappState: WhatsAppState | null;
  onRefreshQr: () => Promise<void>;
  onConfirmScan: () => Promise<void>;
  onNavigateToSimulator: () => void;
}

export const WhatsAppQrModal: React.FC<WhatsAppQrModalProps> = ({
  isOpen,
  onClose,
  whatsappState,
  onRefreshQr,
  onConfirmScan,
  onNavigateToSimulator,
}) => {
  const [clientQrUrl, setClientQrUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !whatsappState?.qrCodeUrl) {
      QRCode.toDataURL(`2@${Date.now()},companion_modal,zakirly`, {
        width: 260,
        margin: 1,
        color: { dark: '#0b141a', light: '#ffffff' },
      })
        .then(setClientQrUrl)
        .catch(console.error);
    }
  }, [isOpen, whatsappState?.qrCodeUrl]);

  if (!isOpen) return null;

  const isConnected = whatsappState?.status === 'connected';
  const activeQr = whatsappState?.qrCodeUrl || clientQrUrl;


  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1 pt-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
            <QrCode className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">
            رمز ربط واتساب بيزنس كجهاز مصاحب
          </h3>
          <p className="text-xs text-slate-400">
            امسح الرمز من هاتفك: واتساب &gt; الأجهزة المرتبطة &gt; ربط جهاز
          </p>
        </div>

        {/* Content */}
        {isConnected ? (
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <div>
              <h4 className="text-base font-bold text-white">متصل كجهاز مصاحب رسمي</h4>
              <p className="text-xs text-slate-300 mt-1" dir="ltr">
                {whatsappState?.pairedPhone || 'WhatsApp Business Connected'}
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onNavigateToSimulator();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              الانتقال للمحادثات الحية
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            {/* The QR Box */}
            <div className="p-4 bg-white rounded-3xl shadow-xl relative border-4 border-emerald-500/30">
              {activeQr ? (
                <div className="flex flex-col items-center">
                  <img
                    src={activeQr}
                    alt="WhatsApp Companion QR"
                    className="w-60 h-60 object-contain block select-none"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              ) : (
                <div className="w-60 h-60 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                  <span className="text-xs">جاري تجهيز الرمز...</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="w-full space-y-2">
              <button
                onClick={onConfirmScan}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد ومحاكاة الربط السريع الآن</span>
              </button>

              <button
                onClick={onRefreshQr}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer flex items-center justify-center gap-2 border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث رمز الـ QR</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
