import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  ArrowRight,
  AlertCircle,
  X,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { PaymentMethod, Sale } from '../types';

export const SalesScreen: React.FC = () => {
  const { sales, storeInfo, setSelectedSaleForReceipt, refundSale } = usePos();
  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'All' | PaymentMethod>('All');
  const [saleToRefund, setSaleToRefund] = useState<Sale | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  const todayDateString = new Date().toDateString();

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const isToday = new Date(s.createdAt).toDateString() === todayDateString;
      const tabMatch = activeTab === 'today' ? isToday : !isToday;
      const queryMatch =
        !search ||
        s.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
        (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase())) ||
        (s.customerPhone && s.customerPhone.includes(search));
      const paymentMatch =
        paymentFilter === 'All' || s.paymentMethod === paymentFilter;
      return tabMatch && queryMatch && paymentMatch;
    });
  }, [sales, activeTab, search, paymentFilter, todayDateString]);

  const currentSalesTotal = filteredSales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.total, 0);
  const completedCount = filteredSales.filter((s) => s.status === 'completed').length;
  const avgOrderValue = completedCount > 0 ? Math.round(currentSalesTotal / completedCount) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sales & Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View transaction logs, invoice receipts, and issue refunds
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'today'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today's Sales
          </button>
          <button
            onClick={() => setActiveTab('previous')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'previous'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Previous History
          </button>
        </div>
      </div>

      {/* Summary KPI Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400">Total Volume (মোট বিক্রি)</span>
          <p className="text-lg sm:text-xl font-mono font-black text-slate-900 mt-1 tabular-nums">
            {storeInfo.currency} {currentSalesTotal.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400">Completed Orders (অর্ডার)</span>
          <p className="text-lg sm:text-xl font-mono font-black text-blue-600 mt-1 tabular-nums">
            {completedCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400">Avg Ticket Size (গড় বিক্রি)</span>
          <p className="text-lg sm:text-xl font-mono font-black text-emerald-600 mt-1 tabular-nums">
            {storeInfo.currency} {avgOrderValue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number (#1005) or customer phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto shrink-0">
          {(['All', 'Cash', 'bKash', 'Nagad'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setPaymentFilter(method)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                paymentFilter === method
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600">No sales transactions found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSales.map((sale) => {
              const saleDate = new Date(sale.createdAt);
              const formattedDate = saleDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const formattedTime = saleDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const isRefunded = sale.status === 'refunded';

              return (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSaleForReceipt(sale)}
                  className={`p-4 sm:px-6 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-center justify-between gap-4 ${
                    isRefunded ? 'opacity-60 bg-rose-50/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-mono font-bold text-xs shrink-0 border border-blue-100">
                      #{sale.invoiceNo}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          Invoice #{sale.invoiceNo}
                        </span>
                        {isRefunded && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                            Refunded
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>{formattedDate}, {formattedTime}</span>
                        <span>•</span>
                        <span>{sale.items.length} items</span>
                        <span>•</span>
                        <span className="font-medium text-slate-700">{sale.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-base font-bold font-mono text-slate-900 tabular-nums">
                        {storeInfo.currency} {sale.total.toLocaleString()}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[80px] sm:max-w-none">
                        by {sale.cashierName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSaleForReceipt(sale);
                      }}
                      className="p-1.5 sm:p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 active:scale-95 rounded-xl transition-all"
                      title="Print Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {!isRefunded && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRefundError(null);
                          setSaleToRefund(sale);
                        }}
                        className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 rounded-xl transition-all"
                        title="Refund this sale"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* In-app Refund Confirmation Modal */}
      {saleToRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 w-full max-w-md space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Confirm Sale Refund</h3>
              </div>
              <button
                onClick={() => {
                  setSaleToRefund(null);
                  setRefundError(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to refund Invoice <strong className="font-mono text-slate-900">#{saleToRefund.invoiceNo}</strong> (Total: {storeInfo.currency} {saleToRefund.total.toLocaleString()})?
              All <strong className="text-slate-900">{saleToRefund.items.length} items</strong> will be returned to store inventory.
            </p>

            {refundError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{refundError}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSaleToRefund(null);
                  setRefundError(null);
                }}
                disabled={isRefunding}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setRefundError(null);
                  setIsRefunding(true);
                  try {
                    await refundSale(saleToRefund.id);
                    setSaleToRefund(null);
                  } catch (err: any) {
                    setRefundError(err.message || 'Refund failed. Check permissions.');
                  } finally {
                    setIsRefunding(false);
                  }
                }}
                disabled={isRefunding}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-500/20 transition-colors disabled:opacity-50"
              >
                {isRefunding ? 'Processing...' : 'Yes, Refund Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
