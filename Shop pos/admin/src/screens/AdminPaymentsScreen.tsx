import React, { useState, useEffect } from 'react';
import { Search, X, Store, Plus, CheckCircle2, AlertCircle, Clock, Check, CreditCard, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { AdminPaymentItem } from '../types';

interface AdminPaymentsScreenProps {
  initialPaymentToReview?: any | null;
  initialOpenAddModal?: boolean;
  onClearAddModal?: () => void;
  onClearReviewPayment?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'danger') => void;
}

export const AdminPaymentsScreen: React.FC<AdminPaymentsScreenProps> = ({
  initialPaymentToReview,
  initialOpenAddModal,
  onClearAddModal,
  onClearReviewPayment,
  onShowToast,
}) => {
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentItem | null>(null);

  // Add Payment Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [amount, setAmount] = useState('999');
  const [method, setMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Bank' | 'Cash'>('bKash');
  const [transactionId, setTransactionId] = useState('');
  const [planName, setPlanName] = useState('Standard');
  const [senderPhone, setSenderPhone] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'approved' | 'pending'>('approved');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialOpenAddModal) {
      handleOpenAddModal();
      if (onClearAddModal) onClearAddModal();
    }
  }, [initialOpenAddModal]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminPayments({
        status: statusFilter,
        method: methodFilter,
        search,
      });
      if (res?.payments) {
        setPayments(res.payments);
      }
    } catch (err) {
      console.warn('Fetch payments notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const res = await api.getAdminStores();
      if (res?.stores) {
        setStores(res.stores);
        if (res.stores.length > 0 && !selectedStoreId) {
          setSelectedStoreId(res.stores[0]._id || res.stores[0].id);
        }
      }
    } catch (err) {
      console.warn('Load stores notice:', err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search, statusFilter, methodFilter]);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (initialPaymentToReview) {
      const match = payments.find(
        (p) => p._id === initialPaymentToReview.id || p.transactionId === initialPaymentToReview.transactionId
      );
      if (match) {
        setSelectedPayment(match);
      } else {
        setSelectedPayment({
          _id: initialPaymentToReview.id || 'pay_001',
          storeId: 'store_001',
          storeName: initialPaymentToReview.shop || 'Store',
          planName: 'Standard',
          transactionId: initialPaymentToReview.transactionId || `TXN-${Date.now().toString().slice(-6)}`,
          amount: 999,
          method: initialPaymentToReview.method || 'bKash',
          status: 'pending',
          submittedAt: new Date().toISOString(),
        });
      }
    }
  }, [initialPaymentToReview, payments]);

  const handleOpenAddModal = () => {
    setTransactionId(`TRX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) {
      setFormError('Please select a store.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    if (!transactionId.trim()) {
      setFormError('Transaction ID is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await api.createAdminPayment({
        storeId: selectedStoreId,
        amount: Number(amount),
        method,
        transactionId: transactionId.trim(),
        planName,
        status: paymentStatus,
        senderPhone: senderPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (onShowToast) {
        onShowToast(`Payment of ৳ ${amount} added successfully!`, 'success');
      }
      setIsAddModalOpen(false);
      fetchPayments();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!selectedPayment) return;
    try {
      await api.approveAdminPayment(selectedPayment._id);
      if (onShowToast) {
        onShowToast(`Payment approved: Store subscription is now active!`, 'success');
      }
      setSelectedPayment(null);
      if (onClearReviewPayment) onClearReviewPayment();
      fetchPayments();
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(err.message || 'Failed to approve payment.', 'danger');
      }
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedPayment) return;
    try {
      await api.rejectAdminPayment(selectedPayment._id, 'Payment rejected by administrator.');
      if (onShowToast) {
        onShowToast(`Payment ${selectedPayment.transactionId} was rejected.`, 'danger');
      }
      setSelectedPayment(null);
      if (onClearReviewPayment) onClearReviewPayment();
      fetchPayments();
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(err.message || 'Failed to reject payment.', 'danger');
      }
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Payments & Billing</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage subscription transactions & approvals</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment</span>
          </button>

          <button
            type="button"
            onClick={fetchPayments}
            disabled={loading}
            className="p-2 bg-white border border-slate-200/80 rounded-xl text-slate-600 hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors"
            title="Refresh payments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="relative min-w-[160px] flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by store or transaction ID..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 shrink-0">
            {['all', 'pending', 'approved', 'rejected'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg capitalize text-[11px] transition-colors cursor-pointer ${
                  statusFilter === s ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none shrink-0"
          >
            <option value="all">All Methods</option>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
            <option value="Rocket">Rocket</option>
            <option value="Upay">Upay</option>
            <option value="Bank">Bank</option>
            <option value="Cash">Cash</option>
          </select>
        </div>
      </div>

      {/* Payments Content: Responsive Table on Desktop, Cards on Mobile */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-4 font-semibold">Store</th>
                <th className="py-3 px-4 font-semibold">Transaction ID</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Method</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No payment records found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Record a new subscription transaction or payment approval.</p>
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Payment Now</span>
                    </button>
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{p.storeName}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{p.transactionId}</td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">৳ {p.amount}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {p.method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          p.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : p.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPayment(p)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="sm:hidden divide-y divide-slate-100">
          {payments.length === 0 ? (
            <div className="py-10 text-center text-slate-400 p-4">
              <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600 text-xs">No payments found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Record a subscription transaction or billing entry.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Payment Now</span>
              </button>
            </div>
          ) : (
            payments.map((p) => (
              <div
                key={p._id}
                onClick={() => setSelectedPayment(p)}
                className="p-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{p.storeName}</p>
                    <span
                      className={`px-2 py-0.2 rounded-full text-[9px] font-bold capitalize ${
                        p.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : p.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">Trx: {p.transactionId}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                    <span className="font-mono font-extrabold text-slate-900">৳ {p.amount}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-medium text-slate-600">{p.method}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPayment(p);
                  }}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold border border-blue-200/80 shrink-0"
                >
                  Review
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button for Add Payment */}
      <button
        type="button"
        onClick={handleOpenAddModal}
        className="sm:hidden fixed bottom-20 right-4 z-40 flex items-center gap-1.5 px-4 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-xl shadow-blue-600/30 font-bold text-xs cursor-pointer border border-blue-400/30"
        aria-label="Add Payment"
      >
        <Plus className="w-4 h-4" />
        <span>Add Payment</span>
      </button>

      {/* Review Payment Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">Payment Review</h2>
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-slate-900 text-sm truncate">{selectedPayment.storeName}</h3>
                <p className="text-[11px] text-slate-500">{selectedPayment.planName || 'Standard'} Plan</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-bold text-slate-900 font-mono text-sm">৳ {selectedPayment.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method</span>
                <span className="font-bold text-slate-800">{selectedPayment.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-mono font-bold text-blue-700">{selectedPayment.transactionId}</span>
              </div>
              {selectedPayment.senderPhone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Sender Phone</span>
                  <span className="font-mono text-slate-800">{selectedPayment.senderPhone}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">Current Status</span>
                <span className="font-bold capitalize">{selectedPayment.status}</span>
              </div>
            </div>

            {selectedPayment.status === 'pending' ? (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
                >
                  Approve & Activate
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs font-semibold text-slate-600">
                <span>Status:</span>
                <span className="capitalize font-bold text-slate-900">{selectedPayment.status}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Add New Payment</h2>
                  <p className="text-[11px] text-slate-400">Record a store subscription payment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePayment} className="space-y-3.5 text-xs">
              {/* Select Store */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Select Store (দোকান নির্বাচন করুন) *
                </label>
                <select
                  required
                  value={selectedStoreId}
                  onChange={(e) => {
                    setSelectedStoreId(e.target.value);
                    const found = stores.find((s) => (s._id || s.id) === e.target.value);
                    if (found?.subscription?.plan) {
                      setPlanName(found.subscription.plan);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {stores.length === 0 ? (
                    <option value="">No stores available</option>
                  ) : (
                    stores.map((s) => (
                      <option key={s._id || s.id} value={s._id || s.id}>
                        {s.name} ({s.branch || 'Main'}) - {s.subscription?.plan || 'Standard'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Amount & Plan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Amount (টাকা ৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="999"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <div className="flex items-center gap-1 mt-1.5 overflow-x-auto pb-0.5">
                    {['500', '999', '1500', '2500', '5000'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(amt)}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer shrink-0 ${
                          amount === amt
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        ৳{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Subscription Plan
                  </label>
                  <select
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="Trial">Trial (১৪ দিন)</option>
                    <option value="Standard">Standard (মাসিক)</option>
                    <option value="Professional">Professional</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Payment Method (পদ্ধতি) *
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['bKash', 'Nagad', 'Rocket', 'Upay', 'Bank', 'Cash'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        method === m
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction ID with Auto-gen button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Transaction ID (TrxID) *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setTransactionId(`TRX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`)
                    }
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. BL92KA81P"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Sender Phone (Optional) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Sender Phone Number (প্রেরক নম্বর - ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none"
                />
              </div>

              {/* Status Radio */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Payment Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('approved')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      paymentStatus === 'approved'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-bold">Approved</p>
                      <p className="text-[10px] text-slate-500">Auto-activate store</p>
                    </div>
                    {paymentStatus === 'approved' && <Check className="w-4 h-4 text-emerald-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentStatus('pending')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      paymentStatus === 'pending'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-500/20'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-bold">Pending</p>
                      <p className="text-[10px] text-slate-500">Requires review</p>
                    </div>
                    {paymentStatus === 'pending' && <Check className="w-4 h-4 text-amber-600" />}
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Notes / Remarks (মন্তব্য)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Direct cash collected or bKash payment"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm shadow-blue-500/20 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
