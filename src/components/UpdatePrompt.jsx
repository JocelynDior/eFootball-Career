import { useState, useEffect, useCallback } from 'react';

export default function UpdatePrompt() {
  const [state, setState] = useState('idle'); // idle | prompt | downloading | done
  const [sizeBytes, setSizeBytes] = useState(0);
  const [percent, setPercent] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [waitingSW, setWaitingSW] = useState(null);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event) => {
      const { type, bytes, percent: pct, loaded, total } = event.data || {};

      if (type === 'UPDATE_SIZE') {
        setSizeBytes(bytes);
      } else if (type === 'UPDATE_PROGRESS') {
        setPercent(pct);
        setLoadedBytes(loaded);
        if (total) setSizeBytes(total);
      } else if (type === 'UPDATE_COMPLETE') {
        setPercent(100);
        setState('done');
        setTimeout(() => window.location.reload(), 800);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    const checkForUpdate = async () => {
      const reg = await navigator.serviceWorker.ready;

      // If there's already a waiting SW on load (user revisited)
      if (reg.waiting) {
        setWaitingSW(reg.waiting);
        setState('prompt');
      }

      // Listen for new SW installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version ready, waiting for user
            setWaitingSW(newWorker);
            setState('prompt');
          }
        });
      });
    };

    checkForUpdate();

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleUpdate = useCallback(() => {
    setState('downloading');
    setPercent(0);
    // Tell waiting SW to activate
    if (waitingSW) {
      waitingSW.postMessage({ type: 'SKIP_WAITING' });
    }
    // If no progress messages come (small update), reload after short delay
    const fallback = setTimeout(() => window.location.reload(), 4000);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      clearTimeout(fallback);
      window.location.reload();
    }, { once: true });
  }, [waitingSW]);

  const handleDismiss = useCallback(() => {
    setState('idle');
  }, []);

  if (state === 'idle') return null;

  const sizeLabel = formatBytes(sizeBytes);

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99999,
      width: 'min(460px, 90vw)',
      background: 'linear-gradient(135deg, #0a0a2e 0%, #0d0d3b 100%)',
      border: '1px solid rgba(255,20,147,0.35)',
      borderRadius: '16px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,20,147,0.1)',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header stripe */}
      <div style={{
        background: 'linear-gradient(90deg, #FF1493, #8B00FF)',
        height: '3px',
      }} />

      <div style={{ padding: '20px 22px' }}>
        {state === 'prompt' && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
              {/* Icon */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(255,20,147,0.15)',
                border: '1px solid rgba(255,20,147,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '20px',
              }}>
                🚀
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px', lineHeight: 1.3 }}>
                  New version available
                </div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', marginTop: '4px', lineHeight: 1.5 }}>
                  A new version of eFootball Career has been deployed.
                  {sizeLabel && (
                    <> Update size: <span style={{ color: '#FF1493', fontWeight: 600 }}>{sizeLabel}</span></>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleUpdate}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(90deg, #FF1493, #8B00FF)',
                  color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseOver={e => e.target.style.opacity = '0.85'}
                onMouseOut={e => e.target.style.opacity = '1'}
              >
                ✓ Yes, update now
              </button>
              <button
                onClick={handleDismiss}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
              >
                ✕ Not now
              </button>
            </div>
          </>
        )}

        {state === 'downloading' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(255,20,147,0.15)',
                border: '1px solid rgba(255,20,147,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '20px',
              }}>
                ⬇️
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>
                  Updating…
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '2px' }}>
                  {sizeLabel
                    ? `${formatBytes(loadedBytes) || '0 B'} of ${sizeLabel}`
                    : 'Downloading new version…'
                  }
                </div>
              </div>
              <div style={{
                marginLeft: 'auto',
                color: '#FF1493', fontWeight: 800, fontSize: '18px',
              }}>
                {percent}%
              </div>
            </div>

            {/* Progress bar */}
            <div style={{
              height: '6px', borderRadius: '99px',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${percent}%`,
                background: 'linear-gradient(90deg, #FF1493, #8B00FF)',
                borderRadius: '99px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </>
        )}

        {state === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '28px' }}>✅</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Update complete!</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '2px' }}>
                Reloading the app…
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
