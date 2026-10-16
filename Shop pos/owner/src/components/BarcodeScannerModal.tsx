import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CameraOff,
  Barcode,
  QrCode,
  X,
  Check,
  AlertCircle,
  Plus,
  Minus,
  RotateCcw,
  Search,
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
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Camera scanning states
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Scanned item state
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scanQuantity, setScanQuantity] = useState<number>(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
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

  // Process detected barcode
  const handleBarcodeDetected = (decodedText: string) => {
    const now = Date.now();
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
      setNotFoundCode(null);
      setAddedSuccess(false);
    } else {
      setScannedProduct(null);
      setNotFoundCode(decodedText);
      setAddedSuccess(false);
    }
  };

  // Start HTML5-QRCode camera
  const startCamera = async () => {
    const readerElement = document.getElementById('barcode-camera-reader');
    if (!readerElement) return;

    try {
      setCameraError(null);

      if (scannerRef.current) {
        const prev = scannerRef.current;
        scannerRef.current = null;
        try {
          if (prev.isScanning) {
            await prev.stop().catch(() => {});
          }
          prev.clear();
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
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      const config = {
        fps: 20,
        qrbox: { width: 280, height: 140 },
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
        () => {}
      );

      if (isComponentMounted.current) {
        setIsScanning(true);
      }
    } catch (err: any) {
      console.warn('Barcode camera error:', err);
      if (isComponentMounted.current) {
        setIsScanning(false);
        const errMsg = err?.message || '';
        if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
          setCameraError('ক্যামেরা পারমিশন অনুমতি দিন (Browser Settings > Allow Camera)।');
        } else if (errMsg.includes('NotFoundError') || errMsg.includes('no camera')) {
          setCameraError('ডিভাইসে কোনো সক্রিয় ক্যামেরা পাওয়া যায়নি।');
        } else {
          setCameraError('ক্যামেরা চালু করতে সমস্যা হয়েছে। ম্যানুয়ালি কোড লিখুন।');
        }
      }
    }
  };

  const stopCamera = async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      scannerRef.current = null;
      try {
        if (scanner.isScanning) {
          await scanner.stop().catch(() => {});
        }
        try {
          scanner.clear();
        } catch {}
      } catch {
        // Safe clear
      }
    }
    if (isComponentMounted.current) {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    isComponentMounted.current = true;
    const timer = setTimeout(() => {
      startCamera();
    }, 150);

    return () => {
      isComponentMounted.current = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [facingMode]);

  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Add detected product to cart on explicit user click
  const handleAddToCart = () => {
    if (!scannedProduct) return;

    if (scannedProduct.stock <= 0) {
      return;
    }

    addToCart(scannedProduct, scanQuantity);
    playSound('beep');
    setAddedSuccess(true);

    // Briefly show success, then reset detected product to scan next item
    setTimeout(() => {
      if (isComponentMounted.current) {
        setScannedProduct(null);
        setScannedCode(null);
        setAddedSuccess(false);
        setScanQuantity(1);
      }
    }, 1200);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDetected(manualCode.trim());
    setManualCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        
        {/* Minimal Header */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                QR & Barcode Scanner
              </h3>
              <p className="text-[11px] text-slate-500">
                স্ক্যান করে কার্টে যোগ করুন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleCamera}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Flip camera"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport / Main Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {/* Camera Viewfinder */}
          <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-4/3 max-h-56 flex items-center justify-center border border-slate-200">
            <div id="barcode-camera-reader" className="w-full h-full object-cover" />

            {/* Subtle Viewfinder Frame */}
            {isScanning && !cameraError && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-52 h-28 border-2 border-blue-400/80 rounded-xl relative">
                  <div className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-sm" />
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-sm" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-sm" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-sm" />
                  
                  {/* Subtle red laser scan indicator */}
                  <div className="w-full h-0.5 bg-red-500/70 absolute top-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <span className="mt-2 text-[10px] text-white/80 bg-black/50 px-2.5 py-0.5 rounded-full font-medium">
                  বারকোড ফ্রেমের মাঝে রাখুন
                </span>
              </div>
            )}

            {/* Camera Error Display */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center text-white space-y-2">
                <CameraOff className="w-8 h-8 text-rose-400" />
                <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  আবার চেষ্টা করুন
                </button>
              </div>
            )}
          </div>

          {/* Quick Manual Entry toggle & input */}
          <div className="pt-1">
            {!showManualInput ? (
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Search className="w-3 h-3" />
                <span>ম্যানুয়ালি বারকোড বা SKU লিখুন</span>
              </button>
            ) : (
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="বারকোড বা SKU নম্বর লিখুন..."
                  className="flex-1 px-3 py-2 bg-slate-50 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  খুঁজুন
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Hide input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>

          {/* Product Not Found Notice */}
          {notFoundCode && !scannedProduct && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>
                বারকোড <strong className="font-mono">{notFoundCode}</strong> দিয়ে কোনো পণ্য পাওয়া যায়নি।
              </span>
            </div>
          )}

          {/* Scanned Product Card (When detected) */}
          {scannedProduct && (
            <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ProductThumb
                    iconType={scannedProduct.iconType}
                    name={scannedProduct.name}
                    category={scannedProduct.category}
                    color={scannedProduct.color}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {scannedProduct.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {scannedProduct.barcode || scannedProduct.sku}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-slate-900 text-sm">
                    {storeInfo.currency} {scannedProduct.price}
                  </span>
                  <p className="text-[10px] text-slate-500">
                    স্টক: {scannedProduct.stock} {scannedProduct.unit || 'টি'}
                  </p>
                </div>
              </div>

              {/* Quantity selector & Add Button */}
              <div className="flex items-center gap-2 pt-1 border-t border-blue-100">
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setScanQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-xs cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center font-bold text-xs text-slate-800 font-mono">
                    {scanQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setScanQuantity((q) => Math.min(scannedProduct.stock, q + 1))}
                    className="w-7 h-7 rounded text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={scannedProduct.stock <= 0 || addedSuccess}
                  onClick={handleAddToCart}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    addedSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-[0.98]'
                  }`}
                >
                  {addedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>কার্টে যোগ হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>
                        কার্টে যোগ করুন ({storeInfo.currency} {scannedProduct.price * scanQuantity})
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Minimal Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>পণ্য স্ক্যান হলে বিস্তারিত দেখে কার্টে যোগ করুন</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
