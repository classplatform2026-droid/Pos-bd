import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  RefreshCw,
  Save,
  ShoppingBag,
  Store,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ScanLine,
  Printer,
  Percent,
  ArrowUpDown,
  Users,
  Calculator,
  CreditCard,
  Zap,
  ShieldCheck,
  Search,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { FeatureDefinition } from '../types';

interface AdminFeaturesScreenProps {
  onShowToast: (message: string, type?: 'success' | 'danger') => void;
  onSwitchToOwnerPos?: () => void;
}

interface StoreFeatureItem {
  id: string;
  _id: string;
  name: string;
  branch: string;
  status: string;
  plan: string;
  features?: Record<string, boolean>;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Receipt,
  Settings,
  ScanLine,
  Printer,
  Percent,
  ArrowUpDown,
  Users,
  Calculator,
  CreditCard,
  Zap,
  Store,
};

export const AdminFeaturesScreen: React.FC<AdminFeaturesScreenProps> = ({
  onShowToast,
  onSwitchToOwnerPos,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [definitions, setDefinitions] = useState<FeatureDefinition[]>([]);
  const [stores, setStores] = useState<StoreFeatureItem[]>([]);
  const [globalFeatures, setGlobalFeatures] = useState<Record<string, boolean>>({});

  // Selection state: 'global' or a specific storeId
  const [selectedTarget, setSelectedTarget] = useState<string>('global');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'pages' | 'features'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Working state of toggles for the currently selected target
  const [currentFeatures, setCurrentFeatures] = useState<Record<string, boolean>>({});
  const [applyGlobalToAll, setApplyGlobalToAll] = useState(false);

  const fetchFeaturesData = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminFeatures();
      if (res && res.success) {
        setDefinitions(res.definitions || []);
        setStores(res.stores || []);
        setGlobalFeatures(res.globalFeatures || {});

        // Initialize features for current target
        if (selectedTarget === 'global') {
          const initial: Record<string, boolean> = {};
          (res.definitions || []).forEach((def: FeatureDefinition) => {
            initial[def.key] =
              res.globalFeatures && typeof res.globalFeatures[def.key] === 'boolean'
                ? res.globalFeatures[def.key]
                : def.defaultValue;
          });
          setCurrentFeatures(initial);
        } else {
          const store = (res.stores || []).find(
            (s: StoreFeatureItem) => s._id === selectedTarget || s.id === selectedTarget
          );
          const initial: Record<string, boolean> = {};
          (res.definitions || []).forEach((def: FeatureDefinition) => {
            if (store?.features && typeof store.features[def.key] === 'boolean') {
              initial[def.key] = store.features[def.key];
            } else if (res.globalFeatures && typeof res.globalFeatures[def.key] === 'boolean') {
              initial[def.key] = res.globalFeatures[def.key];
            } else {
              initial[def.key] = def.defaultValue;
            }
          });
          setCurrentFeatures(initial);
        }
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load feature controls', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeaturesData();
  }, []);

  // When selected target changes, load that target's features into currentFeatures
  const handleSelectTarget = (targetId: string) => {
    setSelectedTarget(targetId);
    const initial: Record<string, boolean> = {};

    if (targetId === 'global') {
      definitions.forEach((def) => {
        initial[def.key] =
          globalFeatures && typeof globalFeatures[def.key] === 'boolean'
            ? globalFeatures[def.key]
            : def.defaultValue;
      });
    } else {
      const store = stores.find((s) => s._id === targetId || s.id === targetId);
      definitions.forEach((def) => {
        if (store?.features && typeof store.features[def.key] === 'boolean') {
          initial[def.key] = store.features[def.key];
        } else if (globalFeatures && typeof globalFeatures[def.key] === 'boolean') {
          initial[def.key] = globalFeatures[def.key];
        } else {
          initial[def.key] = def.defaultValue;
        }
      });
    }
    setCurrentFeatures(initial);
  };

  const handleToggle = (key: string) => {
    setCurrentFeatures((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleEnableAll = () => {
    const updated: Record<string, boolean> = {};
    definitions.forEach((d) => {
      updated[d.key] = true;
    });
    setCurrentFeatures(updated);
    onShowToast('All pages & features enabled in working state.');
  };

  const handleDisableAll = () => {
    const updated: Record<string, boolean> = {};
    definitions.forEach((d) => {
      updated[d.key] = false;
    });
    setCurrentFeatures(updated);
    onShowToast('All pages & features disabled in working state.');
  };

  const handleApplyPreset = (preset: 'all' | 'pos_only' | 'standard') => {
    const updated: Record<string, boolean> = {};
    definitions.forEach((d) => {
      if (preset === 'all') {
        updated[d.key] = true;
      } else if (preset === 'pos_only') {
        if (d.key === 'page_pos' || d.key === 'page_sales' || d.key === 'feat_receipt_print' || d.key === 'feat_barcode_scanner') {
          updated[d.key] = true;
        } else {
          updated[d.key] = false;
        }
      } else if (preset === 'standard') {
        if (d.key === 'feat_discounts' || d.key === 'feat_staff_management' || d.key === 'feat_store_profile_edit') {
          updated[d.key] = false;
        } else {
          updated[d.key] = true;
        }
      }
    });
    setCurrentFeatures(updated);
    onShowToast(`Applied "${preset.toUpperCase()}" feature preset.`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedTarget === 'global') {
        const res = await api.updateGlobalFeatures(currentFeatures, applyGlobalToAll);
        if (res && res.success) {
          setGlobalFeatures(res.defaultFeatures || currentFeatures);
          onShowToast(res.message || 'Global features saved successfully.');
          if (applyGlobalToAll) {
            fetchFeaturesData();
          }
        }
      } else {
        const res = await api.updateStoreFeatures(selectedTarget, currentFeatures);
        if (res && res.success) {
          setStores((prev) =>
            prev.map((s) =>
              s._id === selectedTarget || s.id === selectedTarget
                ? { ...s, features: res.features || currentFeatures }
                : s
            )
          );
          onShowToast(res.message || 'Store features updated successfully.');
        }
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save feature changes.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const selectedStore = useMemo(() => {
    if (selectedTarget === 'global') return null;
    return stores.find((s) => s._id === selectedTarget || s.id === selectedTarget) || null;
  }, [selectedTarget, stores]);

  const filteredDefinitions = useMemo(() => {
    return definitions.filter((def) => {
      if (activeCategoryFilter === 'pages' && def.type !== 'page') return false;
      if (activeCategoryFilter === 'features' && def.type !== 'feature') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          def.title.toLowerCase().includes(q) ||
          def.titleBn.toLowerCase().includes(q) ||
          def.description.toLowerCase().includes(q) ||
          def.key.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [definitions, activeCategoryFilter, searchQuery]);

  const pagesList = useMemo(() => {
    return filteredDefinitions.filter((d) => d.type === 'page');
  }, [filteredDefinitions]);

  const featuresList = useMemo(() => {
    return filteredDefinitions.filter((d) => d.type === 'feature');
  }, [filteredDefinitions]);

  const enabledPagesCount = useMemo(() => {
    return definitions.filter((d) => d.type === 'page' && currentFeatures[d.key] !== false).length;
  }, [definitions, currentFeatures]);

  const enabledFeaturesCount = useMemo(() => {
    return definitions.filter((d) => d.type === 'feature' && currentFeatures[d.key] !== false).length;
  }, [definitions, currentFeatures]);

  const totalPagesCount = useMemo(() => {
    return definitions.filter((d) => d.type === 'page').length;
  }, [definitions]);

  const totalFeaturesCount = useMemo(() => {
    return definitions.filter((d) => d.type === 'feature').length;
  }, [definitions]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* PAGE HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Owner Feature Controls (ফিচার ও পেজ নিয়ন্ত্রণ)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                মালিকের ইন্টারফেসে কোন কোন পেজ বা অপশন দেখা যাবে তা অন/অফ করুন
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchFeaturesData}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            title="Reload Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {onSwitchToOwnerPos && (
            <button
              type="button"
              onClick={onSwitchToOwnerPos}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>Live Test in POS</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'Save Changes (পরিবর্তন সেভ করুন)'}</span>
          </button>
        </div>
      </div>

      {/* TARGET SELECTION & SUMMARY BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* TARGET SELECTOR BOX */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                Target Configuration Scope
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                কোন দোকানের সেটিংস পরিবর্তন করবেন?
              </h3>
            </div>
            <div className="text-xs text-slate-500">
              মোট দোকান: <span className="font-bold text-slate-900">{stores.length} টি</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                টার্গেট নির্বাচন করুন (Select Scope):
              </label>
              <select
                value={selectedTarget}
                onChange={(e) => handleSelectTarget(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
              >
                <option value="global">🌐 All Stores (Global Defaults) - সব দোকানের জন্য</option>
                <optgroup label="দোকানভিত্তিক কাস্টম নিয়ন্ত্রণ (Individual Specific Shops)">
                  {stores.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      🏬 {s.name} ({s.branch || 'Main Branch'}) - {s.plan} Plan
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                দ্রুত প্রিসেট (Quick Presets):
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('all')}
                  className="flex-1 py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold transition-colors"
                >
                  All Active
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('pos_only')}
                  className="flex-1 py-2 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-bold transition-colors"
                >
                  POS Only
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('standard')}
                  className="flex-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold transition-colors"
                >
                  Standard
                </button>
              </div>
            </div>
          </div>

          {selectedTarget === 'global' && (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  আপনি <strong>গ্লোবাল ডিফল্টস</strong> পরিবর্তন করছেন। নতুন তৈরি হওয়া দোকানগুলো এই ফিচার পাবে।
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs select-none shrink-0">
                <input
                  type="checkbox"
                  checked={applyGlobalToAll}
                  onChange={(e) => setApplyGlobalToAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-0"
                />
                <span>Apply to all existing stores</span>
              </label>
            </div>
          )}

          {selectedStore && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs">
                  {selectedStore.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{selectedStore.name}</h4>
                  <p className="text-[11px] text-slate-500">
                    শাখা: {selectedStore.branch} • প্ল্যান: {selectedStore.plan} • অবস্থা: {selectedStore.status}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTarget('global')}
                className="text-blue-600 hover:underline font-bold text-xs"
              >
                ← Return to Global Configuration
              </button>
            </div>
          )}
        </div>

        {/* ACTIVE MODULES STATS CARD */}
        <div className="bg-linear-to-br from-slate-900 to-[#0F1E36] p-5 rounded-3xl text-white shadow-md flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800/50 px-2.5 py-0.5 rounded-full">
              Live Status Overview
            </span>
            <h3 className="text-lg font-black mt-2 text-white">
              {selectedTarget === 'global' ? 'Global System Defaults' : selectedStore?.name}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              যেকোনো অপশন বন্ধ (OFF) করলে মালিকের অ্যাপ থেকে সাথে সাথে অদৃশ্য হবে
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block font-semibold">সক্রিয় পেজ</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-emerald-400">{enabledPagesCount}</span>
                <span className="text-xs text-slate-400 font-semibold">/ {totalPagesCount}</span>
              </div>
              <span className="text-[10px] text-emerald-400 block mt-0.5">
                {enabledPagesCount === totalPagesCount ? 'সব পেজ চালু' : `${totalPagesCount - enabledPagesCount} টি বন্ধ`}
              </span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block font-semibold">সক্রিয় ফিচার</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-blue-400">{enabledFeaturesCount}</span>
                <span className="text-xs text-slate-400 font-semibold">/ {totalFeaturesCount}</span>
              </div>
              <span className="text-[10px] text-blue-400 block mt-0.5">
                {enabledFeaturesCount === totalFeaturesCount ? 'সব ফিচার চালু' : `${totalFeaturesCount - enabledFeaturesCount} টি বন্ধ`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-800">
            <button
              type="button"
              onClick={handleEnableAll}
              className="text-emerald-400 hover:text-emerald-300 font-bold"
            >
              + Enable All
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleDisableAll}
              className="text-rose-400 hover:text-rose-300 font-bold"
            >
              - Disable All
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeCategoryFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Items ({definitions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('pages')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeCategoryFilter === 'pages'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pages Only ({totalPagesCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('features')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeCategoryFilter === 'features'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Features Only ({totalFeaturesCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages or features..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* SECTION 1: OWNER PAGES (মালিকের সাইডবার পেজসমূহ) */}
      {(activeCategoryFilter === 'all' || activeCategoryFilter === 'pages') && pagesList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                📄
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Owner Side Pages (মালিকের প্রধান স্ক্রিন ও পেজসমূহ)
                </h3>
                <p className="text-xs text-slate-500">
                  যেকোনো পেজ বন্ধ (OFF) করলে মালিকের সাইডবারে অপশনটি লক হয়ে যাবে
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {pagesList.length} টি পেজ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pagesList.map((def) => {
              const Icon = ICON_MAP[def.icon] || LayoutDashboard;
              const isEnabled = currentFeatures[def.key] !== false;

              return (
                <div
                  key={def.key}
                  className={`p-4 rounded-2xl border transition-all ${
                    isEnabled
                      ? 'bg-white border-slate-200 shadow-2xs hover:border-blue-300'
                      : 'bg-slate-50/80 border-slate-200/60 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isEnabled
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {def.title}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              isEnabled
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isEnabled ? 'ON • Active' : 'OFF • Disabled'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-blue-700 mt-0.5">
                          {def.titleBn}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 leading-snug">
                          {def.description}
                        </p>
                      </div>
                    </div>

                    {/* TOGGLE SWITCH */}
                    <button
                      type="button"
                      onClick={() => handleToggle(def.key)}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      role="switch"
                      aria-checked={isEnabled}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: FUNCTIONAL FEATURES (কার্যকরী ফিচার ও সুবিধা) */}
      {(activeCategoryFilter === 'all' || activeCategoryFilter === 'features') && featuresList.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">
                ⚡
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Owner Functional Features & Hardware (কার্যকরী ফিচার ও সুবিধা)
                </h3>
                <p className="text-xs text-slate-500">
                  বারকোড স্ক্যানার, রিসিট প্রিন্ট, ডিসকাউন্ট ও অনলাইন পেমেন্ট সুবিধা
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {featuresList.length} টি ফিচার
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {featuresList.map((def) => {
              const Icon = ICON_MAP[def.icon] || Zap;
              const isEnabled = currentFeatures[def.key] !== false;

              return (
                <div
                  key={def.key}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isEnabled
                      ? 'bg-white border-slate-200 shadow-2xs hover:border-amber-300'
                      : 'bg-slate-50/80 border-slate-200/60 opacity-80'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isEnabled
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* TOGGLE SWITCH */}
                      <button
                        type="button"
                        onClick={() => handleToggle(def.key)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                        role="switch"
                        aria-checked={isEnabled}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                          {def.title}
                        </h4>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase ${
                            isEnabled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
                        {def.titleBn}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        {def.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span className="font-mono text-[9px]">{def.key}</span>
                    <span className={isEnabled ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {isEnabled ? 'Enabled for Store' : 'Blocked / Disabled'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BOTTOM FLOATING SAVE BAR */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-slate-600">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          <span>
            পরিবর্তন সংরক্ষণ করলে সংশ্লিষ্ট দোকানের ব্রাউজারে সাথে সাথে লাইভ আপডেট হবে (Real-time Socket Sync Active)
          </span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={fetchFeaturesData}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
