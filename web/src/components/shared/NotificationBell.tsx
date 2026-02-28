import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useNotificationsStore, type SystemNotification } from '../../stores/notifications';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const severityDots: Record<string, string> = {
  critical: 'bg-red-400',
  warning: 'bg-amber-400',
  success: 'bg-green-400',
  info: 'bg-blue-400',
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, fetchAll, fetchUnreadCount, markRead, markAllRead } = useNotificationsStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Poll unread count
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (open) fetchAll({ limit: 20 });
  }, [open, fetchAll]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (n: SystemNotification) => {
    if (!n.readAt) markRead(n.id);
    if (n.actionUrl) {
      setOpen(false);
      navigate(n.actionUrl);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-dark-800 border border-gray-700 hover:bg-dark-700 transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 max-h-[420px] flex flex-col bg-dark-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-sm font-semibold text-gray-200">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  title="Mark all read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Read all
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                <Bell className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-right px-4 py-3 border-b border-gray-800/50 hover:bg-dark-800 transition-colors ${!n.readAt ? 'bg-dark-850' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityDots[n.severity] || severityDots.info}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${!n.readAt ? 'text-gray-100' : 'text-gray-400'}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${severityColors[n.severity] || severityColors.info}`}>
                          {n.source}
                        </span>
                        <span className="text-[10px] text-gray-600">{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <button
              onClick={() => { setOpen(false); navigate('/evolution'); }}
              className="w-full px-4 py-2.5 text-xs text-center text-primary-400 hover:text-primary-300 border-t border-gray-800 hover:bg-dark-800 transition-colors"
            >
              View all in Evolution page
            </button>
          )}
        </div>
      )}
    </div>
  );
}
