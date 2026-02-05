import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DotMatrixText } from '@/components/DotMatrixText';
import { RainbowMatrixShader } from '@/components/ui/rainbow-matrix-shader';
import { API_BASE_URL, waitForBackend, warmBackend } from '@/lib/backend';

export function BackendWakePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Warming up the debate engine…');
  const [attempt, setAttempt] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const query = searchParams.get('q') || '';
  const model = searchParams.get('model') || 'pro';
  const agents = searchParams.get('agents') || '';
  const industry = searchParams.get('industry') || '';
  const sessionId = searchParams.get('session') || '';

  const debateUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (model) params.set('model', model);
    if (agents) params.set('agents', agents);
    if (industry) params.set('industry', industry);
    if (sessionId) params.set('session', sessionId);
    return `/debate?${params.toString()}`;
  }, [query, model, agents, industry, sessionId]);

  useEffect(() => {
    if (!query) return;

    let isMounted = true;
    const controller = new AbortController();

    warmBackend();

    setTimedOut(false);
    setStatus('Warming up the debate engine…');
    setAttempt(0);

    waitForBackend({
      timeoutMs: 120_000,
      intervalMs: 2_000,
      signal: controller.signal,
      onAttempt: (n) => {
        if (!isMounted) return;
        setAttempt(n);
        setStatus(n < 3 ? 'Starting the debate engine…' : 'Still waking up…');
      },
    })
      .then((ready) => {
        if (!isMounted) return;
        if (ready) {
          setStatus('Backend ready. Launching debate…');
          navigate(debateUrl);
        } else {
          setTimedOut(true);
          setStatus('Backend is taking longer than usual.');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setTimedOut(true);
        setStatus('Backend is taking longer than usual.');
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [debateUrl, navigate, query, retryKey]);

  const handleRetry = () => {
    setRetryKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      <RainbowMatrixShader />

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-24">
        <div className="w-full max-w-xl space-y-8 text-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <DotMatrixText
                text="PRISM"
                dotWidth={14}
                dotHeight={12}
                dotGap={4}
                letterGap={20}
                revealDelay={20}
                activeColor="#ffffff"
                inactiveColor="rgba(255,255,255,0.08)"
              />
            </div>
            <p className="text-xs text-white/50 font-mono uppercase tracking-wider">
              Activating your debate session
            </p>
          </div>

          <div className="border border-white/15 bg-[rgba(38,38,38,0.8)] backdrop-blur-[12px] px-6 py-6 space-y-4">
            <p className="text-sm text-white/80">{status}</p>
            <div className="flex items-center justify-center gap-2 text-[11px] text-white/40 font-mono uppercase tracking-widest">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#F15A29]" />
              <span>Attempt {attempt || 1}</span>
            </div>
            <p className="text-[11px] text-white/40 font-mono">
              Pinging {API_BASE_URL}/api/health
            </p>
          </div>

          {timedOut && (
            <div className="space-y-3">
              <p className="text-xs text-white/50 font-mono">
                The server is still waking up. You can retry or go back.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 border border-white/20 text-white/70 text-xs font-mono uppercase tracking-wider hover:bg-white/5 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 border border-white/10 text-white/40 text-xs font-mono uppercase tracking-wider hover:text-white/70 transition-colors"
                >
                  Back Home
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
