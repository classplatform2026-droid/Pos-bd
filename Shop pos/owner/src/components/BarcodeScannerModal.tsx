import React, { useState } from 'react';
import { Barcode, X, Check, AlertCircle } from 'lucide-react';
import { usePos } from '../context/PosContext';

interface BarcodeScannerModalProps {
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onClose }) => {
  const { products, addToCart } = usePos();
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleScan = (barcodeToScan: string) => {
    const trimmed = barcodeToScan.trim();
    if (!trimmed) return;

    const matched = products.find(
      (p) =>
        p.barcode.toLowerCase() === trimmed.toLowerCase() ||
        p.sku.toLowerCase() === trimmed.toLowerCase()
    );

    if (matched) {
      if (matched.stock <= 0) {
        setFeedback({ type: 'error', message: `${matched.name} is currently out of stock.` });
      } else {
        addToCart(matched, 1);
        setFeedback({ type: 'success', message: `Added "${matched.name}" to cart!` });
        setCode('');
      }
    } else {
      setFeedback({ type: 'error', message: `No product found for barcode: ${trimmed}` });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(code);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Barcode Scanner Simulation</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-500">
            Scan with a USB/Bluetooth barcode gun, type the SKU/Barcode manually, or click any demo barcode below:
          </p>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Scan or enter barcode (e.g. 890103001)..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Scan
            </button>
          </form>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Quick Click Barcodes
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {products.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleScan(p.barcode)}
                  className="p-2 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 text-left transition-colors flex flex-col"
                >
                  <span className="text-xs font-semibold text-slate-800 truncate">{p.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">{p.barcode}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
