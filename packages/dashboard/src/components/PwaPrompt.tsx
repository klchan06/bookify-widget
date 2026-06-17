import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, Share, Plus, X } from 'lucide-react';

const IOS_HINT_DISMISSED_KEY = 'bg_ios_install_hint_dismissed';

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iphone|ipad|ipod/i.test(ua);
  // iPad op iOS 13+ meldt zich als "Macintosh" maar heeft touch
  const iPadOS = /macintosh/i.test(ua) && 'ontouchend' in document;
  return iOSDevice || iPadOS;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari specifiek
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Beheert twee meldingen onderaan het scherm:
 *  1. Update-banner: een nieuwe versie van de app is geïnstalleerd.
 *  2. iOS install-hint: uitleg hoe je de app op het beginscherm zet
 *     (alleen op iPhone/iPad in Safari, niet wanneer al geïnstalleerd).
 */
export function PwaPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl) {
      // Periodiek checken op updates (elk uur), zodat kappers altijd
      // de nieuwste versie draaien zonder de app te hoeven herstarten.
      if (swUrl) {
        setInterval(
          () => {
            navigator.serviceWorker
              .getRegistration(swUrl)
              .then((reg) => reg?.update())
              .catch(() => {});
          },
          60 * 60 * 1000
        );
      }
    },
  });

  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(IOS_HINT_DISMISSED_KEY) === '1';
    if (isIos() && !isStandalone() && !dismissed) {
      // Kleine vertraging zodat de hint niet meteen bij laden verschijnt
      const t = setTimeout(() => setShowIosHint(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const dismissIosHint = () => {
    localStorage.setItem(IOS_HINT_DISMISSED_KEY, '1');
    setShowIosHint(false);
  };

  return (
    <>
      {/* Update beschikbaar */}
      {needRefresh && (
        <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pointer-events-none">
          <div className="pointer-events-auto animate-slide-up w-full max-w-sm bg-gray-900 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <RefreshCw className="w-5 h-5 flex-shrink-0 text-brand-400" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Nieuwe versie beschikbaar</p>
              <p className="text-gray-300 text-xs">Vernieuw om de laatste updates te laden.</p>
            </div>
            <button
              onClick={() => updateServiceWorker(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-3 py-2 rounded-lg whitespace-nowrap"
            >
              Vernieuwen
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="text-gray-400 hover:text-white p-1"
              aria-label="Sluiten"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS: zet op beginscherm */}
      {showIosHint && (
        <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pointer-events-none">
          <div className="pointer-events-auto animate-slide-up w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">Zet Boekgerust op je beginscherm</p>
                <p className="text-gray-600 text-xs mt-1 leading-relaxed">
                  Tik op <Share className="inline w-3.5 h-3.5 -mt-0.5 text-brand-600" /> (Delen)
                  onderin Safari en kies{' '}
                  <span className="font-medium text-gray-800">
                    &lsquo;Zet op beginscherm&rsquo; <Plus className="inline w-3.5 h-3.5 -mt-0.5" />
                  </span>
                  .
                </p>
              </div>
              <button
                onClick={dismissIosHint}
                className="text-gray-400 hover:text-gray-600 p-1 -mt-1 -mr-1"
                aria-label="Sluiten"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
