// src/api.ts — single gateway for all API calls
// Handles loading state, toasts (driven by backend message), and error surfacing.
import { toast } from './toast';

const BASE = import.meta.env.VITE_API_URL || '';

async function request<T>(
  url: string,
  options: RequestInit,
  setLoading?: (v: boolean) => void,
): Promise<T> {
  setLoading?.(true);
  try {
    const res = await fetch(`${BASE}${url}`, options);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg: string = json.message || 'Something went wrong.';
      toast(msg, 'error');
      throw new Error(msg);
    }
    return json.data as T;
  } finally {
    setLoading?.(false);
  }
}

export async function postIntake(text: string, setLoading?: (v: boolean) => void) {
  return request<{ requestId: string; parsed: unknown; step: string }>(
    '/api/intake',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) },
    setLoading,
  );
}

export async function postClarify(requestId: string, setLoading?: (v: boolean) => void) {
  return request<{ question: string; options: string[]; dimension: string }>(
    '/api/clarify',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId }) },
    setLoading,
  );
}

export async function postShortlist(requestId: string, answer: string, setLoading?: (v: boolean) => void) {
  return request<{
    needsMoreClarification: boolean;
    nextQuestion: { question: string; options: string[]; dimension: string; questionNumber: number } | null;
    shortlist: import('./types').ShortlistResult | null;
  }>(
    '/api/shortlist',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, answer }) },
    setLoading,
  );
}

export async function postCompare(requestId: string, setLoading?: (v: boolean) => void) {
  return request<{ verdict: string }>(
    '/api/shortlist/compare',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId }) },
    setLoading,
  );
}

export function createSSEConnection(
  requestId: string,
  onEvent: (event: import('./types').StreamEvent) => void,
): EventSource {
  const es = new EventSource(`${BASE}/api/stream/${requestId}`);
  es.addEventListener('status', (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data);
      onEvent(data);
    } catch { /* ignore parse errors */ }
  });
  es.addEventListener('done', () => es.close());
  es.onerror = () => es.close();
  return es;
}
