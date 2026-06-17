import { useState, useEffect, useRef } from 'react';

const LOADING_TIMEOUT = 5000; // 5 seconds

export default function MyBidAdSlot({ bannerId = '2023322', className = '' }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'loaded' | 'failed'

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Observe the ad container for children — MyBid populates it with iframes/scripts
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          setStatus('loaded');
          observer.disconnect();
          return;
        }
      }
    });

    observer.observe(el, { childList: true, subtree: true });

    // Timeout fallback — if nothing rendered after LOADING_TIMEOUT ms, show fallback
    const timer = setTimeout(() => {
      setStatus(prev => prev === 'loading' ? 'failed' : prev);
      observer.disconnect();
    }, LOADING_TIMEOUT);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Loading / fallback placeholder — hidden when ad is loaded */}
      <div
        className={`rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-indigo-50/40 flex items-center justify-center transition-opacity duration-500 ${
          status === 'loaded' ? 'opacity-0 pointer-events-none absolute inset-0' : 'opacity-100'
        }`}
      >
        {status === 'loading' ? (
          <div className="flex items-center gap-2 px-4">
            <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-xs text-gray-400 font-medium">Loading ad…</span>
          </div>
        ) : (
          <div className="text-center px-4">
            <p className="text-[10px] text-gray-300 font-medium tracking-wider uppercase">Advertisement</p>
            <p className="text-[10px] text-gray-200 mt-0.5">Ad unavailable</p>
          </div>
        )}
      </div>

      {/* MyBid ad container — MyBid script populates this div */}
      <div
        ref={containerRef}
        data-banner-id={bannerId}
        className={`w-full ${status === 'failed' ? 'min-h-[60px]' : ''}`}
      />
    </div>
  );
}
