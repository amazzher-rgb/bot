import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  QrCode,
  Sparkles,
  Bot,
  Zap,
  ShieldCheck,
  RefreshCw,
  Power,
  GraduationCap,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  PhoneCall
} from 'lucide-react';
import { WhatsAppState } from '../types';

interface NavbarProps {
  whatsappState: WhatsAppState | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenQrModal: () => void;
  onDisconnect: () => void;
  pendingSupervisionCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  whatsappState,
  activeTab,
  setActiveTab,
  onOpenQrModal,
  onDisconnect,
  pendingSupervisionCount,
}) => {
  const isConnected = whatsappState?.status === 'connected';
  const isConnecting = whatsappState?.status === 'connecting';

  // Movable / Scrollable navigation bar logic
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const scrollStartLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const checkScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    
    // In RTL, scrollLeft can be negative or positive depending on browser implementation
    const maxScroll = scrollWidth - clientWidth;
    const absScrollLeft = Math.abs(scrollLeft);
    
    // Allow small 2px threshold
    const hasOverflow = scrollWidth > clientWidth + 4;
    if (!hasOverflow) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    setCanScrollLeft(absScrollLeft < maxScroll - 4 || scrollLeft > 4);
    setCanScrollRight(absScrollLeft > 4 || scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScrollState();
    const handleResize = () => checkScrollState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScrollState]);

  // Scroll active tab into view when activeTab changes
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement | null;
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
    setTimeout(checkScrollState, 300);
  }, [activeTab, checkScrollState]);

  // Click scroll buttons
  const scrollDirection = (dir: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = dir === 'left' ? -260 : 260;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScrollState, 350);
  };

  // Mouse wheel horizontal scroll conversion
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      el.scrollLeft += e.deltaY;
      checkScrollState();
    }
  };

  // Mouse drag-to-scroll (movable bar)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartXRef.current = e.pageX - el.offsetLeft;
    scrollStartLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragStartXRef.current) * 1.5;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollStartLeftRef.current - walk;
    checkScrollState();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTabClick = (tabId: string) => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    setActiveTab(tabId);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Academy Branding */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-lg shadow-emerald-500/20">
              <Bot className="w-6 h-6" />
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-slate-900 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                  بوت واتساب الأكاديمية الذكي
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden md:inline-flex">
                    جهاز مصاحب Companion
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                مربوط بواتساب بيزنس • رد باللهجة الخليجية • أسعار وعروض متغيرة وفويس نوت
              </p>
            </div>
          </div>

          {/* WhatsApp Companion Status & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Real-time Status Card */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              {isConnected ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="flex flex-col text-right">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      متصل بالواتساب
                    </span>
                    <span className="text-[10px] text-slate-400" dir="ltr">
                      {whatsappState?.pairedPhone || 'WhatsApp Business'}
                    </span>
                  </div>
                </>
              ) : isConnecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-400 font-medium">بانتظار مسح QR...</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-300 font-medium hidden sm:inline">غير مقترن</span>
                </>
              )}
            </div>

            {/* Quick Action Button for QR */}
            {!isConnected ? (
              <button
                onClick={onOpenQrModal}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-600/25 transition active:scale-95 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>ربط الواتساب (QR Code)</span>
              </button>
            ) : (
              <button
                onClick={onDisconnect}
                title="فصل الجهاز المصاحب"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition cursor-pointer"
              >
                <Power className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">فصل الجهاز</span>
              </button>
            )}
          </div>

        </div>

        {/* Movable Navigation Strip with Left/Right Controls and Smooth Drag */}
        <div className="relative border-t border-slate-800/80 py-1.5">
          {/* Scroll Right Button (Next in RTL) */}
          <button
            type="button"
            onClick={() => scrollDirection('right')}
            title="تمرير لليمين"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-slate-800/90 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700/80 shadow-md backdrop-blur-sm transition cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Scroll Left Button (Previous in RTL) */}
          <button
            type="button"
            onClick={() => scrollDirection('left')}
            title="تمرير لليسار"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-slate-800/90 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700/80 shadow-md backdrop-blur-sm transition cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Right edge shadow mask */}
          <div className="absolute right-6 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-slate-900 to-transparent z-10 hidden sm:block" />
          {/* Left edge shadow mask */}
          <div className="absolute left-6 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-r from-slate-900 to-transparent z-10 hidden sm:block" />

          {/* The Scrollable / Movable Container */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScrollState}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`flex items-center gap-1.5 overflow-x-auto px-8 py-1 text-xs sm:text-sm select-none scroll-smooth transition-colors ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            } scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600`}
            style={{ scrollbarWidth: 'thin' }}
          >
            <button
              data-tab="qr-link"
              onClick={() => handleTabClick('qr-link')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap font-medium transition shrink-0 cursor-pointer ${
                activeTab === 'qr-link'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>ربط جهاز مصاحب (QR Code)</span>
            </button>

            <button
              data-tab="chat-simulator"
              onClick={() => handleTabClick('chat-simulator')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap font-medium transition shrink-0 cursor-pointer relative ${
                activeTab === 'chat-simulator'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Smartphone className="w-4 h-4 text-teal-400" />
              <span>محاكي الواتساب والفويس نوت</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-slate-900 font-bold">
                مباشر
              </span>
            </button>

            <button
              data-tab="excel-leads"
              onClick={() => handleTabClick('excel-leads')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap font-medium transition shrink-0 cursor-pointer relative ${
                activeTab === 'excel-leads'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>شيت إكسيل العملاء وحجز الحصص</span>
              {pendingSupervisionCount !== undefined && pendingSupervisionCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black animate-pulse">
                  {pendingSupervisionCount} مطلوب اتصال
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  لوحة الإشراف
                </span>
              )}
            </button>

            <button
              data-tab="supervisor-routing"
              onClick={() => handleTabClick('supervisor-routing')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap font-medium transition shrink-0 cursor-pointer ${
                activeTab === 'supervisor-routing'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-teal-400" />
              <span>توجيه الواتساب (مناهج / كورسات)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                رقمين
              </span>
            </button>



            <button
              data-tab="academy-knowledge"
              onClick={() => handleTabClick('academy-knowledge')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap font-medium transition shrink-0 cursor-pointer ${
                activeTab === 'academy-knowledge'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>داتا المناهج والكورسات المنفصلة</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                2 داتا ON/OFF
              </span>
            </button>

            <button
              data-tab="bot-persona"
              onClick={() => handleTabClick('bot-persona')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap font-medium transition shrink-0 cursor-pointer ${
                activeTab === 'bot-persona'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>السيناريو وسياق الكلام واللهجة</span>
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};

