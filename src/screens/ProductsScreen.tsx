import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Minus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  X,
  Check,
  RefreshCw,
  FolderPlus,
  Upload,
  ChevronDown,
  ChevronUp,
  Barcode,
  QrCode,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Hash,
  Sparkles,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { ProductThumb } from '../components/ProductThumb';
import { Product } from '../types';
import { PRODUCT_ICON_OPTIONS, ProductIconOption } from '../data/productIcons';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

const COMMON_UNITS = ['Pcs', 'Kg', 'Gram', 'Ltr', 'Packet', 'Box', 'Dozen', 'Pair'];

// 12 most frequent quick-pick icons
const POPULAR_ICON_IDS = [
  'rice',
  'oil',
  'tea',
  'beverage',
  'biscuit',
  'fastfood',
  'fruit',
  'fish',
  'shirt',
  'phone',
  'medicine',
  'box',
];

export const ProductsScreen: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    storeInfo,
    categories: contextCategories,
    addCategory,
    deleteCategory,
    isFeatureEnabled,
  } = usePos();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'low' | 'instock'>('all');
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Adjust Stock States with +Stock section
  const [adjustStockModalProduct, setAdjustStockModalProduct] = useState<Product | null>(null);
  const [adjustMode, setAdjustMode] = useState<'add' | 'reduce' | 'exact'>('add');
  const [stockAddAmount, setStockAddAmount] = useState<string>('10');
  const [stockReduceAmount, setStockReduceAmount] = useState<string>('1');
  const [stockExactAmount, setStockExactAmount] = useState<string>('0');
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Double Check Deletion states for Products
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productDeleteDoubleChecked, setProductDeleteDoubleChecked] = useState(false);

  // Double Check Deletion states for Categories
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [categoryDeleteDoubleChecked, setCategoryDeleteDoubleChecked] = useState(false);

  // Categories Modal
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Simple Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Grocery');
  const [formPrice, setFormPrice] = useState('150');
  const [formStock, setFormStock] = useState('20');
  const [formIconType, setFormIconType] = useState('rice');
  const [formColor, setFormColor] = useState('#3B82F6');

  // Optional more fields
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [formCostPrice, setFormCostPrice] = useState('100');
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formBarcode, setFormBarcode] = useState('');
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [formThreshold, setFormThreshold] = useState('5');
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const allCategories = useMemo(() => {
    const set = new Set<string>(['All', ...contextCategories]);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [contextCategories, products]);

  const productCategoryOptions = useMemo(() => {
    return allCategories.filter((c) => c !== 'All');
  }, [allCategories]);

  const productLimit = storeInfo.subscription?.productLimit !== undefined ? storeInfo.subscription.productLimit : 500;
  const isLimitReached = productLimit !== -1 && products.length >= productLimit;

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchQuery =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.toLowerCase().includes(search.toLowerCase());
      const isLow = p.stock <= p.lowStockThreshold;
      let matchStock = true;
      if (filterStockStatus === 'low') matchStock = isLow;
      if (filterStockStatus === 'instock') matchStock = p.stock > 0;
      return matchCat && matchQuery && matchStock;
    });
  }, [products, selectedCategory, search, filterStockStatus]);

  const popularIcons = useMemo(() => {
    return PRODUCT_ICON_OPTIONS.filter((item) => POPULAR_ICON_IDS.includes(item.id));
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(productCategoryOptions[0] || 'Grocery');
    setFormPrice('100');
    setFormStock('20');
    setFormCostPrice('70');
    setFormUnit('Pcs');
    setFormBarcode(`890103${Math.floor(100000 + Math.random() * 900000)}`);
    setFormThreshold('5');
    setFormIconType('rice');
    setFormColor('#3B82F6');
    setShowMoreOptions(false);
    setAddEditModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice((product.price || 0).toString());
    setFormStock((product.stock || 0).toString());
    setFormCostPrice((product.costPrice || 0).toString());
    setFormUnit(product.unit || 'Pcs');
    setFormBarcode(product.barcode || '');
    setFormThreshold((product.lowStockThreshold || 5).toString());
    setFormIconType(product.iconType || 'rice');
    setFormColor(product.color || '#3B82F6');
    setShowMoreOptions(false);
    setAddEditModalOpen(true);
  };

  const handleSelectQuickIcon = (opt: ProductIconOption) => {
    setFormIconType(opt.id);
    setFormColor(opt.defaultColor);
  };

  // Quick photo upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (PNG, JPG, WEBP).');
      return;
    }
    setImageUploadLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 280;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setFormIconType(compressed);
          showToast('Product photo selected!');
        }
        setImageUploadLoading(false);
      };
      img.onerror = () => {
        setImageUploadLoading(false);
        showToast('Could not load image.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Please enter product name.');
      return;
    }

    const payload = {
      name: formName.trim(),
      category: formCategory,
      sku: editingProduct ? editingProduct.sku : `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: formBarcode.trim() || Date.now().toString().slice(-8),
      costPrice: parseFloat(formCostPrice) || 0,
      price: parseFloat(formPrice) || 0,
      stock: parseInt(formStock, 10) || 0,
      lowStockThreshold: parseInt(formThreshold, 10) || 5,
      unit: formUnit.trim() || 'Pcs',
      iconType: formIconType || 'rice',
      color: formColor || '#3B82F6',
      storeType: (storeInfo.storeType as any) || 'grocery',
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        showToast(`Product "${payload.name}" updated!`);
      } else {
        if (isLimitReached) {
          showToast(`Maximum ${productLimit} products limit reached.`);
          return;
        }
        await addProduct(payload);
        showToast(`Product "${payload.name}" added!`);
      }
      setAddEditModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save product.');
    }
  };

  // Open Adjust Stock with desired mode
  const openAdjustStockModal = (product: Product, mode: 'add' | 'reduce' | 'exact' = 'add') => {
    setAdjustStockModalProduct(product);
    setAdjustMode(mode);
    setStockAddAmount('5');
    setStockReduceAmount('1');
    setStockExactAmount(product.stock.toString());
    setAdjustReason('');
  };

  const handleSaveAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustStockModalProduct) return;

    let targetStock = adjustStockModalProduct.stock;
    if (adjustMode === 'add') {
      const addNum = parseInt(stockAddAmount, 10);
      const validAdd = isNaN(addNum) ? 0 : Math.max(0, addNum);
      targetStock = adjustStockModalProduct.stock + validAdd;
    } else if (adjustMode === 'reduce') {
      const redNum = parseInt(stockReduceAmount, 10);
      const validRed = isNaN(redNum) ? 0 : Math.max(0, redNum);
      targetStock = Math.max(0, adjustStockModalProduct.stock - validRed);
    } else {
      const exactNum = parseInt(stockExactAmount, 10);
      targetStock = isNaN(exactNum) ? 0 : Math.max(0, exactNum);
    }

    try {
      await adjustStock(adjustStockModalProduct.id, targetStock);
      showToast(`Stock updated: ${targetStock} ${adjustStockModalProduct.unit || 'Pcs'}`);
      setAdjustStockModalProduct(null);
    } catch (err: any) {
      showToast(err?.message || 'Failed to adjust stock.');
    }
  };

  // Double Check Confirmation for Product Deletion
  const handleInitiateDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setProductDeleteDoubleChecked(false);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete || !productDeleteDoubleChecked) return;
    const target = productToDelete;
    setProductToDelete(null);
    setProductDeleteDoubleChecked(false);
    try {
      await deleteProduct(target.id);
      showToast(`Product "${target.name}" permanently deleted.`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete product.');
    }
  };

  // Double Check Confirmation for Category Deletion
  const handleInitiateDeleteCategory = (cat: string) => {
    setCategoryToDelete(cat);
    setCategoryDeleteDoubleChecked(false);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete || !categoryDeleteDoubleChecked) return;
    const target = categoryToDelete;
    setCategoryToDelete(null);
    setCategoryDeleteDoubleChecked(false);
    try {
      await deleteCategory(target);
      if (selectedCategory === target) {
        setSelectedCategory('All');
      }
      showToast(`Category "${target}" deleted.`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete category.');
    }
  };

  const handleCreateCategory = async (nameToAdd: string) => {
    const trimmed = nameToAdd.trim();
    if (!trimmed) return;
    await addCategory(trimmed);
    setSelectedCategory(trimmed);
    setNewCategoryName('');
    showToast(`Category "${trimmed}" added.`);
  };

  const isCustomImage = formIconType?.startsWith('data:image') || formIconType?.startsWith('http');

  // Computed helper for stock adjustment calculations
  const calculatedStockResult = useMemo(() => {
    if (!adjustStockModalProduct) return 0;
    const current = adjustStockModalProduct.stock;
    if (adjustMode === 'add') {
      const add = parseInt(stockAddAmount, 10);
      return current + (isNaN(add) ? 0 : Math.max(0, add));
    }
    if (adjustMode === 'reduce') {
      const red = parseInt(stockReduceAmount, 10);
      return Math.max(0, current - (isNaN(red) ? 0 : red));
    }
    const exact = parseInt(stockExactAmount, 10);
    return isNaN(exact) ? 0 : Math.max(0, exact);
  }, [adjustStockModalProduct, adjustMode, stockAddAmount, stockReduceAmount, stockExactAmount]);

  const linkedProductsForCategoryToDelete = useMemo(() => {
    if (!categoryToDelete) return 0;
    return products.filter((p) => p.category === categoryToDelete).length;
  }, [products, categoryToDelete]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Products & Inventory</span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${
                isLimitReached
                  ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
                  : 'bg-blue-50 text-blue-700 border-blue-200/60'
              }`}
            >
              {products.length} / {productLimit === -1 ? 'Unlimited' : `${productLimit} Max`}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your store catalog, pricing, quick stock replenishment, and icons
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setAddCategoryModalOpen(true)}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200/80 shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-blue-600" />
            <span>Categories</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, barcode or SKU..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 self-start sm:self-auto text-xs">
            <button
              onClick={() => setFilterStockStatus('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filterStockStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({products.length})
            </button>
            <button
              onClick={() => setFilterStockStatus('low')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                filterStockStatus === 'low'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span>Low Stock</span>
            </button>
            <button
              onClick={() => setFilterStockStatus('instock')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filterStockStatus === 'instock'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>In Stock</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product List: Responsive Mobile Cards (< md) & Desktop Table (>= md) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-slate-600">No products found</p>
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isLow = p.stock <= p.lowStockThreshold;
                return (
                  <div key={p.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ProductThumb
                          iconType={p.iconType}
                          name={p.name}
                          category={p.category}
                          color={p.color}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-sm truncate">{p.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5">
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-sans text-[10px]">
                              {p.category}
                            </span>
                            <span>•</span>
                            <span className="truncate">{p.sku}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-sm text-slate-900 block">
                          {storeInfo.currency} {p.price.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          per {p.unit || 'Pcs'}
                        </span>
                      </div>
                    </div>

                    {/* Stock & Action Bar on Mobile */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-50 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                            isLow
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          Stock: {p.stock}
                        </span>
                        {isFeatureEnabled('feat_stock_adjust') && (
                          <button
                            type="button"
                            onClick={() => openAdjustStockModal(p, 'add')}
                            className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 active:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer"
                          >
                            + Stock
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {isFeatureEnabled('feat_stock_adjust') && (
                          <button
                            type="button"
                            title="Adjust Stock"
                            onClick={() => openAdjustStockModal(p, 'add')}
                            className="p-1.5 text-slate-500 hover:text-blue-600 bg-slate-50 rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Edit Product"
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete Product"
                          onClick={() => handleInitiateDeleteProduct(p)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 bg-slate-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Product</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">SKU / Barcode</th>
                    <th className="py-3.5 px-4 text-right">Selling Price</th>
                    <th className="py-3.5 px-4 text-center">Stock</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredProducts.map((p) => {
                    const isLow = p.stock <= p.lowStockThreshold;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <ProductThumb
                              iconType={p.iconType}
                              name={p.name}
                              category={p.category}
                              color={p.color}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Unit: {p.unit || 'Pcs'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          <div>{p.sku}</div>
                          {p.barcode && <div className="text-[10px] text-slate-400">{p.barcode}</div>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {storeInfo.currency} {p.price.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`font-mono font-bold px-2.5 py-0.5 rounded-md text-xs ${
                                isLow ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {p.stock}
                            </span>
                            {/* Quick inline +Stock button */}
                            {isFeatureEnabled('feat_stock_adjust') && (
                              <button
                                type="button"
                                title="+ Add Stock to this product"
                                onClick={() => openAdjustStockModal(p, 'add')}
                                className="px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-md transition-colors"
                              >
                                +Stock
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isFeatureEnabled('feat_stock_adjust') && (
                              <button
                                type="button"
                                title="Adjust Stock (+ / - / Set Exact)"
                                onClick={() => openAdjustStockModal(p, 'add')}
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              title="Edit Product"
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete Product (Double-Check)"
                              onClick={() => handleInitiateDeleteProduct(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* CATEGORY MANAGER MODAL */}
      {addCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-md">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Manage Categories</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="my-4 flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateCategory(newCategoryName);
                  }
                }}
                placeholder="New Category name (e.g. Snacks, Drinks)"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleCreateCategory(newCategoryName)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                Add
              </button>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto divide-y divide-slate-100">
              {productCategoryOptions.map((cat) => {
                const count = products.filter((p) => p.category === cat).length;
                return (
                  <div
                    key={cat}
                    className="flex justify-between items-center py-2 px-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{cat}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-mono">
                        {count} items
                      </span>
                    </div>
                    <button
                      type="button"
                      title={`Delete category ${cat} (Double-Check)`}
                      onClick={() => handleInitiateDeleteCategory(cat)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE CHECK CATEGORY DELETION MODAL */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-rose-100 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Double Check: Delete Category?
                </h3>
                <p className="text-xs text-slate-400">
                  ক্যাটাগরি ডিলিট করার ডাবল-চেক নিশ্চিতকরণ
                </p>
              </div>
            </div>

            {/* Category Details */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Category Name:</span>
                <span className="text-xs font-bold text-slate-900 px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                  {categoryToDelete}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Associated Products:</span>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {linkedProductsForCategoryToDelete} items
                </span>
              </div>
            </div>

            {linkedProductsForCategoryToDelete > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>সতর্কতা (Warning):</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  এই ক্যাটাগরিতে বর্তমানে {linkedProductsForCategoryToDelete}টি প্রোডাক্ট রয়েছে। ক্যাটাগরি ডিলিট করলে পণ্যগুলো অক্ষত থাকবে তবে এই ক্যাটাগরি তালিকা থেকে অপসারিত হবে।
                </p>
              </div>
            )}

            {/* Double Check Safety Checkbox */}
            <label className="flex items-start gap-3 p-3 bg-rose-50/70 border border-rose-200/90 rounded-2xl cursor-pointer select-none">
              <input
                type="checkbox"
                checked={categoryDeleteDoubleChecked}
                onChange={(e) => setCategoryDeleteDoubleChecked(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-rose-600 rounded border-rose-300 focus:ring-rose-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-rose-900 leading-snug">
                আমি ডাবল চেক করেছি এবং নিশ্চিত যে আমি "{categoryToDelete}" ক্যাটাগরিটি মুছে ফেলতে চাই।
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCategoryToDelete(null);
                  setCategoryDeleteDoubleChecked(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                না, বাতিল করুন (Cancel)
              </button>
              <button
                type="button"
                disabled={!categoryDeleteDoubleChecked}
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ক্যাটাগরি ডিলিট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE CHECK PRODUCT DELETION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-rose-100 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Double Check: Delete Product?
                </h3>
                <p className="text-xs text-slate-400">
                  পণ্য ডিলিট করার ডাবল-চেক নিশ্চিতকরণ
                </p>
              </div>
            </div>

            {/* Product Summary Card */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <ProductThumb
                iconType={productToDelete.iconType}
                name={productToDelete.name}
                category={productToDelete.category}
                color={productToDelete.color}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-slate-900 text-sm truncate">{productToDelete.name}</h4>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                  <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded-md font-semibold">
                    {productToDelete.category}
                  </span>
                  <span>SKU: {productToDelete.sku}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-slate-500">
                    Stock:{' '}
                    <strong className="text-slate-800 font-mono">
                      {productToDelete.stock} {productToDelete.unit || 'Pcs'}
                    </strong>
                  </span>
                  <span className="text-slate-500">
                    Price:{' '}
                    <strong className="text-blue-600 font-mono">
                      {storeInfo.currency} {productToDelete.price}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>স্থায়ী ডিলিট সতর্কতা:</span>
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                পণ্যটি মুছে ফেললে তা স্টোর ক্যাটালগ ও পিওএস স্ক্রিন থেকে স্থায়ীভাবে মুছে যাবে। পূর্বের বিক্রয় রশিদ এবং হিসাব সংরক্ষিত থাকবে।
              </p>
            </div>

            {/* Double Check Safety Checkbox */}
            <label className="flex items-start gap-3 p-3 bg-rose-50/70 border border-rose-200/90 rounded-2xl cursor-pointer select-none">
              <input
                type="checkbox"
                checked={productDeleteDoubleChecked}
                onChange={(e) => setProductDeleteDoubleChecked(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-rose-600 rounded border-rose-300 focus:ring-rose-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-rose-900 leading-snug">
                আমি ডাবল-চেক করেছি এবং নিশ্চিত যে আমি{' '}
                <span className="font-bold underline">"{productToDelete.name}"</span> পণ্যটি স্থায়ীভাবে
                মুছে ফেলতে চাই।
              </span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setProductToDelete(null);
                  setProductDeleteDoubleChecked(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                না, বাতিল করুন (Cancel)
              </button>
              <button
                type="button"
                disabled={!productDeleteDoubleChecked}
                onClick={handleConfirmDeleteProduct}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>পণ্য ডিলিট করুন (Confirm Delete)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIMPLE & CLEAN ADD / EDIT PRODUCT MODAL */}
      {addEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingProduct ? 'Edit Product' : 'Add New Product (নতুন পণ্য যোগ করুন)'}
                </h3>
                <p className="text-xs text-slate-400">
                  Select an icon or photo, set price, and save
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddEditModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!editingProduct && isLimitReached && (
              <div className="mx-5 mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">Products & Inventory Limit Reached</p>
                  <p className="mt-0.5 leading-relaxed">
                    স্টোরে সর্বোচ্চ ৫০০টি প্রোডাক্টের লিমিট পূর্ণ হয়েছে ({products.length}/{productLimit})। নতুন পণ্য যোগ করার পূর্বে অপ্রয়োজনীয় পণ্য ডিলিট করুন অথবা এডমিনের সাথে যোগাযোগ করুন।
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-4">
              {/* SIMPLE ICON & PHOTO PICKER */}
              <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Product Icon / Photo (ছবি বা আইকন)
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploadLoading}
                    className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{imageUploadLoading ? 'Uploading...' : 'Upload Photo'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Current Active Preview */}
                  <div className="relative shrink-0">
                    <ProductThumb
                      iconType={formIconType}
                      name={formName || 'P'}
                      category={formCategory}
                      color={formColor}
                      size="md"
                      className="ring-2 ring-blue-500/30"
                    />
                    {isCustomImage && (
                      <button
                        type="button"
                        onClick={() => setFormIconType('rice')}
                        title="Remove photo"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* 12 Quick Icons Grid */}
                  <div className="flex-1 grid grid-cols-6 gap-1.5">
                    {popularIcons.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = formIconType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectQuickIcon(opt)}
                          title={opt.name}
                          className={`p-1.5 rounded-xl flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs scale-105'
                              : `${opt.defaultBg} hover:opacity-80 text-slate-700 border border-slate-200/60`
                          }`}
                        >
                          <Icon
                            className="w-4 h-4"
                            style={{ color: isSelected ? '#FFFFFF' : opt.defaultColor }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* PRODUCT NAME */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Product Name (পণ্যের নাম) *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Miniket Rice, Nescafe Coffee, T-Shirt"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* CATEGORY & SELLING PRICE */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {productCategoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Selling Price ({storeInfo.currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="120"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* STOCK QUANTITY & BARCODE IN A BALANCED GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Stock Quantity (মজুদ সংখ্যা) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Barcode (বারকোড)
                    </label>
                    <button
                      type="button"
                      onClick={() => setScannerModalOpen(true)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      <span>স্ক্যান</span>
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={formBarcode}
                      onChange={(e) => setFormBarcode(e.target.value)}
                      placeholder="বারকোড বা স্ক্যান করুন..."
                      className="w-full pl-9 pr-9 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setScannerModalOpen(true)}
                      title="ক্যামেরা বারকোড স্ক্যানার"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* COLLAPSIBLE MORE OPTIONS (BUYING PRICE, UNIT, THRESHOLD) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                >
                  {showMoreOptions ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Fewer details</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>More options (Cost Price, Unit, Alert Threshold)</span>
                    </>
                  )}
                </button>

                {showMoreOptions && (
                  <div className="mt-3 p-3.5 bg-slate-50/60 border border-slate-200/80 rounded-2xl space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Buying Cost ({storeInfo.currency})
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={formCostPrice}
                          onChange={(e) => setFormCostPrice(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Unit
                        </label>
                        <select
                          value={formUnit}
                          onChange={(e) => setFormUnit(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                        >
                          {COMMON_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Low Stock Alert Threshold
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formThreshold}
                        onChange={(e) => setFormThreshold(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editingProduct && isLimitReached}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProduct ? 'Save Changes' : 'Save Product (সংরক্ষণ করুন)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MINIMAL & CLEAN ADJUST STOCK MODAL */}
      {adjustStockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xl border border-slate-200 w-full max-w-sm space-y-3.5">
            {/* Minimal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Adjust Stock
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {adjustStockModalProduct.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustStockModalProduct(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Stock Banner */}
            <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Current Stock</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {adjustStockModalProduct.stock} {adjustStockModalProduct.unit || 'Pcs'}
              </span>
            </div>

            {/* Clean Segmented Tab Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setAdjustMode('add')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  adjustMode === 'add'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3 h-3" />
                <span>+ Add</span>
              </button>
              <button
                type="button"
                onClick={() => setAdjustMode('reduce')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  adjustMode === 'reduce'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Minus className="w-3 h-3" />
                <span>- Reduce</span>
              </button>
              <button
                type="button"
                onClick={() => setAdjustMode('exact')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  adjustMode === 'exact'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Hash className="w-3 h-3" />
                <span>Set Exact</span>
              </button>
            </div>

            <form onSubmit={handleSaveAdjustStock} className="space-y-3 pt-1">
              {/* MODE 1: ADD */}
              {adjustMode === 'add' && (
                <div className="space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {['1', '5', '10', '25', '50'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setStockAddAmount(preset)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                          stockAddAmount === preset
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-500/20'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(stockAddAmount, 10) || 0;
                        setStockAddAmount(Math.max(1, current - 1).toString());
                      }}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        required
                        value={stockAddAmount}
                        onChange={(e) => setStockAddAmount(e.target.value)}
                        placeholder="1"
                        className="w-full text-center px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                        {adjustStockModalProduct.unit || 'Pcs'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(stockAddAmount, 10) || 0;
                        setStockAddAmount((current + 1).toString());
                      }}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 2: REDUCE */}
              {adjustMode === 'reduce' && (
                <div className="space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {['1', '2', '5', '10'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setStockReduceAmount(preset)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                          stockReduceAmount === preset
                            ? 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-500/20'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        -{preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(stockReduceAmount, 10) || 0;
                        setStockReduceAmount(Math.max(1, current - 1).toString());
                      }}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        required
                        value={stockReduceAmount}
                        onChange={(e) => setStockReduceAmount(e.target.value)}
                        placeholder="1"
                        className="w-full text-center px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                        {adjustStockModalProduct.unit || 'Pcs'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(stockReduceAmount, 10) || 0;
                        setStockReduceAmount((current + 1).toString());
                      }}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 3: EXACT */}
              {adjustMode === 'exact' && (
                <div className="space-y-2 animate-in fade-in">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      required
                      value={stockExactAmount}
                      onChange={(e) => setStockExactAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      {adjustStockModalProduct.unit || 'Pcs'}
                    </span>
                  </div>
                </div>
              )}

              {/* Minimal Live Result Preview */}
              <div className="px-3 py-2 bg-slate-50 rounded-xl flex items-center justify-between text-xs border border-slate-200/80">
                <span className="text-slate-500">
                  New Total Stock:
                </span>
                <span className="font-black font-mono text-sm text-slate-900">
                  {calculatedStockResult} {adjustStockModalProduct.unit || 'Pcs'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustStockModalProduct(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ${
                    adjustMode === 'add'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : adjustMode === 'reduce'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Update Stock</span>
                </button>
              </div>
            </form>
          </div>
      {/* BARCODE SCANNER MODAL FOR PRODUCT FORM */}
      {scannerModalOpen && (
        <BarcodeScannerModal
          title="Scan Product Barcode"
          subtitle="পণ্যের গায়ে থাকা বারকোড ক্যামেরার সামনে ধরুন"
          onClose={() => setScannerModalOpen(false)}
          onScanCode={(code) => {
            setFormBarcode(code);
            showToast(`বারকোড স্ক্যান সম্পন্ন: ${code}`);
          }}
        />
      )}
    </div>
  );
};
