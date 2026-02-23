import { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  Zap, RefreshCw, Loader2, Brain, Search, Bell,
  ExternalLink, Star, Eye, Wrench, Sparkles
} from 'lucide-react';

function timeAgo(ts: number): string {
  if (!ts) return 'Never';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isNew(ts: number): boolean {
  return Date.now() - ts < 7 * 24 * 60 * 60 * 1000; // 7 days
}

export default function Evolution() {
  const [status, setStatus] = useState<any>(null);
  const [models, setModels] = useState<any>(null);
  const [discovered, setDiscovered] = useState<any>(null);
  const [notifications, setNotifications] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState<string | null>(null);
  const [evolving, setEvolving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('status');
  const [providerFilter, setProviderFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, m, d, n] = await Promise.all([
        api.evolutionStatus(),
        api.evolutionModels({ limit: 200 }),
        api.evolutionDiscovered(),
        api.get('/evolution/notifications?limit=50'),
      ]);
      setStatus(s);
      setModels(m);
      setDiscovered(d);
      setNotifications(n);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleScanModels = async () => {
    setScanning('models');
    try {
      await api.evolutionScanModels();
      await load();
    } catch { /* ignore */ }
    setScanning(null);
  };

  const handleScanEcosystem = async () => {
    setScanning('ecosystem');
    try {
      await api.evolutionScanEcosystem();
      await load();
    } catch { /* ignore */ }
    setScanning(null);
  };

  const handleEvolve = async (full: boolean) => {
    setEvolving(true);
    try {
      await api.evolutionTrigger(full);
    } catch { /* ignore */ }
    setTimeout(() => { setEvolving(false); load(); }, 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const sections = [
    { id: 'status', label: 'Live Status', icon: Zap },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'models', label: 'LLM Ecosystem', icon: Brain },
    { id: 'discoveries', label: 'Discoveries', icon: Search },
  ];

  const filteredModels = providerFilter
    ? (models?.models || []).filter((m: any) => m.provider === providerFilter)
    : (models?.models || []);

  const providerSummary = models?.summary || {};

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Zap className="w-7 h-7 text-primary-500" />
            <div>
              <h1 className="text-2xl font-bold">Evolution</h1>
              <p className="text-sm text-gray-500">Self-improvement, LLM tracking, ecosystem discovery</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleEvolve(false)}
              disabled={evolving}
              className="flex items-center gap-2 px-3 py-2 bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              {evolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Evolve
            </button>
            <button
              onClick={load}
              className="flex items-center gap-2 px-3 py-2 bg-dark-800 border border-gray-700 rounded-lg hover:bg-dark-700 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mb-6 bg-dark-900 p-1 rounded-lg border border-gray-800">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
                activeSection === s.id ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-dark-800'
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
              {s.id === 'notifications' && (notifications?.unreadCount || 0) > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] bg-red-500 text-white rounded-full">
                  {notifications.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Status Section ─── */}
        {activeSection === 'status' && (
          <div className="space-y-4">
            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Known Models" value={status?.llmTracker?.modelCount ?? 0} sub={`Last scan: ${timeAgo(status?.llmTracker?.lastScanAt)}`} />
              <StatCard label="Discoveries" value={status?.ecosystemScanner?.discoveryCount ?? 0} sub={`Last scan: ${timeAgo(status?.ecosystemScanner?.lastScanAt)}`} />
              <StatCard label="Notifications" value={status?.notifications?.total ?? 0} sub={`${status?.notifications?.unread ?? 0} unread`} />
              <StatCard
                label="Evolution"
                value={status?.evolution ? 'Active' : 'N/A'}
                sub={status?.evolution?.lastCycleAt ? `Last: ${timeAgo(status.evolution.lastCycleAt)}` : 'No cycles yet'}
              />
            </div>

            {/* Provider breakdown */}
            {Object.keys(providerSummary).length > 0 && (
              <div className="p-4 bg-dark-800 rounded-lg border border-gray-800">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Models by Provider</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(providerSummary)
                    .sort((a: any, b: any) => b[1] - a[1])
                    .map(([provider, count]: any) => (
                      <span
                        key={provider}
                        className="px-3 py-1.5 bg-dark-900 border border-gray-700 rounded-lg text-xs font-medium text-gray-300 cursor-pointer hover:border-primary-500/50 hover:text-primary-300 transition-colors"
                        onClick={() => { setProviderFilter(provider); setActiveSection('models'); }}
                      >
                        {provider} <span className="text-gray-500">({count})</span>
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Scan actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleScanModels}
                disabled={scanning === 'models'}
                className="flex items-center gap-3 p-4 bg-dark-800 rounded-lg border border-gray-800 hover:border-primary-500/30 transition-colors disabled:opacity-50"
              >
                {scanning === 'models' ? <Loader2 className="w-5 h-5 animate-spin text-primary-400" /> : <Brain className="w-5 h-5 text-primary-400" />}
                <div className="text-right">
                  <p className="text-sm font-medium">Scan LLM Models</p>
                  <p className="text-xs text-gray-500">Check OpenRouter for new models, price changes</p>
                </div>
              </button>
              <button
                onClick={handleScanEcosystem}
                disabled={scanning === 'ecosystem'}
                className="flex items-center gap-3 p-4 bg-dark-800 rounded-lg border border-gray-800 hover:border-primary-500/30 transition-colors disabled:opacity-50"
              >
                {scanning === 'ecosystem' ? <Loader2 className="w-5 h-5 animate-spin text-primary-400" /> : <Search className="w-5 h-5 text-primary-400" />}
                <div className="text-right">
                  <p className="text-sm font-medium">Scan Ecosystem</p>
                  <p className="text-xs text-gray-500">Search GitHub/npm for MCP servers, tools</p>
                </div>
              </button>
            </div>

            {/* Recent updates from LLM tracker */}
            {status?.llmTracker?.recentUpdates?.length > 0 && (
              <div className="p-4 bg-dark-800 rounded-lg border border-gray-800">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent LLM Updates</h3>
                <div className="space-y-2">
                  {status.llmTracker.recentUpdates.map((u: any) => (
                    <div key={u.id} className="flex items-start gap-2 p-2 rounded bg-dark-900">
                      <TypeBadge type={u.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200">{u.modelName}</p>
                        <p className="text-xs text-gray-500">{u.details}</p>
                      </div>
                      <span className="text-[10px] text-gray-600 flex-shrink-0">{timeAgo(u.detectedAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Notifications Section ─── */}
        {activeSection === 'notifications' && (
          <div className="space-y-2">
            {(notifications?.notifications || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Bell className="w-12 h-12 mb-3 opacity-30" />
                <p>No notifications yet</p>
                <p className="text-sm mt-1">Notifications appear when the system discovers changes</p>
              </div>
            ) : (
              notifications.notifications.map((n: any) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    !n.readAt ? 'bg-dark-800 border-primary-500/20' : 'bg-dark-800/50 border-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <SeverityDot severity={n.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${!n.readAt ? 'text-gray-100' : 'text-gray-400'}`}>{n.title}</p>
                        {!n.readAt && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 bg-dark-900 rounded text-gray-500">{n.source}</span>
                        <span className="text-[10px] text-gray-600">{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── LLM Models Section ─── */}
        {activeSection === 'models' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-400">{filteredModels.length} models</p>
                {providerFilter && (
                  <button
                    onClick={() => setProviderFilter('')}
                    className="text-xs text-primary-400 hover:text-primary-300"
                  >
                    Clear filter
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="p-2 text-sm bg-dark-900 border border-gray-700 rounded-lg text-gray-300"
                >
                  <option value="">All Providers</option>
                  {Object.entries(providerSummary)
                    .sort((a: any, b: any) => b[1] - a[1])
                    .map(([p, c]: any) => (
                      <option key={p} value={p}>{p} ({c})</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-right py-2 px-3 font-medium">Model</th>
                    <th className="text-right py-2 px-3 font-medium">Provider</th>
                    <th className="text-right py-2 px-3 font-medium">Context</th>
                    <th className="text-right py-2 px-3 font-medium">$/1K In</th>
                    <th className="text-right py-2 px-3 font-medium">$/1K Out</th>
                    <th className="text-center py-2 px-3 font-medium">Tools</th>
                    <th className="text-center py-2 px-3 font-medium">Vision</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModels.slice(0, 100).map((m: any) => (
                    <tr key={m.id} className="border-b border-gray-800/50 hover:bg-dark-800 transition-colors">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-200 font-medium">{m.name}</span>
                          {isNew(m.firstSeenAt) && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded font-bold">NEW</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-600 font-mono">{m.id}</p>
                      </td>
                      <td className="py-2 px-3 text-gray-400">{m.provider}</td>
                      <td className="py-2 px-3 text-gray-400">{(m.contextLength || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-gray-400 font-mono">{(m.costPer1kInput || 0).toFixed(4)}</td>
                      <td className="py-2 px-3 text-gray-400 font-mono">{(m.costPer1kOutput || 0).toFixed(4)}</td>
                      <td className="py-2 px-3 text-center">{m.supportsTools ? <Wrench className="w-3.5 h-3.5 text-green-400 inline" /> : <span className="text-gray-700">-</span>}</td>
                      <td className="py-2 px-3 text-center">{m.supportsVision ? <Eye className="w-3.5 h-3.5 text-blue-400 inline" /> : <span className="text-gray-700">-</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredModels.length > 100 && (
              <p className="text-xs text-gray-600 text-center">Showing 100 of {filteredModels.length} models</p>
            )}
          </div>
        )}

        {/* ─── Discoveries Section ─── */}
        {activeSection === 'discoveries' && (
          <div className="space-y-3">
            {(discovered?.items || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Search className="w-12 h-12 mb-3 opacity-30" />
                <p>No discoveries yet</p>
                <p className="text-sm mt-1">Run an ecosystem scan to discover MCP servers and tools</p>
                <button
                  onClick={handleScanEcosystem}
                  disabled={scanning === 'ecosystem'}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary-600 rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
                >
                  {scanning === 'ecosystem' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Scan Now
                </button>
              </div>
            ) : (
              discovered.items.map((item: any) => (
                <div key={item.id} className="p-4 bg-dark-800 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          item.type === 'mcp-server' ? 'bg-purple-500/20 text-purple-400'
                            : item.type === 'npm-package' ? 'bg-red-500/20 text-red-400'
                              : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-sm font-medium text-gray-200">{item.name}</span>
                        {item.stars > 0 && (
                          <span className="flex items-center gap-0.5 text-[11px] text-amber-500">
                            <Star className="w-3 h-3" fill="currentColor" /> {item.stars}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{item.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-600">Score: {item.relevanceScore}/10</span>
                        <span className="text-[10px] text-gray-600">{timeAgo(item.discoveredAt)}</span>
                      </div>
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-dark-900 border border-gray-700 rounded text-xs text-gray-400 hover:text-primary-400 hover:border-primary-500/30 transition-colors flex-shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" /> Open
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="p-4 bg-dark-800 rounded-lg border border-gray-800">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      <p className="text-[11px] text-gray-600 mt-1">{sub}</p>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    new_model: 'bg-green-500/20 text-green-400',
    price_change: 'bg-amber-500/20 text-amber-400',
    deprecation: 'bg-red-500/20 text-red-400',
    new_capability: 'bg-blue-500/20 text-blue-400',
  };
  const labels: Record<string, string> = {
    new_model: 'New',
    price_change: 'Price',
    deprecation: 'Removed',
    new_capability: 'Update',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${styles[type] || 'bg-gray-700 text-gray-400'}`}>
      {labels[type] || type}
    </span>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-400',
    warning: 'bg-amber-400',
    info: 'bg-blue-400',
  };
  return <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colors[severity] || colors.info}`} />;
}
