import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DotMatrixText } from '@/components/DotMatrixText';
import { API_BASE_URL, waitForBackend, warmBackend } from '@/lib/backend';
import nebulaVideo from '@/assets/shattered_nebula_orb_remix.webm';

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
    navigate(debateUrl);
  }, [debateUrl, navigate, query]);

  const handleRetry = () => {
    setRetryKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <video
        className="absolute inset-0 h-full w-full object-cover object-center"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={nebulaVideo} type="video/webm" />
      </video>
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

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

          <div className="border border-white/20 bg-[rgba(15,15,15,0.75)] backdrop-blur-[10px] px-6 py-6 space-y-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <p className="text-sm text-white/85">{status}</p>
            <div className="flex items-center justify-center gap-3 text-[11px] text-white/50 font-mono uppercase tracking-[0.3em]">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#F15A29]" />
              <span>Attempt {attempt || 1}</span>
            </div>
            <p className="text-[11px] text-white/45 font-mono">
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
