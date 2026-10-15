import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  Printer,
  Check,
  ChevronRight,
  Activity,
  Save,
  X,
  Phone,
  Lock,
  Plus,
  KeyRound,
  Clock,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Copy,
  ExternalLink,
  Wallet,
  Headphones,
  Mail,
  MessageCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Send,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { api } from '../services/api';

interface SupportMessage {
  id: string;
  sender: string;
  senderRole: string;
  text: string;
  timestamp: string;
}

interface SupportTicket {
  _id?: string;
  id?: string;
  storeId?: string;
  storeName?: string;
  ownerName?: string;
  ownerEmail?: string;
  category?: string;
  priority?: string;
  subject: string;
  message?: string;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
  status: 'open' | 'in_progress' | 'resolved';
  messages?: SupportMessage[];
}

export const SettingsScreen: React.FC = () => {
  const {
    storeInfo,
    updateStoreInfo,
    refreshStoreInfo,
    subscriptionExpired,
    isFeatureEnabled,
  } = usePos();

  const [activeTab, setActiveTab] = useState<'store' | 'printer' | 'subscription' | 'support'>(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.hash === '#subscription' || window.location.search.includes('tab=subscription'))
    ) {
      return 'subscription';
    }
    if (
      typeof window !== 'undefined' &&
      (window.location.hash === '#support' || window.location.search.includes('tab=support'))
    ) {
      return 'support';
    }
    return 'store';
  });

  const [storeName, setStoreName] = useState(storeInfo.name);
  const [branch, setBranch] = useState(storeInfo.branch);
  const [phone] = useState(storeInfo.phone);
  const [address, setAddress] = useState(storeInfo.address);
  const [currency, setCurrency] = useState(storeInfo.currency);
  const [taxRate, setTaxRate] = useState(storeInfo.taxRate.toString());
  const [receiptFooter, setReceiptFooter] = useState(storeInfo.receiptFooter);
  const [printerSize, setPrinterSize] = useState(storeInfo.printerSize);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (storeInfo) {
      setStoreName(storeInfo.name || '');
      setBranch(storeInfo.branch || '');
      setAddress(storeInfo.address || '');
      setCurrency(storeInfo.currency || '৳');
      setTaxRate((storeInfo.taxRate ?? 0).toString());
      setReceiptFooter(storeInfo.receiptFooter || '');
      setPrinterSize(storeInfo.printerSize || '80mm');
    }
  }, [storeInfo]);

  // Support & Helpdesk State (Connected to real backend API)
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [selectedTicketForChat, setSelectedTicketForChat] = useState<SupportTicket | null>(null);
  const [ownerReplyText, setOwnerReplyText] = useState('');
  const [ownerReplySubmitting, setOwnerReplySubmitting] = useState(false);
  const [ticketCategory, setTicketCategory] = useState('POS & Billing');
  const [ticketPriority, setTicketPriority] = useState<'normal' | 'medium' | 'urgent'>('medium');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketPhone, setTicketPhone] = useState(storeInfo.phone || '');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketFeedback, setTicketFeedback] = useState<string | null>(null);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const [supportTicketTab, setSupportTicketTab] = useState<'create' | 'list'>('list');

  // Subscription & Payments State
  const [payments, setPayments] = useState<any[]>([]);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [selectedPlanName] = useState<string>(
    storeInfo.subscription?.plan || 'Professional'
  );
  const [selectedDurationMonths, setSelectedDurationMonths] = useState<number>(1);
  const [selectedMethod, setSelectedMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Bank'>('bKash');
  const [senderPhone, setSenderPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [refreshingSubscription, setRefreshingSubscription] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Calculation of Active Duration and Expiry Warning
  const subMetrics = useMemo(() => {
    const sub = storeInfo.subscription;
    const now = new Date();
    const planName = sub?.plan || 'Trial';
    const isTrial = planName.toLowerCase().includes('trial');
    const startDate = sub?.startDate
      ? new Date(sub.startDate)
      : (storeInfo as any).createdAt
      ? new Date((storeInfo as any).createdAt)
      : new Date(now.getTime() - (isTrial ? 0 : 14) * 86400000);
    const expiryDate = sub?.expiryDate
      ? new Date(sub.expiryDate)
      : new Date(startDate.getTime() + (isTrial ? 14 : 30) * 86400000);

    // Active days: how many days the plan has been active
    const activeMs = Math.max(0, now.getTime() - startDate.getTime());
    const daysActive = Math.floor(activeMs / (1000 * 60 * 60 * 24));

    // Remaining days until expiry
    const remainingMs = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    // Total duration of current billing cycle in days
    const totalCycleDays = Math.max(
      1,
      Math.round((expiryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Percentage elapsed
    const percentElapsed = Math.min(100, Math.max(0, Math.round((daysActive / totalCycleDays) * 100)));

    const isExpired = sub?.status === 'expired' || subscriptionExpired || daysRemaining <= 0;
    const isUrgent = !isExpired && daysRemaining <= 3;
    const isExpiringSoon = !isExpired && daysRemaining <= 7;
    const isWarning = !isExpired && daysRemaining <= 14;

    return {
      sub,
      planName,
      isTrial,
      startDate,
      expiryDate,
      daysActive,
      daysRemaining: Math.max(0, daysRemaining),
      totalCycleDays,
      percentElapsed,
      isExpired,
      isUrgent,
      isExpiringSoon,
      isWarning,
    };
  }, [storeInfo.subscription, (storeInfo as any).createdAt, subscriptionExpired]);

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const res = await api.getStorePayments();
      if (res && res.payments) {
        setPayments(res.payments);
      }
    } catch (err: any) {
      console.warn('Failed to load store payments:', err.message);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.getStorePlans();
      if (res && res.plans && res.plans.length > 0) {
        setAvailablePlans(res.plans);
      }
    } catch {
      // safe fallback
    }
  };

  const handleRefreshSubscription = async () => {
    setRefreshingSubscription(true);
    try {
      if (refreshStoreInfo) await refreshStoreInfo();
      await fetchPayments();
      await fetchPlans();
    } finally {
      setRefreshingSubscription(false);
    }
  };

  const fetchSupportTickets = async () => {
    setSupportLoading(true);
    try {
      const res = await api.getStoreSupportTickets();
      if (res && res.tickets) {
        setSupportTickets(res.tickets);
        if (selectedTicketForChat) {
          const fresh = res.tickets.find(
            (t: any) => (t._id || t.id) === (selectedTicketForChat._id || selectedTicketForChat.id)
          );
          if (fresh) setSelectedTicketForChat(fresh);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load support tickets:', err.message);
    } finally {
      setSupportLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'subscription') {
      fetchPayments();
      fetchPlans();
    }
    if (activeTab === 'support') {
      fetchSupportTickets();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchSupportTickets();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // fallback
    }
  };

  const getPlanPrice = (planName: string) => {
    const found = availablePlans.find((p) => p.name?.toLowerCase() === (planName || '').toLowerCase());
    if (found && typeof found.price === 'number') return found.price;
    const lower = (planName || '').toLowerCase();
    if (lower.includes('trial')) return 0;
    return 999; // Standard
  };

  const calculateTotalAmount = (baseMonthlyPrice: number, months: number) => {
    const rawTotal = baseMonthlyPrice * months;
    if (months === 3) return Math.round(rawTotal * 0.95); // 5% discount
    if (months === 6) return Math.round(rawTotal * 0.9); // 10% discount
    if (months >= 12) return Math.round(rawTotal * 0.8); // 20% discount
    return rawTotal;
  };

  const formatDate = (dateInput?: string | Date) => {
    if (!dateInput) return 'N/A';
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(dateInput);
    }
  };

  const formatDateTime = (dateInput?: string | Date) => {
    if (!dateInput) return 'N/A';
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(dateInput);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      setPaymentFeedback({
        type: 'error',
        message: 'পেমেন্ট ট্রানজেকশন আইডি (TrxID) অবশ্যই দিতে হবে।',
      });
      return;
    }
    if (!senderPhone.trim()) {
      setPaymentFeedback({
        type: 'error',
        message: 'যে নম্বর থেকে টাকা পাঠিয়েছেন তা লিখুন।',
      });
      return;
    }

    const basePrice = 999;
    const amount = calculateTotalAmount(basePrice, selectedDurationMonths);

    setPaymentSubmitting(true);
    setPaymentFeedback(null);
    try {
      const res = await api.submitStorePayment({
        method: selectedMethod,
        transactionId: transactionId.trim().toUpperCase(),
        amount,
        senderPhone: senderPhone.trim(),
        durationMonths: selectedDurationMonths,
        plan: 'Standard',
        notes:
          paymentNotes.trim() ||
          `${subMetrics.isTrial ? 'Trial upgrade to Standard' : 'Standard subscription renewal'} for ${selectedDurationMonths} month(s)`,
      });

      if (res && res.success) {
        setPaymentFeedback({
          type: 'success',
          message: `পেমেন্ট রিকোয়েস্ট সফলভাবে সাবমিট হয়েছে (TrxID: ${transactionId.trim().toUpperCase()})! অ্যাডমিন দ্রুত ভেরিফাই করে সক্রিয় করবে।`,
        });
        setPaymentModalOpen(false);
        setTransactionId('');
        setSenderPhone('');
        setPaymentNotes('');
        await fetchPayments();
        if (refreshStoreInfo) await refreshStoreInfo();
      } else {
        setPaymentFeedback({
          type: 'error',
          message: 'পেমেন্ট সাবমিট করা যায়নি। আবার চেষ্টা করুন।',
        });
      }
    } catch (err: any) {
      setPaymentFeedback({
        type: 'error',
        message: err.message || 'পেমেন্ট সাবমিট করতে সমস্যা হয়েছে।',
      });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateStoreInfo({
      name: storeName,
      branch,
      address,
      currency,
      taxRate: parseFloat(taxRate) || 0,
      receiptFooter,
      printerSize,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setTicketSubmitting(true);
    setTicketFeedback(null);

    try {
      const res = await api.createStoreSupportTicket({
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        category: ticketCategory,
        priority: ticketPriority,
        phone: ticketPhone.trim() || storeInfo.phone || '',
      });

      if (res && res.ticket) {
        setTicketSubject('');
        setTicketMessage('');
        setSupportTicketTab('list');
        const shortId = (res.ticket._id || res.ticket.id || '').slice(-6).toUpperCase();
        setTicketFeedback(
          `সাপোর্ট টিকিট সফলভাবে জমা হয়েছে (ID: #${shortId})! আমাদের টিম দ্রুত সমাধান করবে।`
        );
        await fetchSupportTickets();
      } else {
        setTicketFeedback('টিকেট জমা দেওয়া যায়নি। আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setTicketFeedback(err.message || 'টিকেট তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setTicketSubmitting(false);
      setTimeout(() => setTicketFeedback(null), 6000);
    }
  };

  const handleSendOwnerReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketForChat || !ownerReplyText.trim()) return;
    const ticketId = selectedTicketForChat._id || selectedTicketForChat.id;
    if (!ticketId) return;

    setOwnerReplySubmitting(true);
    try {
      const res = await api.sendStoreSupportReply(ticketId, ownerReplyText.trim());
      if (res && res.ticket) {
        setSelectedTicketForChat(res.ticket);
        setOwnerReplyText('');
        await fetchSupportTickets();
      }
    } catch (err: any) {
      console.warn('Failed to send reply:', err.message);
    } finally {
      setOwnerReplySubmitting(false);
    }
  };

  return (
    <div className="p-3 sm:p-5 max-w-5xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Store Settings (দোকান সেটিংস)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your shop profile, receipt printer, and subscription plan
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-semibold self-start sm:self-auto shadow-2xs">
          <Store className="w-4 h-4 text-emerald-600" />
          <span className="font-bold">{storeInfo.name}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Unified Compact Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto scrollbar-none">
        {[
          {
            id: 'store' as const,
            label: 'Shop Profile (দোকান প্রোফাইল)',
            shortLabel: 'Shop Profile',
            icon: Store,
          },
          {
            id: 'printer' as const,
            label: 'Receipt & Printer (প্রিন্টার)',
            shortLabel: 'Printer',
            icon: Printer,
          },
          {
            id: 'subscription' as const,
            label: 'Subscription Plan (সাবস্ক্রিপশন)',
            shortLabel: 'Subscription',
            icon: Activity,
            badge: subMetrics.isExpired
              ? 'Expired'
              : subMetrics.isUrgent
              ? `${subMetrics.daysRemaining}d`
              : subMetrics.isExpiringSoon
              ? `${subMetrics.daysRemaining}d`
              : null,
            badgeColor: subMetrics.isExpired
              ? 'bg-rose-500 text-white'
              : subMetrics.isUrgent
              ? 'bg-rose-500 text-white'
              : 'bg-amber-500 text-white',
          },
          {
            id: 'support' as const,
            label: 'Help & Support (সাপোর্ট)',
            shortLabel: 'Support (24/7)',
            icon: Headphones,
            badge: '24/7',
            badgeColor: 'bg-emerald-600 text-white',
          },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm shrink-0 sm:shrink transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="hidden sm:inline truncate">{item.label}</span>
              <span className="sm:hidden truncate">{item.shortLabel}</span>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-2xs ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Settings Card */}
      <div className={activeTab === 'support' ? 'space-y-4' : 'bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs'}>
        {/* TAB: STORE INFORMATION */}
        {activeTab === 'store' && (
          <form onSubmit={handleSaveStore} className="space-y-4">
            {/* Header with Title and Quick Save Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Store className="w-5 h-5 text-blue-600" />
                  <span>Shop Profile (দোকানের প্রোফাইল)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  দোকানের মৌলিক পরিচিতি, রসিদ সেটিংস ও মুদ্রা কনফিগারেশন
                </p>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                {savedSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-4 h-4" />
                    <span>সংরক্ষিত হয়েছে!</span>
                  </span>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>

            {/* ROW 1: BASIC STORE INFO (3-Column Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Store Name (দোকানের নাম) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="দোকানের নাম"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Branch Name (শাখা)
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="যেমন: প্রধান শাখা / মিরপুর"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Store Phone (লগইন নম্বর)
                  </label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded flex items-center gap-1 select-none">
                    <Lock className="w-2.5 h-2.5 text-amber-600" />
                    <span>স্থায়ী</span>
                  </span>
                </div>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={storeInfo.phone || phone}
                    title="Store phone number is tied to login account"
                    className="w-full pl-8 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-700 cursor-not-allowed select-none"
                  />
                </div>
              </div>
            </div>

            {/* ROW 2: RECEIPT PRINT DETAILS (2-Column Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Store Address (ঠিকানা - রসিদে মুদ্রিত)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="রোড, এলাকা, থানা, জেলা"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Receipt Footer Note (রসিদের নিচের বার্তা)
                </label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="Thank you for shopping with us!"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* ROW 3: CURRENCY SYMBOL & DEFAULT TAX RATE (%) (পাশাপাশি - Side-by-Side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              {/* Currency Symbol with grouped dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    Currency Symbol (মুদ্রা প্রতীক)
                  </label>
                  <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    চিহ্ন: {currency || '৳'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={
                        ['৳', '$', '€', '£', '₹', 'AED', 'SAR', '¥', 'RM'].includes(currency)
                          ? currency
                          : 'custom'
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== 'custom') {
                          setCurrency(val);
                        }
                      }}
                      aria-label="Currency Symbol Group Dropdown"
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none shadow-2xs"
                    >
                      <optgroup label="দক্ষিণ এশিয়া (South Asia)">
                        <option value="৳">৳ - BDT (বাংলাদেশি টাকা)</option>
                        <option value="₹">₹ - INR (ভারতীয় রুপি)</option>
                      </optgroup>
                      <optgroup label="আন্তর্জাতিক প্রধান মুদ্রা (Global Major)">
                        <option value="$">$ - USD (US Dollar / ডলার)</option>
                        <option value="€">€ - EUR (Euro / ইউরো)</option>
                        <option value="£">£ - GBP (British Pound / পাউন্ড)</option>
                        <option value="¥">¥ - JPY / CNY (Yen / Yuan)</option>
                      </optgroup>
                      <optgroup label="মধ্যপ্রাচ্য (Middle East)">
                        <option value="AED">AED - UAE Dirham (দিরহাম)</option>
                        <option value="SAR">SAR - Saudi Riyal (রিয়াল)</option>
                      </optgroup>
                      <optgroup label="দক্ষিণ-পূর্ব এশিয়া (Southeast Asia)">
                        <option value="RM">RM - Malaysian Ringgit</option>
                      </optgroup>
                      <optgroup label="অন্যান্য / কাস্টম">
                        <option value="custom">কাস্টম প্রতীক (Custom Type)...</option>
                      </optgroup>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="w-18 sm:w-20 shrink-0">
                    <input
                      type="text"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      placeholder="চিহ্ন"
                      title="Currency symbol or custom text"
                      className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-center text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Default Tax Rate (%) with Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    Default Tax Rate (%) (ভ্যাট / ট্যাক্স হার)
                  </label>
                  <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    {parseFloat(taxRate) > 0 ? `${taxRate}%` : '০% (কোনো ভ্যাট নেই)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      placeholder="0"
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none pointer-events-none">
                      %
                    </span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {['0', '5', '7.5', '15'].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setTaxRate(rate)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          parseFloat(taxRate) === parseFloat(rate)
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Actions */}
            <div className="pt-2.5 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                পরিবর্তনগুলো সেভ করার জন্য <strong className="text-slate-600 font-semibold">Save Settings</strong> বাটনে ক্লিক করুন।
              </span>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Settings</span>
              </button>
            </div>
          </form>
        )}

          {/* TAB: RECEIPT & PRINTER */}
          {activeTab === 'printer' && (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Printer className="w-5 h-5 text-blue-600" />
                  <span>Receipt Printer Settings (প্রিন্টার সেটিংস)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose the thermal roll size or standard A4 paper format for printing bills
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {[
                  { size: '80mm', label: '80mm Standard', desc: 'Standard POS thermal printer roll' },
                  { size: '58mm', label: '58mm Mini', desc: 'Compact portable receipt printer' },
                  { size: 'A4', label: 'A4 Invoice', desc: 'Full page printed customer invoice' },
                ].map((item) => (
                  <button
                    key={item.size}
                    type="button"
                    onClick={() => {
                      setPrinterSize(item.size as any);
                      updateStoreInfo({ printerSize: item.size as any });
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${
                      printerSize === item.size
                        ? 'border-blue-600 bg-blue-50/50 text-blue-950 font-bold ring-2 ring-blue-500/20'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {printerSize === item.size && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                    <Printer className="w-6 h-6 mb-2 text-blue-600" />
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SUBSCRIPTION STATUS */}
          {activeTab === 'subscription' && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span>Subscription Plan (সাবস্ক্রিপশন প্ল্যান)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    আপনার দোকানের বর্তমান প্যাকেজ ও অ্যাক্টিভেশনের বিবরণ
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleRefreshSubscription}
                    disabled={refreshingSubscription}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs transition-colors"
                    title="Refresh Status"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${refreshingSubscription ? 'animate-spin text-blue-600' : ''}`}
                    />
                  </button>
                  {isFeatureEnabled('feat_online_payment') && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentFeedback(null);
                        setPaymentModalOpen(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Payment</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SUCCESS / ERROR FEEDBACK */}
              {paymentFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
                    paymentFeedback.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {paymentFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{paymentFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentFeedback(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ALERT BANNERS: EXPIRE DATE ER KASAKASI ASLE ALART DIBE */}
              {subMetrics.isExpired ? (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-rose-900">
                        সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে!
                      </h4>
                      <p className="text-xs text-rose-700 mt-0.5">
                        মেয়াদ উত্তীর্ণের তারিখ: {formatDate(subMetrics.expiryDate)}। সফটওয়্যার চালু রাখতে পেমেন্ট সম্পন্ন করুন।
                      </p>
                    </div>
                  </div>
                  {isFeatureEnabled('feat_online_payment') && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentFeedback(null);
                        setPaymentModalOpen(true);
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs shrink-0 transition-colors"
                    >
                      Add New Payment
                    </button>
                  )}
                </div>
              ) : subMetrics.isExpiringSoon ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 animate-pulse">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-amber-900">
                        মেয়াদ শেষ হতে আর মাত্র {subMetrics.daysRemaining} দিন বাকি আছে!
                      </h4>
                      <p className="text-xs text-amber-700 mt-0.5">
                        পরবর্তী বিলিং তারিখ: {formatDate(subMetrics.expiryDate)}। নিরবচ্ছিন্ন সেবার জন্য এখনই নবায়ন করুন।
                      </p>
                    </div>
                  </div>
                  {isFeatureEnabled('feat_online_payment') && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentFeedback(null);
                        setPaymentModalOpen(true);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs shrink-0 transition-colors"
                    >
                      Add New Payment
                    </button>
                  )}
                </div>
              ) : null}

              {/* SIMPLE SUBSCRIPTION OVERVIEW CARD: PLAN KOTODIN ACTIVE ASE SETA DEKA JABE */}
              <div className="p-5 rounded-2xl bg-linear-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-200/80 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-blue-100">
                  <div>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      subMetrics.isTrial ? 'text-emerald-700 bg-emerald-100' : 'text-blue-700 bg-blue-100'
                    }`}>
                      {subMetrics.isTrial ? '14-Day Free Trial (ফ্রি ট্রায়াল)' : 'Standard Plan (সক্রিয় প্ল্যান)'}
                    </span>
                    <h4 className="text-xl font-black text-slate-900 mt-1">
                      {subMetrics.isTrial ? 'Trial (১৪ দিন ফ্রি)' : 'Standard Plan'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {subMetrics.isTrial
                        ? 'ফুল পিওএস রেজিস্টার • আনলিমিটেড পণ্য ও সেলস রিপোর্ট (টাকা লাগবে না)'
                        : 'ফুল পিওএস রেজিস্টার • আনলিমিটেড পণ্য ও সেলস রিপোর্ট • নিরবচ্ছিন্ন ক্লাউড সেবা'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                        subMetrics.isExpired
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : subMetrics.isExpiringSoon
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          subMetrics.isExpired
                            ? 'bg-rose-500'
                            : subMetrics.isExpiringSoon
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <span>
                        {subMetrics.isExpired
                          ? 'Expired'
                          : subMetrics.isExpiringSoon
                          ? `Expiring Soon (${subMetrics.daysRemaining}d left)`
                          : subMetrics.isTrial
                          ? `Trial Active (${subMetrics.daysRemaining}d left)`
                          : 'Active & Valid'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* 3 CLEAN SIMPLE STATS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-400 block">চলতি প্ল্যান সক্রিয় আছে</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-black text-slate-900">{subMetrics.daysActive}</span>
                      <span className="text-xs font-semibold text-slate-500">দিন</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      শুরু: {formatDate(subMetrics.startDate)}
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-400 block">মেয়াদ বাকি আছে</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span
                        className={`text-xl font-black ${
                          subMetrics.isExpired
                            ? 'text-rose-600'
                            : subMetrics.isExpiringSoon
                            ? 'text-amber-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {subMetrics.isExpired ? 'মেয়াদোত্তীর্ণ' : `${subMetrics.daysRemaining} দিন`}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      শেষ তারিখ: {formatDate(subMetrics.expiryDate)}
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-400 block">প্যাকেজ মূল্য</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-black text-slate-900">
                        {subMetrics.isTrial ? '৳ 0' : `৳ ${storeInfo.subscription?.amount || 999}`}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {subMetrics.isTrial ? ' (ফ্রি ট্রায়াল)' : ` / ${storeInfo.subscription?.billingCycle === 'yearly' ? 'বছর' : 'মাস'}`}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {subMetrics.isTrial ? 'টাকা লাগবে না • ১৪ দিন ফ্রি' : 'স্ট্যান্ডার্ড সাবস্ক্রিপশন'}
                    </span>
                  </div>
                </div>

                {/* SIMPLE PROGRESS BAR */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-medium">
                    <span>শুরু: {formatDate(subMetrics.startDate)}</span>
                    <span className="font-bold text-slate-700">
                      {subMetrics.daysActive} দিন পার ({subMetrics.percentElapsed}%) • {subMetrics.daysRemaining} দিন বাকি
                    </span>
                    <span>মেয়াদ শেষ: {formatDate(subMetrics.expiryDate)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        subMetrics.isExpired
                          ? 'bg-rose-500'
                          : subMetrics.isExpiringSoon
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${subMetrics.percentElapsed}%` }}
                    />
                  </div>
                </div>

                {/* ACTION BUTTON */}
                <div className="pt-2 flex items-center justify-end">
                  {isFeatureEnabled('feat_online_payment') ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentFeedback(null);
                        setPaymentModalOpen(true);
                      }}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{subMetrics.isTrial ? 'Upgrade to Standard (স্ট্যান্ডার্ড প্ল্যানে আপগ্রেড)' : 'Add New Payment (নবায়ন করুন)'}</span>
                    </button>
                  ) : (
                    <div className="text-xs text-slate-500 font-semibold bg-slate-100 px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-slate-200">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Online payment submission is disabled by platform admin</span>
                    </div>
                  )}
                </div>
              </div>

              {/* PAYMENT HISTORY TABLE (CLEAN & SIMPLE) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Payment History (পেমেন্ট রেকর্ড)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    মোট রেকর্ড: {payments.length} টি
                  </span>
                </div>

                {paymentsLoading ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-blue-600" />
                    <span>লোড হচ্ছে...</span>
                  </div>
                ) : payments.length === 0 ? (
                  <div className="py-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5">
                    <CreditCard className="w-7 h-7 mx-auto text-slate-300 mb-1" />
                    <p className="text-xs font-bold text-slate-600">কোন পেমেন্ট রেকর্ড নেই</p>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentFeedback(null);
                        setPaymentModalOpen(true);
                      }}
                      className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                    >
                      + Add New Payment
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                        <tr>
                          <th className="px-4 py-2.5">তারিখ ও সময়</th>
                          <th className="px-4 py-2.5">TrxID</th>
                          <th className="px-4 py-2.5">মেথড</th>
                          <th className="px-4 py-2.5 text-right">পরিমাণ</th>
                          <th className="px-4 py-2.5 text-center">স্ট্যাটাস</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map((p) => (
                          <tr key={p._id || p.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                              {formatDateTime(p.submittedAt || p.createdAt)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {p.transactionId}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-700">
                              {p.method}
                            </td>
                            <td className="px-4 py-2.5 text-right font-black text-slate-900">
                              ৳ {p.amount}
                            </td>
                            <td className="px-4 py-2.5 text-center whitespace-nowrap">
                              {p.status === 'approved' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Approved
                                </span>
                              )}
                              {p.status === 'pending' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                                  Pending
                                </span>
                              )}
                              {p.status === 'rejected' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  Rejected
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: HELP & SUPPORT SYSTEM (MINIMAL & MOBILE FRIENDLY) */}
          {activeTab === 'support' && (
            <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150">
              {/* Minimal Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Headphones className="w-4 h-4" />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        সহায়তা ও সাপোর্ট (Help & Support)
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 pl-10">
                      ShopPOS সফটওয়্যারে যেকোনো প্রশ্ন বা প্রয়োজনে সরাসরি যোগাযোগ করুন
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[11px] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>24/7 লাইভ সাপোর্ট</span>
                  </div>
                </div>

                {/* 3 Quick Action Contact Buttons - Mobile-first touch friendly */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-100">
                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/8801700000000?text=${encodeURIComponent(
                      `আসসালামু আলাইকুম, আমি ShopPOS ব্যবহারকারী। আমার দোকান: ${storeInfo.name} (${storeInfo.branch}), ফোন: ${storeInfo.phone || 'N/A'}। আমার সহায়তা প্রয়োজন:`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 active:bg-emerald-200/80 border border-emerald-200/70 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">WhatsApp চ্যাট</p>
                        <p className="text-[11px] text-emerald-700 font-medium">তাৎক্ষণিক সমাধান</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </a>

                  {/* Phone Call */}
                  <a
                    href="tel:+8801700000000"
                    className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100/80 active:bg-blue-200/80 border border-blue-200/70 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-blue-900">হটলাইনে কল</p>
                        <p className="text-[11px] text-blue-700 font-medium">+880 1700-000000</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </a>

                  {/* Email */}
                  <a
                    href={`mailto:support@shoppos.cloud?subject=${encodeURIComponent(
                      `Support Request - ${storeInfo.name}`
                    )}`}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200/70 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-slate-950">ইমেইল পাঠান</p>
                        <p className="text-[11px] text-slate-500 font-medium truncate max-w-[130px] sm:max-w-none">support@shoppos.cloud</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </a>
                </div>
              </div>

              {/* Support Tickets - Segmented Mobile-Friendly Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs">
                {/* Segmented Switch */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 flex-wrap">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSupportTicketTab('create')}
                      className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        supportTicketTab === 'create'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>নতুন টিকেট (New Ticket)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSupportTicketTab('list')}
                      className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        supportTicketTab === 'list'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>আমার টিকেট ({supportTickets.length})</span>
                    </button>
                  </div>

                  {supportTicketTab === 'list' && (
                    <button
                      type="button"
                      onClick={() => setSupportTicketTab('create')}
                      className="text-xs text-blue-600 font-bold hover:underline hidden sm:flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>টিকেট খুলুন</span>
                    </button>
                  )}
                </div>

                {ticketFeedback && (
                  <div className="mt-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{ticketFeedback}</span>
                  </div>
                )}

                {/* Sub-tab 1: Minimal Ticket Creation Form */}
                {supportTicketTab === 'create' && (
                  <form onSubmit={handleCreateTicket} className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          সমস্যার বিষয় বা ক্যাটাগরি
                        </label>
                        <select
                          value={ticketCategory}
                          onChange={(e) => setTicketCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
                        >
                          <option value="POS & Billing">POS ও বিলিং সমস্যা</option>
                          <option value="Thermal Printer">থার্মাল প্রিন্টার ও রিসিট</option>
                          <option value="Stock & Inventory">পণ্য ও স্টক হিসাব</option>
                          <option value="Subscription & Payment">সাবস্ক্রিপশন ও পেমেন্ট</option>
                          <option value="Store Profile & Settings">দোকান সেটিংস</option>
                          <option value="Feature Request">নতুন ফিচারের পরামর্শ</option>
                          <option value="Other">অন্যান্য</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          যোগাযোগের ফোন নম্বর
                        </label>
                        <input
                          type="tel"
                          value={ticketPhone}
                          onChange={(e) => setTicketPhone(e.target.value)}
                          placeholder="017XXXXXXXX"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        সংক্ষিপ্ত শিরোনাম (Subject) *
                      </label>
                      <input
                        type="text"
                        required
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        placeholder="যেমন: প্রিন্টারে লেখা অস্পষ্ট আসছে"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        বিস্তারিত বিবরণ (Details) *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                        placeholder="সমস্যার বিস্তারিত লিখুন..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white resize-none"
                      />
                    </div>

                    <div className="pt-1 flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={ticketSubmitting}
                        className="w-full sm:w-auto py-2.5 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {ticketSubmitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>পাঠানো হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>টিকেট জমা দিন (Submit)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Sub-tab 2: Minimal Tickets History */}
                {supportTicketTab === 'list' && (
                  <div className="mt-3">
                    {supportLoading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-2" />
                        <p className="text-xs text-slate-500">টিকেট লোড হচ্ছে...</p>
                      </div>
                    ) : supportTickets.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">কোনো সাপোর্ট টিকেট নেই</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">কোনো সমস্যা হলে নতুন টিকেট জমা দিন</p>
                        <button
                          type="button"
                          onClick={() => setSupportTicketTab('create')}
                          className="mt-3 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>নতুন টিকেট তৈরি করুন</span>
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {supportTickets.map((t) => {
                          const ticketId = t._id || t.id || '';
                          const shortId = ticketId.slice(-6).toUpperCase();
                          const lastMsg = t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1].text : (t.message || '');
                          return (
                            <div
                              key={ticketId}
                              onClick={() => setSelectedTicketForChat(t)}
                              className="py-3 first:pt-1 last:pb-1 space-y-1.5 hover:bg-slate-50/80 p-2.5 rounded-xl cursor-pointer transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                    #{shortId}
                                  </span>
                                  {t.category && (
                                    <span className="text-[10px] text-slate-500 font-semibold">
                                      {t.category}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  {t.status === 'open' && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                      <span>খোলা</span>
                                    </span>
                                  )}
                                  {t.status === 'in_progress' && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                                      প্রক্রিয়াধীন
                                    </span>
                                  )}
                                  {t.status === 'resolved' && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 inline-flex items-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span>সমাধানকৃত</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <h4 className="text-xs font-bold text-slate-900 pt-0.5">{t.subject}</h4>
                              <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                                {lastMsg || 'বিস্তারিত দেখতে ক্লিক করুন'}
                              </p>
                              <div className="flex items-center justify-between pt-0.5">
                                <p className="text-[10px] text-slate-400">
                                  {new Date(t.createdAt).toLocaleDateString('bn-BD', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </p>
                                <span className="text-[10px] text-blue-600 font-bold inline-flex items-center gap-1 hover:underline">
                                  <MessageCircle className="w-3 h-3" />
                                  <span>{t.messages?.length || 1} টি বার্তা • দেখুন</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Minimal FAQ Section */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    সাধারণ জিজ্ঞাসা (FAQ)
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    {
                      q: 'থার্মাল প্রিন্টার থেকে রিসিট প্রিন্ট হচ্ছে না, কী করব?',
                      a: 'দোকান সেটিংসের Printer ট্যাবে গিয়ে সঠিক সাইজ (80mm বা 58mm) সিলেক্ট করুন এবং ব্রাউজারের প্রিন্ট ডায়ালগে আপনার প্রিন্টারটি ডিফল্ট হিসেবে সিলেক্ট করুন।',
                    },
                    {
                      q: 'সাবস্ক্রিপশন ফি কীভাবে পরিশোধ করব?',
                      a: 'Subscription ট্যাবে গিয়ে Add New Payment বাটনে ক্লিক করুন। বিকাশ, নগদ বা রকেটে টাকা পাঠিয়ে TrxID সাবমিট করলেই রিনিউ হবে।',
                    },
                    {
                      q: 'বারকোড স্ক্যানার কীভাবে কানেক্ট করব?',
                      a: 'যেকোনো সাধারণ USB বা Bluetooth বারকোড স্ক্যানার কম্পিউটারে প্লাগ করলেই সরাসরি কাজ করবে। কোনো ড্রাইভার ইন্সটলের প্রয়োজন নেই।',
                    },
                    {
                      q: 'AnyDesk রিমোট সাপোর্ট পেতে কী করতে হবে?',
                      a: 'কম্পিউটারে AnyDesk ওপেন করে আমাদের WhatsApp নম্বরে আইডি ও পাসওয়ার্ড মেসেজ করুন। আমাদের টিম সরাসরি স্ক্রিন কানেক্ট করে সেটআপ করে দেবে।',
                    },
                  ].map((faq, i) => {
                    const isOpen = activeFaqIndex === i;
                    return (
                      <div key={i} className="py-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveFaqIndex(isOpen ? null : i)}
                          className="w-full flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:text-blue-600 transition-colors cursor-pointer gap-2 select-none"
                        >
                          <span>{faq.q}</span>
                          {isOpen ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                            {faq.a}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

      {/* ADD NEW PAYMENT MODAL: ADD NEW PAYMENT KORLE PAYMENT SYSTEM DEKABE */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <span>Add New Payment (পেমেন্ট করুন)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  টাকা পাঠিয়ে ট্রানজেকশন আইডি (TrxID) সাবমিট করুন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
              {/* TARGET PLAN INFO: Standard Plan Renewal / Upgrade */}
              <div className="p-3.5 rounded-2xl bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
                    {subMetrics.isTrial ? 'আপগ্রেড প্যাকেজ' : 'নবায়ন প্যাকেজ'}
                  </span>
                  <h5 className="font-extrabold text-sm text-slate-900 mt-0.5">
                    Standard Plan (একই ফিচার • নিয়মিত সেবা)
                  </h5>
                  <span className="text-[11px] text-slate-500">
                    ৳ ৯৯৯ / মাস {subMetrics.isTrial ? '(Trial শেষে নিয়মিত ব্যবহারের জন্য)' : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold">মোট প্রদেয়</span>
                  <span className="text-base font-black text-blue-700">
                    ৳ {calculateTotalAmount(999, selectedDurationMonths)}
                  </span>
                </div>
              </div>

              {/* DURATION PICKER */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  কত মাসের জন্য রিনিউ করবেন (Duration)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { months: 1, label: '১ মাস', badge: null },
                    { months: 3, label: '৩ মাস', badge: '৫% ছাড়' },
                    { months: 6, label: '৬ মাস', badge: '১০% ছাড়' },
                    { months: 12, label: '১ বছর', badge: '২০% ছাড়' },
                  ].map((d) => {
                    const isSelected = selectedDurationMonths === d.months;
                    return (
                      <button
                        key={d.months}
                        type="button"
                        onClick={() => setSelectedDurationMonths(d.months)}
                        className={`py-2 px-1 rounded-xl border text-center font-bold text-[11px] transition-all relative ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block">{d.label}</span>
                        {d.badge && (
                          <span
                            className={`text-[9px] block mt-0.5 ${
                              isSelected ? 'text-blue-100 font-normal' : 'text-emerald-600'
                            }`}
                          >
                            {d.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PAYMENT METHOD PICKER */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  পেমেন্ট মাধ্যম বেছে নিন
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'bKash', name: 'bKash' },
                    { id: 'Nagad', name: 'Nagad' },
                    { id: 'Rocket', name: 'Rocket' },
                    { id: 'Bank', name: 'Bank' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id as any)}
                      className={`py-2 px-1 rounded-xl border text-center font-bold text-xs transition-all ${
                        selectedMethod === m.id
                          ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* ACCOUNT NUMBER WITH ONE-CLICK COPY */}
              <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between gap-2 shadow-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    {selectedMethod === 'bKash' && 'বিকাশ Personal (Send Money করুন)'}
                    {selectedMethod === 'Nagad' && 'নগদ Personal (Send Money করুন)'}
                    {selectedMethod === 'Rocket' && 'রকেট Personal'}
                    {selectedMethod === 'Bank' && 'ব্যাংক A/C: 1502-8829-1001'}
                  </span>
                  <span className="font-mono font-bold text-sm text-amber-300">
                    {selectedMethod === 'Bank'
                      ? '1502-8829-1001'
                      : selectedMethod === 'bKash'
                      ? '01798-123456'
                      : selectedMethod === 'Nagad'
                      ? '01898-123456'
                      : '01998-123456-7'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const num =
                      selectedMethod === 'Bank'
                        ? '1502-8829-1001'
                        : selectedMethod === 'bKash'
                        ? '01798123456'
                        : selectedMethod === 'Nagad'
                        ? '01898123456'
                        : '019981234567';
                    copyToClipboard(num, 'modal_payment_num');
                  }}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey === 'modal_payment_num' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* SENDER NUMBER & TRXID INPUTS */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  প্রেরকের মোবাইল নম্বর (Sender Phone) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="e.g. 01700000000"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ট্রানজেকশন আইডি (TrxID) *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                    placeholder="e.g. 9J8K2LA19"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  মন্তব্য / নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Renewal for 3 months"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {paymentSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>পাঠানো হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Payment (জমা দিন)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* OWNER SUPPORT TICKET CONVERSATION MODAL */}
      {selectedTicketForChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/70">
                    #{(selectedTicketForChat._id || selectedTicketForChat.id || '').slice(-6).toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedTicketForChat.status === 'resolved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedTicketForChat.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {selectedTicketForChat.status === 'resolved'
                      ? 'সমাধানকৃত'
                      : selectedTicketForChat.status === 'in_progress'
                      ? 'প্রক্রিয়াধীন'
                      : 'খোলা আছে'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-1 truncate">
                  {selectedTicketForChat.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketForChat(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Message Thread */}
            <div className="flex-1 overflow-y-auto py-3.5 space-y-3 pr-1">
              {(!selectedTicketForChat.messages || selectedTicketForChat.messages.length === 0) ? (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                    <span>{selectedTicketForChat.ownerName || 'দোকান মালিক'}</span>
                    <span className="text-[10px] text-slate-400">{formatDateTime(selectedTicketForChat.createdAt)}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {selectedTicketForChat.message || 'কোনো মেসেজ নেই'}
                  </p>
                </div>
              ) : (
                selectedTicketForChat.messages.map((msg, i) => {
                  const isOwner = msg.senderRole === 'Owner' || msg.sender === storeInfo.name;
                  return (
                    <div
                      key={msg.id || i}
                      className={`flex flex-col ${isOwner ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-slate-600">
                          {isOwner ? 'আপনি' : msg.sender || 'এডমিন সাপোর্ট'}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {formatDateTime(msg.timestamp)}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                          isOwner
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

            {/* Modal Footer - Reply Box */}
            <form onSubmit={handleSendOwnerReply} className="pt-3 border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={ownerReplyText}
                onChange={(e) => setOwnerReplyText(e.target.value)}
                placeholder="নতুন বার্তা লিখুন..."
                disabled={ownerReplySubmitting}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={ownerReplySubmitting || !ownerReplyText.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {ownerReplySubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>পাঠান</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
