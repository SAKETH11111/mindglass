import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function BackendWakePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

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

  return null;
}
