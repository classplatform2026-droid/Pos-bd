import React, { useState, useEffect } from 'react';
import {
  Search,
  ArrowLeft,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Store,
  Phone,
  Mail,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { AdminTicketItem } from '../types';

interface AdminSupportScreenProps {
  onShowToast?: (msg: string, type?: 'success' | 'danger') => void;
}

export const AdminSupportScreen: React.FC<AdminSupportScreenProps> = ({ onShowToast }) => {
  const [tickets, setTickets] = useState<AdminTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminSupport({
        search,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      if (res?.tickets) {
        setTickets(res.tickets);
        if (selectedTicket) {
          const fresh = res.tickets.find((t: AdminTicketItem) => t._id === selectedTicket._id);
          if (fresh) setSelectedTicket(fresh);
        }
      }
    } catch (err) {
      console.warn('Fetch support notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setReplySubmitting(true);
    try {
      const res = await api.sendAdminSupportReply(selectedTicket._id, replyText.trim());
      if (res?.ticket) {
        setSelectedTicket(res.ticket);
      }
      setReplyText('');
      if (onShowToast) onShowToast('Reply sent successfully.', 'success');
      fetchTickets();
    } catch (err) {
      if (onShowToast) onShowToast((err as Error).message || 'Failed to send reply.', 'danger');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'open' | 'in_progress' | 'resolved') => {
    if (!selectedTicket) return;
    setStatusSubmitting(true);
    try {
      const res = await api.updateAdminSupportStatus(selectedTicket._id, newStatus);
      if (res?.ticket) {
        setSelectedTicket(res.ticket);
      }
      if (onShowToast) onShowToast(`Ticket marked as ${newStatus}.`, 'success');
      fetchTickets();
    } catch (err) {
      if (onShowToast) onShowToast((err as Error).message || 'Failed to update status.', 'danger');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const progressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  // DETAIL VIEW
  if (selectedTicket) {
    return (
      <div className="p-3.5 sm:p-6 space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedTicket(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>সব টিকেটে ফিরে যান (Back to Tickets)</span>
          </button>
          <button
            type="button"
            onClick={fetchTickets}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Ticket Header Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/70">
                  #{selectedTicket._id.slice(-6).toUpperCase()}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedTicket.status === 'resolved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : selectedTicket.status === 'in_progress'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {selectedTicket.status === 'resolved'
                    ? 'Resolved (সমাধানকৃত)'
                    : selectedTicket.status === 'in_progress'
                    ? 'In Progress (চলমান)'
                    : 'Open (খোলা)'}
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  Priority: <span className="uppercase text-slate-700">{selectedTicket.priority || 'medium'}</span>
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                {selectedTicket.subject}
              </h1>
            </div>

            {/* Quick Status Changers */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
              {selectedTicket.status !== 'in_progress' && (
                <button
                  type="button"
                  disabled={statusSubmitting}
                  onClick={() => handleUpdateStatus('in_progress')}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Mark In Progress
                </button>
              )}
              {selectedTicket.status !== 'resolved' && (
                <button
                  type="button"
                  disabled={statusSubmitting}
                  onClick={() => handleUpdateStatus('resolved')}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Mark Resolved
                </button>
              )}
              {selectedTicket.status === 'resolved' && (
                <button
                  type="button"
                  disabled={statusSubmitting}
                  onClick={() => handleUpdateStatus('open')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Reopen
                </button>
              )}
            </div>
          </div>

          {/* Store & Client Contact Details */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                <strong className="text-slate-800">দোকান:</strong> {selectedTicket.storeName}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-400">মালিক:</span>
              <span className="text-slate-800 font-medium">{selectedTicket.ownerName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{selectedTicket.ownerEmail}</span>
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <span>কথোপকথন (Messages - {selectedTicket.messages?.length || 0})</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              তৈরি: {formatDateTime(selectedTicket.createdAt)}
            </span>
          </div>

          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {selectedTicket.messages?.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                কোনো বার্তা নেই। নিচে উত্তর লিখুন।
              </div>
            ) : (
              selectedTicket.messages?.map((msg, idx) => {
                const isAdmin = msg.senderRole === 'SuperAdmin' || msg.senderRole === 'Admin';
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10px] font-bold text-slate-600">
                        {msg.sender} {isAdmin ? '(এডমিন)' : '(দোকান মালিক)'}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {formatDateTime(msg.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                        isAdmin
                          ? 'bg-blue-600 text-white rounded-tr-xs shadow-2xs'
                          : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/80'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-100 space-y-2.5">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="দোকান মালিকের প্রশ্নের উত্তর লিখুন..."
              rows={3}
              disabled={replySubmitting}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                উত্তর পাঠানোর সাথে সাথে দোকান মালিকের স্ক্রিনে আপডেট হবে
              </span>
              <button
                type="submit"
                disabled={replySubmitting || !replyText.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {replySubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>উত্তর পাঠান (Send Reply)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // LIST VIEW - MINIMAL & MOBILE FRIENDLY
  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Support Helpdesk (সহায়তা ও টিকেট)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            দোকান মালিকদের প্রেরিত সাপোর্ট টিকেট ও সমস্যা সমাধান করুন
          </p>
        </div>
        <button
          type="button"
          onClick={fetchTickets}
          className="self-start sm:self-auto px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>রিফ্রেশ</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all' as const, label: 'সব টিকেট', count: tickets.length },
              { id: 'open' as const, label: 'খোলা', count: openCount },
              { id: 'in_progress' as const, label: 'প্রক্রিয়াধীন', count: progressCount },
              { id: 'resolved' as const, label: 'সমাধানকৃত', count: resolvedCount },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="টিকেট বা দোকান সার্চ করুন..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Tickets List - Clean Card View (Mobile & Desktop friendly) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">টিকেট লোড হচ্ছে...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center space-y-1.5">
            <MessageCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">কোনো সাপোর্ট টিকেট পাওয়া যায়নি</p>
            <p className="text-[11px] text-slate-400">ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map((t) => {
              const lastMsg =
                t.messages && t.messages.length > 0
                  ? t.messages[t.messages.length - 1].text
                  : '';
              return (
                <div
                  key={t._id}
                  onClick={() => setSelectedTicket(t)}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                        #{t._id.slice(-6).toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        {t.storeName}
                      </span>
                      <span className="text-[11px] text-slate-400">• {t.ownerName}</span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {t.subject}
                    </h4>

                    {lastMsg && (
                      <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed">
                        {lastMsg}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                      <span>{formatDateTime(t.updatedAt || t.createdAt)}</span>
                      <span>•</span>
                      <span>{t.messages?.length || 0} টি মেসেজ</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div>
                      {t.status === 'open' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>খোলা</span>
                        </span>
                      )}
                      {t.status === 'in_progress' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                          প্রক্রিয়াধীন
                        </span>
                      )}
                      {t.status === 'resolved' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>সমাধানকৃত</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                      <span>দেখুন</span>
                      <ChevronRight className="w-4 h-4 ml-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
