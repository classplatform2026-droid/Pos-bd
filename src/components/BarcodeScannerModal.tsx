import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CameraOff,
  Barcode,
  X,
  Check,
  AlertCircle,
  Plus,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Volume2,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { usePos } from '../context/PosContext';
import { Product } from '../types';
import { ProductThumb } from './ProductThumb';
import { playSound } from '../utils/sound';

interface BarcodeScannerModalProps {
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onClose }) => {
  const { products, addToCart, storeInfo } = usePos();
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  
  // Camera scanning states
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Currently scanned/detected product state
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scanQuantity, setScanQuantity] = useState<number>(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [lastScannedTime, setLastScannedTime] = useState<number>(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isComponentMounted = useRef<boolean>(true);

  // Match product by barcode or SKU
  const findProductByCode = (rawCode: string): Product | null => {
    const trimmed = rawCode.trim().toLowerCase();
    if (!trimmed) return null;
    return (
      products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === trimmed) ||
          (p.sku && p.sku.toLowerCase() === trimmed)
      ) || null
    );
  };

  // Process detected barcode from camera or manual
  const handleBarcodeDetected = (decodedText: string) => {
    const now = Date.now();
    // Prevent duplicate triggers within 1.5 seconds if same code
    if (decodedText === scannedCode && now - lastScannedTime < 1500) {
      return;
    }

    setLastScannedTime(now);
    setScannedCode(decodedText);
    playSound('beep');

    const matched = findProductByCode(decodedText);
    if (matched) {
      setScannedProduct(matched);
      setScanQuantity(1);
      setFeedback({
        type: 'info',
        message: `প্রোডাক্ট পাওয়া গেছে: "${matched.name}"। কার্টে যোগ করতে নিচের "Add to Cart" বাটনে চাপুন।`,
      });
    } else {
      setScannedProduct(null);
      setFeedback({
        type: 'error',
        message: `বারকোড "${decodedText}" দিয়ে কোনো পণ্য পাওয়া যায়নি। ম্যানুয়ালি চেক করুন বা অন্য বারকোড স্ক্যান করুন।`,
      });
    }
  };

  // Start HTML5-QRCode camera
  const startCamera = async () => {
    const readerElement = document.getElementById('barcode-camera-reader');
    if (!readerElement) return;

    try {
      setCameraError(null);
      setCameraPermission('pending');

      // Stop previous instance if running
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch {
          // Ignore cleanup errors
        }
      }

      const html5QrCode = new Html5Qrcode('barcode-camera-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 160 },
        aspectRatio: 1.333,
      };

      await html5QrCode.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          if (isComponentMounted.current) {
            handleBarcodeDetected(decodedText);
          }
        },
        () => {
          // Scanner idle frame callback
        }
      );

      if (isComponentMounted.current) {
        setCameraPermission('granted');
        setIsScanning(true);
      }
    } catch (err: any) {
      console.warn('Barcode camera error:', err);
      if (isComponentMounted.current) {
        setCameraPermission('denied');
        setIsScanning(false);
        const errMsg = err?.message || '';
        if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
          setCameraError('ক্যামেরা পারমিশন ডিনাই করা হয়েছে। ব্রাউজার সেটিংসে গিয়ে ক্যামেরা এক্সেস অনুমতি দিন।');
        } else if (errMsg.includes('NotFoundError') || errMsg.includes('no camera')) {
          setCameraError('ডিভাইসে কোনো ক্যামেরা পাওয়া যায়নি। ম্যানুয়াল অপশন ব্যবহার করুন।');
        } else {
          setCameraError('ক্যামেরা চালু করতে সমস্যা হয়েছে। অনুগ্রহ করে ম্যানুয়াল বারকোড এন্ট্রি ব্যবহার করুন।');
        }
      }
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {
        // Safe clear
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    isComponentMounted.current = true;
    if (activeTab === 'camera') {
      const timer = setTimeout(() => {
        startCamera();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }

    return () => {
      isComponentMounted.current = false;
      stopCamera();
    };
  }, [activeTab, facingMode]);

  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleAddToCart = () => {
    if (!scannedProduct) return;

    if (scannedProduct.stock <= 0) {
      setFeedback({
        type: 'error',
        message: `"${scannedProduct.name}" পণ্যটির স্টক শেষ (Out of Stock)!`,
      });
      return;
    }

    addToCart(scannedProduct, scanQuantity);
    playSound('beep');
    setFeedback({
      type: 'success',
      message: `"${scannedProduct.name}" (${scanQuantity} টি) কার্টে সফলভাবে যোগ করা হয়েছে!`,
    });

    // Reset current scanned product so next barcode can be cleanly read
    setTimeout(() => {
      setScannedProduct(null);
      setScannedCode(null);
      setScanQuantity(1);
    }, 1200);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDetected(manualCode.trim());
    setManualCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Barcode Scanner (বারকোড রিডার)
                </h3>
                {isScanning && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Camera
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                ক্যামেরার সামনে বারকোড আনলে অটো রিড হবে এবং নিচে অ্যাড বাটন আসবে
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-5 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>ক্যামেরা রিডার (Auto Read)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Barcode className="w-4 h-4" />
            <span>ম্যানুয়াল বা ডেমো বারকোড</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'camera' ? (
            <div className="space-y-3">
              {/* Camera Container */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-4/3 max-h-64 flex items-center justify-center border-2 border-slate-200 shadow-inner">
                <div id="barcode-camera-reader" className="w-full h-full object-cover" />

                {/* Scanning overlay frame */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-56 h-36 border-2 border-blue-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.4)]">
                      {/* Corner markers */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-blue-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-blue-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-blue-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-blue-400 rounded-br-lg" />
                      
                      {/* Scanning laser line */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <span className="mt-3 px-3 py-1 rounded-full bg-slate-900/80 text-white text-[11px] font-semibold border border-white/20 backdrop-blur-xs">
                      বারকোডটি ফ্রেমের মাঝে রাখুন
                    </span>
                  </div>
                )}

                {/* Error overlay */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-5 text-center text-white space-y-3">
                    <CameraOff className="w-10 h-10 text-rose-400" />
                    <div>
                      <h4 className="font-bold text-sm text-rose-300">ক্যামেরা চালু করা যায়নি</h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-xs">{cameraError}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        আবার চেষ্টা করুন
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        ম্যানুয়ালি লিখুন
                      </button>
                    </div>
                  </div>
                )}

                {/* Flip camera button */}
                {isScanning && (
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    className="absolute top-2 right-2 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-xl border border-white/20 text-xs flex items-center gap-1 shadow-md transition-colors cursor-pointer z-10"
                    title="ক্যামেরা ফ্লিপ করুন (Front / Back)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Flip</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Manual input tab */
            <div className="space-y-4">
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    autoFocus
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="বারকোড বা SKU নম্বর টাইপ করুন..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  খুঁজুন
                </button>
              </form>

              {/* Quick sample barcodes */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  কুইক ক্লিক করুন (স্টোর প্রোডাক্টস):
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {products.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleBarcodeDetected(p.barcode || p.sku)}
                      className="p-2 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 text-left transition-colors flex flex-col cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                      <span className="text-[10px] font-mono text-blue-600 font-semibold">{p.barcode || p.sku}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in duration-150 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : feedback.type === 'info'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : feedback.type === 'info' ? (
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold leading-relaxed">{feedback.message}</span>
            </div>
          )}

          {/* Scanned product detected card */}
          {scannedProduct && (
            <div className="p-3.5 bg-slate-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 min-w-0">
                <ProductThumb
                  iconType={scannedProduct.iconType}
                  name={scannedProduct.name}
                  category={scannedProduct.category}
                  color={scannedProduct.color}
                  size="md"
                />
                <div className="min-w-0">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                    {scannedProduct.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                    <span className="bg-white border border-slate-200 px-1.5 py-0.2 rounded font-semibold">
                      {scannedProduct.category}
                    </span>
                    <span className="font-mono text-slate-400">বারকোড: {scannedProduct.barcode}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <span className="font-mono font-black text-blue-600">
                      {storeInfo.currency} {scannedProduct.price}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      স্টক: <strong className="text-slate-700">{scannedProduct.stock}</strong> {scannedProduct.unit || 'Pcs'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity selector */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setScanQuantity((q) => Math.max(1, q - 1))}
                  className="w-6 h-6 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-xs"
                >
                  -
                </button>
                <span className="w-6 text-center font-mono font-bold text-xs text-slate-800">
                  {scanQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setScanQuantity((q) => Math.min(scannedProduct.stock, q + 1))}
                  className="w-6 h-6 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-xs"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Add to Cart and Close Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            বন্ধ করুন (Close)
          </button>

          <button
            type="button"
            disabled={!scannedProduct || scannedProduct.stock <= 0}
            onClick={handleAddToCart}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-extrabold shadow-sm shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>
              {scannedProduct ? `কার্টে যোগ করুন (${storeInfo.currency} ${scannedProduct.price * scanQuantity})` : 'কার্টে যোগ করুন (Add to Cart)'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
