import { useEffect, useRef } from 'react';
import { X, Clock, Trash2, MessageSquare, Plus, ChevronRight } from 'lucide-react';
import { useSessionStore } from '@/hooks/useSessionStore';
import { formatSessionDate } from '@/lib/sessionStorage';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  designMode?: 'boxy' | 'round';
}

export function HistorySidebar({
  isOpen,
  onClose,
  onSelectSession,
  onNewSession,
  designMode = 'boxy',
}: HistorySidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  const {
    sessionHistory,
    currentSession,
    loadAllSessions,
    deleteSessionById,
  } = useSessionStore();

  // Load sessions when sidebar opens
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

  const deleteSession = (sessionId: string) => {
    if (confirm('Delete this consultation?')) {
      deleteSessionById(sessionId);
    }
  };

  return (
    <>
      {/* Backdrop - only visible when open */}
      <div 
        className={`
          fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 h-full w-80 z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${designMode === 'boxy'
            ? 'bg-[#0a0a0a] border-r-2 border-white/20'
            : 'bg-[#0a0a0a]/95 backdrop-blur-xl border-r border-white/10'
          }
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 ${designMode === 'boxy' ? 'border-b-2 border-white/20' : 'border-b border-white/10'}`}>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-white/60" />
            <h2 className={`text-white ${designMode === 'boxy' ? 'font-mono text-sm uppercase tracking-widest' : 'text-lg font-medium'}`}>
              {designMode === 'boxy' ? 'HISTORY' : 'History'}
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
        <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 140px)' }}>
          {sessionHistory.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 mx-auto text-white/20 mb-3" />
              <p className={`text-white/40 ${designMode === 'boxy' ? 'font-mono text-xs uppercase' : 'text-sm'}`}>
                {designMode === 'boxy' ? 'NO PREVIOUS CONSULTATIONS' : 'No previous consultations'}
              </p>
              <p className={`text-white/25 mt-1 ${designMode === 'boxy' ? 'font-mono text-[10px]' : 'text-xs'}`}>
                {designMode === 'boxy' ? 'START ASKING QUESTIONS' : 'Start asking questions'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
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
                      w-full p-3 text-left transition-all group
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
                      <div className="flex items-center gap-1">
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
                        <ChevronRight className="w-4 h-4 text-white/20" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 ${designMode === 'boxy' ? 'border-t border-white/10' : 'border-t border-white/5'}`}>
          <p className={`text-center text-white/20 ${designMode === 'boxy' ? 'font-mono text-[9px] uppercase' : 'text-[10px]'}`}>
            {sessionHistory.length} {sessionHistory.length === 1 ? 'consultation' : 'consultations'} saved
          </p>
        </div>
      </div>
    </>
  );
}
