import React, { useState, useMemo } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Tag,
  ArrowLeft,
  X,
  Banknote,
  Search,
  Barcode,
  Camera,
  Layers,
  ShoppingBag,
  AlertCircle,
  User,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { ProductThumb } from '../components/ProductThumb';

interface PosScreenProps {
  searchQuery?: string;
  onOpenBarcodeModal?: () => void;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  searchQuery = '',
  onOpenBarcodeModal,
}) => {
  const {
    products,
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    discountType,
    discountValue,
    discountAmount,
    setDiscount,
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    setCashReceived,
    cartSubtotal,
    cartTaxAmount,
    cartTotal,
    cartItemCount,
    completeSale,
    storeInfo,
    isMobileCartOpen,
    setIsMobileCartOpen,
    categories: contextCategories,
    isFeatureEnabled,
  } = usePos();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [internalSearch, setInternalSearch] = useState('');
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [tempDiscountType, setTempDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [tempDiscountValue, setTempDiscountValue] = useState<string>('0');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerInput, setShowCustomerInput] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>(['All', ...(contextCategories || [])]);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [contextCategories, products]);

  const effectiveSearch = (searchQuery || internalSearch).toLowerCase().trim();

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchCat =
        selectedCategory === 'All' || prod.category === selectedCategory;
      const matchQuery =
        !effectiveSearch ||
        prod.name.toLowerCase().includes(effectiveSearch) ||
        prod.sku.toLowerCase().includes(effectiveSearch) ||
        prod.barcode.toLowerCase().includes(effectiveSearch);
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, effectiveSearch]);

  const handleOpenDiscount = () => {
    setTempDiscountType(discountType);
    setTempDiscountValue(discountValue.toString());
    setDiscountModalOpen(true);
  };

  const handleSaveDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempDiscountValue) || 0;
    setDiscount(tempDiscountType, val);
    setDiscountModalOpen(false);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0 || isSubmittingSale) return;
    setCheckoutError(null);
    setIsSubmittingSale(true);
    try {
      await completeSale({
        name: customerName.trim() || undefined,
        phone: customerPhone.trim() || undefined,
      });
      setCustomerName('');
      setCustomerPhone('');
      setShowCustomerInput(false);
      setCheckoutError(null);
    } catch (err: any) {
      setCheckoutError(err.message || 'Failed to complete sale.');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const renderCartContent = (isMobileView = false) => (
    <div className="flex flex-col h-full bg-slate-50/40">
      {/* Compact Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          {isMobileView && (
            <button
              onClick={() => setIsMobileCartOpen(false)}
              className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">Cart (কার্ট)</h2>
          </div>
          <span className="text-[11px] bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded-full border border-blue-100">
            {cartItemCount}
          </span>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            title="Clear all cart items"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Cart Items List - High density, no wasted space */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-1.5 min-h-0">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-300 mb-2 shadow-2xs">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-700">Cart is empty</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-[190px]">
              পণ্য সিলেক্ট করে কার্টে যোগ করুন
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const itemTotal = item.product.price * item.quantity;
            return (
              <div
                key={item.product.id}
                className="flex items-center justify-between gap-2 p-2 rounded-xl border border-slate-200/70 bg-white hover:border-slate-300 transition-all shadow-2xs group"
              >
                {/* Product Snapshot & Unit Price */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <ProductThumb
                    iconType={item.product.iconType}
                    name={item.product.name}
                    category={item.product.category}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate" title={item.product.name}>
                      {item.product.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                      <span>{storeInfo.currency}{item.product.price.toLocaleString()}</span>
                      <span className="text-slate-300">×</span>
                      <span className="font-bold text-slate-700">{item.quantity}</span>
                      {item.product.unit && (
                        <span className="text-[10px] text-slate-400 font-sans">({item.product.unit})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Compact Stepper & Total */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.product.id, -1)}
                      className="w-5.5 h-5.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                      title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-2.5 h-2.5 text-rose-500" />
                      ) : (
                        <Minus className="w-2.5 h-2.5 text-slate-600" />
                      )}
                    </button>
                    <span className="w-6 text-center font-mono text-xs font-bold text-slate-900 select-none">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.product.id, 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="w-5.5 h-5.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Increase quantity"
                    >
                      <Plus className="w-2.5 h-2.5 text-slate-600" />
                    </button>
                  </div>

                  {/* Total Amount */}
                  <div className="text-right w-14 shrink-0">
                    <span className="text-xs font-mono font-black text-slate-900 block truncate">
                      {storeInfo.currency}{itemTotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Quick Remove Icon */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-slate-300 hover:text-rose-500 p-0.5 transition-colors cursor-pointer"
                    title="Remove from cart"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Checkout & Billing Section - Organized & Space-Efficient */}
      {cart.length > 0 ? (
        <div className="p-2.5 sm:p-3 border-t border-slate-200/80 bg-white space-y-2 shrink-0 shadow-lg">
          {/* Customer Input (Single Clean Expandable Line) */}
          <div>
            {!showCustomerInput ? (
              <div className="flex items-center justify-between text-xs px-0.5">
                <button
                  type="button"
                  onClick={() => setShowCustomerInput(true)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3 h-3 text-blue-500" />
                  <span>
                    {customerPhone || customerName ? (
                      <span className="text-slate-800 font-semibold">
                        {customerName || 'Customer'}: <span className="font-mono">{customerPhone}</span>
                      </span>
                    ) : (
                      '+ Add Customer (কাস্টমার নাম/ফোন)'
                    )}
                  </span>
                </button>
                {(customerPhone || customerName) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerName('');
                      setCustomerPhone('');
                    }}
                    className="text-[10px] text-slate-400 hover:text-rose-500 font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            ) : (
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-2.5 h-2.5 text-blue-600" />
                    <span>Customer Details</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCustomerInput(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    placeholder="Phone নম্বর"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Compact Billing Calculation Card */}
          <div className="p-2 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>Subtotal (সাবটোটাল)</span>
              <span className="font-mono font-bold text-slate-800">
                {storeInfo.currency} {cartSubtotal.toLocaleString()}
              </span>
            </div>

            {isFeatureEnabled('feat_discounts') && (
              <div className="flex justify-between items-center text-[11px]">
                <button
                  type="button"
                  onClick={handleOpenDiscount}
                  className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Tag className="w-2.5 h-2.5" />
                  <span>Discount (ছাড়)</span>
                </button>
                <span className="font-mono font-bold text-emerald-600">
                  {discountAmount > 0 ? `- ${storeInfo.currency} ${discountAmount.toLocaleString()}` : '৳ 0'}
                </span>
              </div>
            )}

            {cartTaxAmount > 0 && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Tax / ভ্যাট ({storeInfo.taxRate}%)</span>
                <span className="font-mono font-bold text-slate-700">
                  + {storeInfo.currency} {cartTaxAmount.toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 text-slate-900">
              <span className="text-xs font-black uppercase tracking-wider">Total (মোট বিল)</span>
              <span className="text-base font-black font-mono text-blue-600">
                {storeInfo.currency} {cartTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment Method - Compact Segmented Bar */}
          <div className="space-y-1.5">
            {isFeatureEnabled('feat_multi_payment') ? (
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cash')}
                  className={`py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'Cash'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Banknote className="w-3 h-3" />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bKash')}
                  className={`py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'bKash'
                      ? 'bg-[#E2136E] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>bKash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Nagad')}
                  className={`py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'Nagad'
                      ? 'bg-[#F7941D] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Nagad</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-emerald-50 text-[11px] text-emerald-800 font-bold border border-emerald-200/60">
                <span className="flex items-center gap-1">
                  <Banknote className="w-3 h-3 text-emerald-600" />
                  <span>Cash Payment (নগদ পেমেন্ট)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold font-mono">Standard</span>
              </div>
            )}

            {/* Cash Received & Live Change - Integrated Single Row */}
            {paymentMethod === 'Cash' && (
              <div className="p-2 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400 font-bold">
                      {storeInfo.currency}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={`টাকা গ্রহন (${cartTotal})`}
                      value={cashReceived}
                      onChange={(e) => {
                        setCashReceived(e.target.value);
                        if (checkoutError) setCheckoutError(null);
                      }}
                      className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Live Change/Due Pill */}
                  {(() => {
                    const rec = cashReceived ? parseFloat(cashReceived) : 0;
                    if (!rec) {
                      return (
                        <span className="text-[10px] text-slate-400 font-semibold px-1 shrink-0">
                          গৃহীত ক্যাশ
                        </span>
                      );
                    }
                    const change = rec - cartTotal;
                    if (change >= 0) {
                      return (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg shrink-0">
                          ফেরত: <strong className="font-mono">{storeInfo.currency}{change.toLocaleString()}</strong>
                        </span>
                      );
                    } else {
                      return (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg shrink-0">
                          বাকি: <strong className="font-mono">{storeInfo.currency}{Math.abs(change).toLocaleString()}</strong>
                        </span>
                      );
                    }
                  })()}
                </div>

                {/* Quick Cash Chips Row */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5">
                  <button
                    type="button"
                    onClick={() => setCashReceived(cartTotal.toString())}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-colors cursor-pointer shrink-0 ${
                      cashReceived === cartTotal.toString()
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    Exact ({storeInfo.currency}{cartTotal})
                  </button>
                  {[50, 100, 500, 1000].map((amt) => {
                    if (cartTotal > amt && amt < 500) return null;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashReceived(amt.toString())}
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border transition-colors cursor-pointer shrink-0 ${
                          cashReceived === amt.toString()
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {storeInfo.currency}{amt}
                      </button>
                    );
                  })}
                  {cashReceived && (
                    <button
                      type="button"
                      onClick={() => setCashReceived('')}
                      className="text-[10px] text-slate-400 hover:text-slate-600 ml-auto shrink-0 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Checkout Error */}
          {checkoutError && (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between gap-1.5 animate-in fade-in">
              <span className="font-medium truncate">{checkoutError}</span>
              <button
                type="button"
                onClick={() => setCheckoutError(null)}
                className="text-rose-400 hover:text-rose-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Complete Sale Action Button */}
          <button
            type="button"
            onClick={handleCompleteSale}
            disabled={isSubmittingSale}
            className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.99]"
          >
            <span>{isSubmittingSale ? 'Processing...' : 'Complete Sale (বিক্রি সম্পন্ন)'}</span>
            <span className="font-mono text-xs text-blue-100 font-extrabold">
              • {storeInfo.currency} {cartTotal.toLocaleString()}
            </span>
          </button>
        </div>
      ) : (
        <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between text-slate-400 text-xs shrink-0">
          <span className="font-semibold">কার্ট খালি</span>
          <span className="font-mono font-bold text-slate-500">{storeInfo.currency} 0</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/70 overflow-hidden">
        {/* Top Search & Barcode Scanner Bar */}
        <div className="p-3 bg-white border-b border-slate-200/80 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              placeholder="পণ্য খুঁজুন (নাম, SKU বা বারকোড)..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
            {internalSearch && (
              <button
                type="button"
                onClick={() => setInternalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {onOpenBarcodeModal && isFeatureEnabled('feat_barcode_scanner') && (
            <button
              type="button"
              onClick={onOpenBarcodeModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
              title="ক্যামেরা বারকোড স্ক্যানার ওপেন করুন"
            >
              <Camera className="w-4 h-4" />
              <Barcode className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">বারকোড স্ক্যান</span>
            </button>
          )}
        </div>

        <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-slate-200/60 overflow-x-auto flex items-center gap-2 shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
              <Layers className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-600">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((product) => {
                const inCartItem = cart.find((item) => item.product.id === product.id);
                const isOutOfStock = product.stock <= 0;
                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer relative ${
                      isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''
                    } ${inCartItem ? 'ring-2 ring-blue-500/20 border-blue-500 bg-blue-50/20' : ''}`}
                  >
                    {inCartItem && (
                      <span className="absolute top-2.5 right-2.5 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {inCartItem.quantity}
                      </span>
                    )}
                    <div className="flex items-center justify-center py-2 sm:py-3">
                      <ProductThumb
                        iconType={product.iconType}
                        name={product.name}
                        category={product.category}
                        size="md"
                      />
                    </div>
                    <div className="mt-2 space-y-1">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-900">
                          {storeInfo.currency} {product.price.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOutOfStock) addToCart(product);
                          }}
                          disabled={isOutOfStock}
                          className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Stock: {product.stock}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Cart Sidebar - Always visible on desktop (md and up) */}
      <div className="hidden md:flex w-76 lg:w-88 xl:w-96 bg-white border-l border-slate-200/80 flex-col h-full shrink-0 shadow-xs">
        {renderCartContent(false)}
      </div>

      {/* Mobile Floating Cart Summary Button */}
      {cartItemCount > 0 && !isMobileCartOpen && (
        <div className="md:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-30 animate-in fade-in slide-in-from-bottom-2">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-2xl p-3.5 shadow-xl flex items-center justify-between font-bold cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-xs">{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} in cart</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">{storeInfo.currency} {cartTotal.toLocaleString()}</span>
              <span className="text-xs">Checkout →</span>
            </div>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/60 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85vh] h-full flex flex-col overflow-hidden">
            {renderCartContent(true)}
          </div>
        </div>
      )}

      {discountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 w-full max-w-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>Add Discount (ছাড় নির্ধারণ)</span>
              </h3>
              <button
                type="button"
                onClick={() => setDiscountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveDiscount} className="mt-4 space-y-3.5">
              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTempDiscountType('flat')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    tempDiscountType === 'flat'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Flat ({storeInfo.currency})
                </button>
                <button
                  type="button"
                  onClick={() => setTempDiscountType('percentage')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    tempDiscountType === 'percentage'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Percentage (%)
                </button>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tempDiscountValue}
                  onChange={(e) => setTempDiscountValue(e.target.value)}
                  placeholder={tempDiscountType === 'percentage' ? 'e.g. 10' : 'e.g. 50'}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                  {tempDiscountType === 'percentage' ? '%' : storeInfo.currency}
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setDiscount('flat', 0);
                    setDiscountModalOpen(false);
                  }}
                  className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                >
                  Remove
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Apply Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
