import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Printer,
  PlusCircle,
  X,
  Store,
  User,
  Phone,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Sale } from '../types';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
  onNewSale?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  onClose,
  onNewSale,
}) => {
  const { storeInfo, setActiveScreen, updateStoreInfo } = usePos();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [printerFormat, setPrinterFormat] = useState<'58mm' | '80mm' | 'A4'>(
    (storeInfo.printerSize as '58mm' | '80mm' | 'A4') || '80mm'
  );

  const handleSelectPrinterFormat = (fmt: '58mm' | '80mm' | 'A4') => {
    setPrinterFormat(fmt);
    updateStoreInfo({ printerSize: fmt });
  };

  const handlePrint = () => {
    const styleId = 'thermal-printer-page-rules';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    if (printerFormat === '58mm') {
      styleTag.textContent = `
        @page { size: 58mm auto; margin: 0; }
        @media print {
          body { margin: 0 !important; padding: 0 !important; }
          #printable-receipt {
            width: 58mm !important;
            max-width: 58mm !important;
            padding: 2.5mm 2mm !important;
            font-size: 10px !important;
            line-height: 1.25 !important;
          }
          #printable-receipt * {
            font-size: 9.5px !important;
          }
          #printable-receipt h2 {
            font-size: 13px !important;
          }
        }
      `;
    } else if (printerFormat === '80mm') {
      styleTag.textContent = `
        @page { size: 80mm auto; margin: 0; }
        @media print {
          body { margin: 0 !important; padding: 0 !important; }
          #printable-receipt {
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 5mm 4mm !important;
            font-size: 11.5px !important;
            line-height: 1.35 !important;
          }
          #printable-receipt h2 {
            font-size: 16px !important;
          }
        }
      `;
    } else {
      styleTag.textContent = `
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          body { margin: 0 !important; padding: 0 !important; }
          #printable-receipt {
            width: 100% !important;
            max-width: 210mm !important;
            padding: 10mm 12mm !important;
            font-size: 13px !important;
            margin: 0 auto !important;
          }
          #printable-receipt h2 {
            font-size: 20px !important;
          }
        }
      `;
    }

    window.print();
  };

  const handleNewSale = () => {
    onClose();
    setActiveScreen('pos');
    onNewSale?.();
  };

  const saleDate = new Date(sale.createdAt);
  const formattedDate = saleDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = saleDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate tax accurately even if legacy sale doc had 0 or undefined taxAmount
  const discountVal = sale.discountAmount || 0;
  const netSubtotal = Math.max(0, sale.subtotal - discountVal);
  const effectiveTaxAmount =
    typeof sale.taxAmount === 'number' && sale.taxAmount > 0
      ? sale.taxAmount
      : Math.max(0, Math.round(sale.total - netSubtotal));

  const effectiveTaxRate =
    storeInfo.taxRate > 0
      ? storeInfo.taxRate
      : (netSubtotal > 0 && effectiveTaxAmount > 0
          ? Math.round((effectiveTaxAmount / netSubtotal) * 100)
          : 0);

  const is58mm = printerFormat === '58mm';
  const isA4 = printerFormat === 'A4';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Sale Receipt (বিক্রয় রসিদ)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printer Format Switcher Banner */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Printer className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">Paper Size:</span>
          </div>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => handleSelectPrinterFormat('58mm')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                printerFormat === '58mm'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              58mm Mini
            </button>
            <button
              type="button"
              onClick={() => handleSelectPrinterFormat('80mm')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                printerFormat === '80mm'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              80mm Standard
            </button>
            <button
              type="button"
              onClick={() => handleSelectPrinterFormat('A4')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                printerFormat === 'A4'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              A4 Invoice
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 flex flex-col items-center">
          {/* Success Header Status */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 ring-6 ring-emerald-50">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Sale Completed!
            </h3>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">
              Invoice #{sale.invoiceNo}
            </p>
            <p className="text-[11px] text-slate-400">
              {formattedDate} • {formattedTime}
            </p>
          </div>

          {/* Printable Receipt Paper Container */}
          <div
            id="printable-receipt"
            ref={receiptRef}
            className={`bg-slate-50/80 border border-slate-200/90 rounded-2xl text-slate-800 shadow-2xs transition-all ${
              printerFormat === '58mm'
                ? 'print-format-58mm w-full max-w-[280px] p-3 text-[11px]'
                : printerFormat === '80mm'
                ? 'print-format-80mm w-full max-w-[380px] p-5 text-xs'
                : 'print-format-A4 w-full max-w-full p-6 text-sm'
            }`}
          >
            {/* Store Header */}
            <div className="text-center pb-3 mb-3 border-b border-dashed border-slate-300">
              <h2 className="font-extrabold text-base text-slate-900 tracking-tight">
                {storeInfo.name}
              </h2>
              {storeInfo.branch && (
                <p className="text-[11px] text-slate-600 font-medium">{storeInfo.branch}</p>
              )}
              {storeInfo.address && (
                <p className="text-[10px] text-slate-500 mt-0.5">{storeInfo.address}</p>
              )}
              {storeInfo.phone && (
                <p className="text-[10px] text-slate-500 font-mono">Tel: {storeInfo.phone}</p>
              )}

              <div className="mt-2 pt-2 border-t border-slate-200/80 flex justify-between text-[10px] text-slate-600 font-medium">
                <span>Invoice: #{sale.invoiceNo}</span>
                <span>{formattedDate} {formattedTime}</span>
              </div>
            </div>

            {/* Customer Information (গ্রাহকের তথ্য) - Always Visible */}
            <div className="mb-3 p-2 bg-white print:bg-transparent rounded-xl border border-slate-200 print:border-dashed print:border-slate-300 text-left space-y-1">
              <div className="flex justify-between items-center text-[10.5px]">
                <span className="text-slate-500 font-semibold flex items-center gap-1 text-[10px] uppercase tracking-wider">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Customer:</span>
                </span>
                <span className="font-bold text-slate-900 truncate max-w-[170px]">
                  {sale.customerName?.trim() ? sale.customerName : 'Walk-in Customer (খুচরা ক্রেতা)'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>Phone:</span>
                </span>
                {sale.customerPhone?.trim() ? (
                  <span className="font-mono font-bold text-slate-800">{sale.customerPhone}</span>
                ) : (
                  <span className="text-slate-400 italic">None / Walk-in</span>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-12 font-bold text-slate-500 pb-1 border-b border-slate-200 text-[10.5px]">
                <span className={is58mm ? 'col-span-5' : 'col-span-6'}>Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-right">Price</span>
                <span className={is58mm ? 'col-span-3 text-right' : 'col-span-2 text-right'}>Total</span>
              </div>

              {sale.items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 py-1 border-b border-slate-100 last:border-b-0 items-center font-medium receipt-item-row"
                >
                  <span className={`${is58mm ? 'col-span-5 text-[10px]' : 'col-span-6 text-[11px]'} font-semibold text-slate-800 truncate pr-1`}>
                    {item.productName}
                  </span>
                  <span className="col-span-2 text-center font-mono text-slate-600 text-[10px]">
                    {item.quantity}
                  </span>
                  <span className="col-span-2 text-right font-mono text-slate-600 text-[10px]">
                    {item.unitPrice.toLocaleString()}
                  </span>
                  <span className={`${is58mm ? 'col-span-3' : 'col-span-2'} text-right font-mono font-bold text-slate-900 text-[10px]`}>
                    {item.totalPrice.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Breakdown (Subtotal, Discount, Tax, Total, Payment, Change) */}
            <div className="mt-3 pt-2.5 border-t border-dashed border-slate-300 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">
                  {storeInfo.currency} {sale.subtotal.toLocaleString()}
                </span>
              </div>

              {discountVal > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount ({sale.discountType === 'percentage' ? `${sale.discountValue}%` : 'Flat'})</span>
                  <span className="font-mono tabular-nums">
                    - {storeInfo.currency} {discountVal.toLocaleString()}
                  </span>
                </div>
              )}

              {/* VAT / Tax Line - Crystal Clear Display */}
              {effectiveTaxAmount > 0 && (
                <div className="flex justify-between text-slate-700 font-medium">
                  <span>
                    Tax / VAT {effectiveTaxRate > 0 ? `(${effectiveTaxRate}%)` : ''}
                  </span>
                  <span className="font-mono tabular-nums font-semibold">
                    + {storeInfo.currency} {effectiveTaxAmount.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Final Net Total */}
              <div className="flex justify-between text-sm sm:text-base font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total Amount</span>
                <span className="font-mono tabular-nums text-blue-600 receipt-total">
                  {storeInfo.currency} {sale.total.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Payment Method</span>
                <span className="font-semibold text-slate-800">
                  {sale.paymentMethod}
                </span>
              </div>

              {/* Cash Paid & Change Returned */}
              {sale.paymentMethod === 'Cash' && typeof sale.amountReceived === 'number' && sale.amountReceived > 0 && (
                <>
                  <div className="flex justify-between text-[11px] text-slate-600 pt-0.5">
                    <span>Cash Paid (টাকা গ্রহন)</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {storeInfo.currency} {sale.amountReceived.toLocaleString()}
                    </span>
                  </div>
                  {typeof sale.changeGiven === 'number' && (
                    <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                      <span>Change Given (ফেরত টাকা)</span>
                      <span className="font-mono tabular-nums">
                        {storeInfo.currency} {sale.changeGiven.toLocaleString()}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Receipt Footer & Cashier */}
            <div className="text-center pt-3 mt-3 border-t border-slate-200 text-[10px] text-slate-400">
              <p>{storeInfo.receiptFooter || 'Thank you for shopping with us!'}</p>
              <p className="mt-0.5 font-mono text-slate-400">
                Served by: {sale.cashierName || 'Cashier'}
              </p>
              <p className="text-[9px] text-slate-300 mt-0.5">
                Format: {printerFormat}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3 shrink-0">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print ({printerFormat})</span>
          </button>
          <button
            onClick={handleNewSale}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Sale</span>
          </button>
        </div>
      </div>
    </div>
  );
};
