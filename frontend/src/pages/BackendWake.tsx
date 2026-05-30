import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { normalizeModelParam } from '@/lib/models';

export function BackendWakePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('q') || '';
  const model = normalizeModelParam(searchParams.get('model'));
  const agents = searchParams.get('agents') || '';
  const industry = searchParams.get('industry') || '';
  const sessionId = searchParams.get('session') || '';
  const demo = searchParams.get('demo') || '';

  const debateUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (model) params.set('model', model);
    if (agents) params.set('agents', agents);
    if (industry) params.set('industry', industry);
    if (sessionId) params.set('session', sessionId);
    if (demo) params.set('demo', demo);
    return `/debate?${params.toString()}`;
  }, [query, model, agents, industry, sessionId, demo]);

  useEffect(() => {
    if (!query) return;
    navigate(debateUrl);
  }, [debateUrl, navigate, query]);

  return null;
}
