import type { ConsultationSession, SessionStorageData } from '@/types/session';

const STORAGE_KEY = 'mindglass-sessions';
const MAX_SESSIONS = 20; // Keep last 20 sessions

/**
 * Load all saved sessions from localStorage
 */
export function loadSessions(): SessionStorageData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return { sessions: [], currentSessionId: null };
    }
    return JSON.parse(data) as SessionStorageData;
  } catch (error) {
    console.error('Failed to load sessions from localStorage:', error);
    return { sessions: [], currentSessionId: null };
  }
}

/**
 * Save sessions to localStorage
 */
export function saveSessions(data: SessionStorageData): void {
  try {
    // Trim to max sessions (keep most recent)
    if (data.sessions.length > MAX_SESSIONS) {
      data.sessions = data.sessions
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_SESSIONS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save sessions to localStorage:', error);
  }
}

/**
 * Save or update a single session
 */
export function saveSession(session: ConsultationSession): void {
  const data = loadSessions();
  const existingIndex = data.sessions.findIndex(s => s.id === session.id);
  
  if (existingIndex >= 0) {
    data.sessions[existingIndex] = session;
  } else {
    data.sessions.unshift(session);
  }
  
  data.currentSessionId = session.id;
  saveSessions(data);
}

/**
 * Get a specific session by ID
 */
export function getSession(sessionId: string): ConsultationSession | null {
  const data = loadSessions();
  return data.sessions.find(s => s.id === sessionId) || null;
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): void {
  const data = loadSessions();
  data.sessions = data.sessions.filter(s => s.id !== sessionId);
  if (data.currentSessionId === sessionId) {
    data.currentSessionId = null;
  }
  saveSessions(data);
}

/**
 * Get the current active session ID
 */
export function getCurrentSessionId(): string | null {
  const data = loadSessions();
  return data.currentSessionId;
}

/**
 * Set the current active session
 */
export function setCurrentSessionId(sessionId: string | null): void {
  const data = loadSessions();
  data.currentSessionId = sessionId;
  saveSessions(data);
}

/**
 * Format a timestamp for display
 */
export function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
