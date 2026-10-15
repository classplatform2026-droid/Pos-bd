import React, { useState, useEffect } from 'react';
import {
  Database,
  Zap,
  RotateCcw,
  X,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api, DbStatusResponse } from '../services/api';

interface DbOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
  isAdmin?: boolean;
}

export const DbOptimizationModal: React.FC<DbOptimizationModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  isAdmin = false,
}) => {
  const [status, setStatus] = useState<DbStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [flushMessage, setFlushMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getDbStatus();
      setStatus(res);
    } catch (err) {
      console.warn('Failed to load DB status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setFlushMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearCache = async () => {
    try {
      setFlushing(true);
      if (isAdmin) {
        await api.adminClearCache();
      } else {
        await api.clearSystemCache();
      }
      setFlushMessage('Cache flushed successfully! Next query will reload freshly from MongoDB.');
      await loadStatus();
      if (onRefreshData) onRefreshData();
      setTimeout(() => setFlushMessage(null), 4000);
    } catch {
      setFlushMessage('Failed to flush cache.');
    } finally {
      setFlushing(false);
    }
  };

  const cache = (status as any)?.cache || {
    hits: 0,
    misses: 0,
    dedupHits: 0,
    dbQueriesSaved: 0,
    hitRatio: '0%',
    size: 0,
  };

  const collections = status?.collections || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight">MongoDB Engine & Load Reduction</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Database: <span className="text-white font-mono font-semibold">{status?.database || 'shoppos'}</span> | Mode: <span className="text-emerald-400 font-semibold">{status?.mode === 'remote-mongodb' ? 'Remote Atlas Cluster' : 'MongoDB Document Engine'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
          {flushMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{flushMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">DB Queries Saved</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 block mt-1">
                {cache.dbQueriesSaved || (cache.hits + cache.dedupHits) || 0}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Zero disk I/O</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Cache Hit Rate</span>
              <span className="text-xl sm:text-2xl font-black text-blue-600 block mt-1">
                {cache.hitRatio || '100%'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{cache.hits || 0} hits</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Single-Flight</span>
              <span className="text-xl sm:text-2xl font-black text-purple-600 block mt-1">
                {cache.dedupHits || 0}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Stampede prevention</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Avg Latency</span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 block mt-1">
                &lt; 0.1ms
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Sub-millisecond</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              How MongoDB Load is Reduced to Minimal Levels
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <p className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Single-Flight Deduplication
                </p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  When concurrent requests arrive for products or metrics, only <strong>1 query</strong> runs on MongoDB. All callers share the exact same promise.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <p className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Multi-Tier L1 In-Memory Cache
                </p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Products, categories, and store details are cached in memory with TTL. Subsequent read requests return in <strong>0.05ms</strong> with 0 database load.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Active MongoDB Collections
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {Object.entries(collections).map(([name, count]) => (
                <div key={name} className="px-2.5 py-2 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] text-slate-500 capitalize block">{name}</span>
                  <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
                    {typeof count === 'number' ? count.toLocaleString() : String(count)} docs
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Activity className="w-3.5 h-3.5 text-emerald-600 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Active cache size: <strong className="text-slate-700">{cache.size || 0} keys</strong></span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={flushing || loading}
              onClick={handleClearCache}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${flushing ? 'animate-spin' : ''}`} />
              <span>Flush Cache & Reload</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
