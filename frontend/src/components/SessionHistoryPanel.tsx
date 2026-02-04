import { useEffect, useRef } from 'react';
import { X, Clock, Trash2, MessageSquare, Plus } from 'lucide-react';
import { useSessionStore } from '@/hooks/useSessionStore';
import { formatSessionDate } from '@/lib/sessionStorage';

interface SessionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  designMode?: 'boxy' | 'round';
}

export function SessionHistoryPanel({
  isOpen,
  onClose,
  onSelectSession,
  onNewSession,
  designMode = 'boxy',
}: SessionHistoryPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  
  const {
    sessionHistory,
    currentSession,
    loadAllSessions,
    deleteSessionById,
  } = useSessionStore();

  // Load sessions when panel opens
  useEffect(() => {
    if (isOpen) {
      loadAllSessions();
    }
  }, [isOpen, loadAllSessions]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const deleteSession = (sessionId: string) => {
    if (confirm('Delete this consultation?')) {
      deleteSessionById(sessionId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          relative w-full max-w-md max-h-[70vh] overflow-hidden
          shadow-2xl shadow-black/50
          animate-in fade-in slide-in-from-top-4 duration-300
          ${designMode === 'boxy'
            ? 'bg-[#111] border-2 border-white/30'
            : 'backdrop-blur-2xl bg-white/5 border border-white/10 rounded-2xl'
          }
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 ${designMode === 'boxy' ? 'border-b-2 border-white/20' : 'border-b border-white/10'}`}>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-white/60" />
            <h2 className={`text-white ${designMode === 'boxy' ? 'font-mono text-sm uppercase tracking-widest' : 'text-lg font-medium'}`}>
              {designMode === 'boxy' ? 'CONSULTATION HISTORY' : 'Consultation History'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 text-white/40 hover:text-white transition-colors ${designMode === 'round' ? 'rounded-lg hover:bg-white/10' : 'hover:bg-white/10'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Session Button */}
        <div className={`p-3 ${designMode === 'boxy' ? 'border-b border-white/10' : 'border-b border-white/5'}`}>
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className={`w-full flex items-center justify-center gap-2 p-3 transition-all ${
              designMode === 'boxy'
                ? 'bg-white text-black font-mono text-xs uppercase tracking-wider hover:bg-white/90'
                : 'bg-white text-black rounded-lg font-medium hover:bg-white/90'
            }`}
          >
            <Plus className="w-4 h-4" />
            {designMode === 'boxy' ? 'NEW CONSULTATION' : 'New Consultation'}
          </button>
        </div>

        {/* Session List */}
        <div className="overflow-y-auto max-h-[50vh]">
          {sessionHistory.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 mx-auto text-white/20 mb-3" />
              <p className={`text-white/40 ${designMode === 'boxy' ? 'font-mono text-xs uppercase' : 'text-sm'}`}>
                {designMode === 'boxy' ? 'NO PREVIOUS CONSULTATIONS' : 'No previous consultations'}
              </p>
              <p className={`text-white/25 mt-1 ${designMode === 'boxy' ? 'font-mono text-[10px]' : 'text-xs'}`}>
                {designMode === 'boxy' ? 'YOUR CONSULTATIONS WILL APPEAR HERE' : 'Your consultations will appear here'}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {sessionHistory.map((session) => {
                const isActive = currentSession?.id === session.id;
                const turnCount = session.turns.length;

                return (
                  <button
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose();
                    }}
                    className={`
                      w-full p-3 text-left transition-all mb-1 group
                      ${designMode === 'boxy'
                        ? `border ${isActive ? 'border-white/50 bg-white/10' : 'border-transparent hover:border-white/30 hover:bg-white/5'}`
                        : `${isActive ? 'bg-white/10 rounded-lg' : 'hover:bg-white/5 rounded-lg'}`
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-white/90 truncate ${designMode === 'boxy' ? 'font-mono text-xs' : 'text-sm font-medium'}`}>
                          {session.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-white/30 ${designMode === 'boxy' ? 'font-mono text-[10px]' : 'text-xs'}`}>
                            {formatSessionDate(session.updatedAt)}
                          </span>
                          <span className="text-white/20">·</span>
                          <span className={`text-white/30 ${designMode === 'boxy' ? 'font-mono text-[10px]' : 'text-xs'}`}>
                            {turnCount} {turnCount === 1 ? 'question' : 'questions'}
                          </span>
                        </div>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteSession(session.id);
                          }
                        }}
                        className={`p-1.5 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ${designMode === 'round' ? 'rounded' : ''}`}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
