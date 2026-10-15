import React, { useEffect, useState } from 'react';
import { Download, CheckCircle2, Smartphone, Monitor, X, Share2, PlusSquare } from 'lucide-react';
import { ShopMasterLogo } from './ShopMasterLogo';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const InstallPwaModal: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Listen for Chrome/Edge/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      // Auto-show installation banner if user hasn't dismissed it this session
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPromptBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPromptBanner(false);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowPromptBanner(false);
        setDeferredPrompt(null);
      }
    } else {
      setShowHelpModal(true);
    }
  };

  const handleDismissBanner = () => {
    setShowPromptBanner(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  // If already installed and running standalone, do not show banner
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Toast Notification when app is installed */}
      {installedSuccess && (
        <div className="fixed bottom-5 right-5 z-[100] bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">ShopPOS installed successfully!</span>
        </div>
      )}

      {/* Floating Install Prompt Banner (Clean, unobtrusive bottom pill) */}
      {showPromptBanner && !installedSuccess && (
        <aside
          aria-label="Install ShopPOS app"
          className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[80] w-[92%] max-w-md bg-white/95 backdrop-blur-md border border-blue-200/90 shadow-2xl rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 text-slate-800 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 shrink-0">
              <ShopMasterLogo size={32} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug truncate">
                Install ShopPOS App
              </h2>
              <p className="text-[11px] text-slate-500 leading-tight truncate">
                Faster checkout, offline caching & full screen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismissBanner}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Manual Install Instruction Modal for iOS or Desktop Chrome manual fallback */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative space-y-4">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-1.5 shadow-sm">
                <ShopMasterLogo size={38} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">How to Install ShopPOS</h3>
                <p className="text-xs text-slate-500">Chrome, Safari & Edge Support</p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl text-xs text-slate-700">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  On iOS / iPadOS Safari:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                  <li>
                    Tap the <strong className="text-slate-800">Share</strong> button <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> at bottom/top of Safari.
                  </li>
                  <li>
                    Scroll down and select <strong className="text-slate-800">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" />.
                  </li>
                  <li>Tap <strong>Add</strong> in the top right corner.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl text-xs text-slate-700">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-blue-600" />
                  On Chrome / Edge:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                  <li>Look at the right side of your Chrome URL address bar.</li>
                  <li>
                    Click the <strong className="text-slate-800">Install icon</strong> (computer monitor with download arrow) or click the three dots menu (<strong className="text-slate-800">⋮</strong>).
                  </li>
                  <li>Click <strong className="text-slate-800">Install ShopPOS</strong>.</li>
                </ol>
              </div>
            )}

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-xs tracking-wide cursor-pointer transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
