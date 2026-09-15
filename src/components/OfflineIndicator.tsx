import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      id="offline-banner"
      className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600/95 px-3.5 py-2.5 text-xs font-medium text-white shadow-xl backdrop-blur-sm border border-amber-400/30 animate-bounce"
    >
      <WifiOff className="w-4 h-4 shrink-0 text-amber-200" />
      <div>
        <p className="font-semibold leading-tight">Offline Mode</p>
        <p className="text-[11px] text-amber-100">Changes are saved locally on your device and will sync.</p>
      </div>
    </div>
  );
};
