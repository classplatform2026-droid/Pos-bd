import React, { useState, useEffect } from 'react';
import {
  Store,
  Search,
  Plus,
  ArrowLeft,
  Phone,
  Building,
  Users,
  AlertTriangle,
  X,
  Check,
  Copy,
  Eye,
  EyeOff,
  ShoppingBag,
  Sparkles,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { usePos } from '../../context/PosContext';
import { AdminStoreItem } from '../types';

interface AdminShopsScreenProps {
  initialSelectedShopId?: string | null;
  onClearSelectedShop?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'danger') => void;
  onSwitchToOwnerPos?: () => void;
}

export const AdminShopsScreen: React.FC<AdminShopsScreenProps> = ({
  initialSelectedShopId,
  onClearSelectedShop,
  onShowToast,
  onSwitchToOwnerPos,
}) => {
  const { impersonateStore } = usePos();
  const [stores, setStores] = useState<AdminStoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedShopId, setSelectedShopId] = useState<string | null>(initialSelectedShopId || null);
  const [shopDetails, setShopDetails] = useState<any | null>(null);

  // Add Shop Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [_copiedField, setCopiedField] = useState<string | null>(null);

  const initialShopForm = {
    name: '',
    branch: 'Main Branch',
    storeType: 'grocery' as 'grocery' | 'fashion' | 'electronics' | 'pharmacy' | 'restaurant' | 'general',
    phone: '',
    address: 'Dhaka, Bangladesh',
    tagline: 'Retail POS Store',
    currency: '৳',
    taxRate: 0,
    printerSize: '80mm' as '80mm' | '58mm',
    receiptFooter: 'Thank you for shopping with us! Please come again.',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    ownerPassword: '123456',
    pin: '1234',
    plan: 'Trial',
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    seedProducts: true,
  };

  const [newShop, setNewShop] = useState(initialShopForm);

  // Success Credentials Modal State
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<any | null>(null);

  // Suspend Modal State
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [targetShopForSuspend, setTargetShopForSuspend] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState('Your account has been suspended by the administrator.');

  const fetchStores = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminStores({
        search,
        status: statusFilter,
        type: typeFilter,
        plan: planFilter,
      });
      if (res?.stores) {
        setStores(res.stores);
      }
    } catch (err) {
      console.warn('Fetch stores notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [search, statusFilter, typeFilter, planFilter]);

  const loadShopDetails = async (id: string) => {
    try {
      const res = await api.getAdminStoreDetails(id);
      if (res?.store) {
        setShopDetails(res);
      }
    } catch (err) {
      console.warn('Failed to load shop details:', err);
    }
  };

  useEffect(() => {
    if (selectedShopId) {
      loadShopDetails(selectedShopId);
    } else {
      setShopDetails(null);
    }
  }, [selectedShopId]);

  useEffect(() => {
    if (initialSelectedShopId) {
      setSelectedShopId(initialSelectedShopId);
    }
  }, [initialSelectedShopId]);

  // Adjust tax rate when store type changes if untouched
  const handleStoreTypeChange = (type: any) => {
    let defTax = 0;
    if (type === 'fashion' || type === 'electronics' || type === 'general') {
      defTax = 5;
    }
    setNewShop((prev) => ({
      ...prev,
      storeType: type,
      taxRate: defTax,
    }));
  };

  const handleToggleSuspend = async (store: any) => {
    try {
      if (store.status === 'suspended') {
        await api.adminActivateStore(store._id);
        if (onShowToast) onShowToast(`Store "${store.name}" activated successfully.`, 'success');
        fetchStores();
        if (selectedShopId === store._id) loadShopDetails(store._id);
      } else {
        setTargetShopForSuspend(store);
        setSuspendModalOpen(true);
      }
    } catch (err) {
      if (onShowToast) onShowToast((err as Error).message || 'Failed to update store status.', 'danger');
    }
  };

  const confirmSuspend = async () => {
    if (!targetShopForSuspend) return;
    try {
      await api.adminSuspendStore(targetShopForSuspend._id, suspendReason);
      if (onShowToast) onShowToast(`Store "${targetShopForSuspend.name}" suspended. Owner logged out.`, 'danger');
      setSuspendModalOpen(false);
      fetchStores();
      if (selectedShopId === targetShopForSuspend._id) loadShopDetails(targetShopForSuspend._id);
    } catch (err) {
      if (onShowToast) onShowToast((err as Error).message || 'Failed to suspend store.', 'danger');
    }
  };

  const handleOpenStorePos = async (storeId: string) => {
    try {
      const ok = await impersonateStore(storeId);
      if (ok) {
        if (onShowToast) onShowToast('Switched to Store POS session.', 'success');
        if (onSwitchToOwnerPos) {
          onSwitchToOwnerPos();
        }
      } else {
        if (onShowToast) onShowToast('Could not open store POS.', 'danger');
      }
    } catch (err) {
      if (onShowToast) onShowToast((err as Error).message || 'Failed to open store POS', 'danger');
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShop.name.trim()) {
      if (onShowToast) onShowToast('Shop Name is required.', 'danger');
      return;
    }
    const cleanPhone = (newShop.phone || newShop.ownerPhone || '').trim();
    if (!cleanPhone) {
      if (onShowToast) onShowToast('Contact / Login Phone is required.', 'danger');
      return;
    }
    if (!newShop.ownerName.trim()) {
      if (onShowToast) onShowToast('Owner Name is required.', 'danger');
      return;
    }

    setAddLoading(true);
    try {
      const payload = {
        ...newShop,
        name: newShop.name.trim(),
        phone: cleanPhone,
        ownerPhone: cleanPhone,
        ownerName: newShop.ownerName.trim(),
        ownerPassword: newShop.ownerPassword || '123456',
        pin: newShop.pin || '1234',
        branch: newShop.branch?.trim() || 'Main Branch',
        address: newShop.address?.trim() || 'Dhaka, Bangladesh',
        currency: '৳',
        plan: newShop.plan || 'Trial',
      };
      const res = await api.createAdminStore(payload);
      if (onShowToast) onShowToast(`Shop "${newShop.name}" created successfully!`, 'success');
      setAddModalOpen(false);
      setShowAdvancedOptions(false);
      setCreatedCredentials(res.credentials || {
        shopId: res.store?._id,
        shopName: newShop.name,
        branch: newShop.branch || 'Main Branch',
        ownerName: newShop.ownerName,
        loginPhone: cleanPhone,
        loginPassword: newShop.ownerPassword || '123456',
        pin: newShop.pin || '1234',
        plan: newShop.plan || 'Trial',
      });
      setCredentialsModalOpen(true);
      setNewShop(initialShopForm);
      fetchStores();
    } catch (err) {
      if (onShowToast) onShowToast((err as Error).message || 'Failed to create shop.', 'danger');
    } finally {
      setAddLoading(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    if (onShowToast) onShowToast(`${fieldName} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyFullCredentials = () => {
    if (!createdCredentials) return;
    const text = `🏪 ShopPOS Access Credentials\nShop: ${createdCredentials.shopName} (${createdCredentials.branch})\nOwner: ${createdCredentials.ownerName}\nLogin Number: ${createdCredentials.loginPhone}\nPassword: ${createdCredentials.loginPassword}\nPOS PIN: ${createdCredentials.pin}\nPlan: ${createdCredentials.plan}\nLogin at: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast('Full credentials copied to clipboard!', 'success');
  };

  // If a shop is selected, show details view
  if (selectedShopId && shopDetails) {
    const { store, owner, metrics } = shopDetails;
    return (
      <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        <button
          type="button"
          onClick={() => {
            setSelectedShopId(null);
            if (onClearSelectedShop) onClearSelectedShop();
          }}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shops List</span>
        </button>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">{store.name}</h1>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${
                    store.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {store.status === 'active' ? 'Active' : 'Suspended'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  {store.storeType}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {store.branch} • Tagline: {store.tagline || 'Retail Store'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenStorePos(store._id)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Open Store POS</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleSuspend(store)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs transition-colors ${
                store.status === 'active'
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {store.status === 'active' ? 'Suspend Shop' : 'Activate Shop'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Shop Details */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Shop Profile</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Store Phone</span>
                <span className="font-semibold text-slate-800">{store.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Address</span>
                <span className="font-semibold text-slate-800">{store.address}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Tax / VAT</span>
                  <span className="font-semibold text-slate-800">{store.taxRate || 0}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Printer Size</span>
                  <span className="font-semibold text-slate-800">{store.printerSize || '80mm'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Owner & Login */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Owner & Login Credentials</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Owner Name</span>
                <span className="font-semibold text-slate-800">{owner?.name || 'Owner'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Login Mobile Number</span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{owner?.phone || store.phone}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(owner?.phone || store.phone, 'Mobile Number')}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Email</span>
                <span className="text-slate-600">{owner?.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Subscription & Performance */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Subscription & Activity</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Active Plan</span>
                  <span className="text-sm font-black text-slate-900">{store.subscription?.plan || 'Pro'}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {store.subscription?.status?.toUpperCase() || 'ACTIVE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase">Total Orders</span>
                  <span className="text-base font-black text-slate-900">{metrics?.totalOrders || 0}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase">Products</span>
                  <span className="text-base font-black text-slate-900">{metrics?.totalProducts || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Shops Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage SaaS registered stores, owner logins, and subscriptions</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNewShop(initialShopForm);
            setShowAdvancedOptions(false);
            setAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all w-full sm:w-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Shop</span>
        </button>
      </div>

      {/* Filter and search toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by shop name, owner or mobile..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="grocery">Grocery</option>
            <option value="fashion">Fashion</option>
            <option value="electronics">Electronics</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="restaurant">Restaurant</option>
            <option value="general">General</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-none"
          >
            <option value="all">All Plans</option>
            <option value="trial">Trial (14 Days)</option>
            <option value="standard">Standard</option>
          </select>
        </div>
      </div>

      {/* Stores List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading shops...</div>
      ) : stores.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">No Shops Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'No stores match your current search and filters.'
              : 'There are currently no stores in the system. Click "Add New Shop" to create your first store with default owner credentials.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setNewShop(initialShopForm);
              setShowAdvancedOptions(false);
              setAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Shop</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {/* Mobile Shops Cards (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {stores.map((s) => (
              <div key={s._id} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
                      <span
                        className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          s.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {s.status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {s.branch || 'Main Branch'} • {s.storeType || 'grocery'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg shrink-0">
                    {s.subscription?.plan || 'Standard'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-xl">
                  <span>Owner: <strong className="text-slate-800">{s.ownerName || 'Owner'}</strong></span>
                  <span className="font-mono text-blue-600 font-bold">{s.phone}</span>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenStorePos(s._id)}
                    className="flex-1 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 active:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>POS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedShopId(s._id)}
                    className="flex-1 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 active:bg-slate-200 rounded-xl text-center cursor-pointer"
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSuspend(s)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                      s.status === 'active'
                        ? 'text-rose-600 bg-rose-50 active:bg-rose-100'
                        : 'text-emerald-700 bg-emerald-50 active:bg-emerald-100'
                    }`}
                  >
                    {s.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Shop & Branch</th>
                  <th className="py-3 px-4">Owner & Mobile</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-400">{s.branch || 'Main Branch'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{s.ownerName || 'Owner'}</div>
                      <div className="text-[11px] font-mono text-blue-600">{s.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                        {s.storeType || 'grocery'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-700">
                        {s.subscription?.plan || 'Pro'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {s.status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenStorePos(s._id)}
                          title="Open Store POS as Owner"
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>POS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedShopId(s._id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSuspend(s)}
                          className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                            s.status === 'active'
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {s.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MINIMAL CREATE NEW SHOP MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xl max-w-md w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Create New Shop</h2>
                  <p className="text-[11px] text-slate-500">নতুন দোকান ও মালিকের অ্যাকাউন্ট সেটআপ করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddModalOpen(false);
                  setShowAdvancedOptions(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateShop} className="p-5 space-y-3.5 text-xs max-h-[82vh] overflow-y-auto">
              {/* 1. Shop Name */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  দোকানের নাম (Shop Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="যেমন: আল-মদিনা স্টোর বা ঢাকা ফ্যাশন"
                  value={newShop.name}
                  onChange={(e) => setNewShop({ ...newShop, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs sm:text-sm transition-all placeholder:text-slate-400"
                />
              </div>

              {/* 2. Owner Name & Login Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    মালিকের নাম (Owner) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: মোঃ রহিম"
                    value={newShop.ownerName}
                    onChange={(e) => setNewShop({ ...newShop, ownerName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs sm:text-sm transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    লগইন মোবাইল <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="01XXXXXXXXX"
                      value={newShop.phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewShop({
                          ...newShop,
                          phone: val,
                          ownerPhone: val,
                        });
                      }}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs sm:text-sm transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Business Category */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ব্যবসার ধরন (Category)
                </label>
                <select
                  value={newShop.storeType}
                  onChange={(e) => handleStoreTypeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs transition-all"
                >
                  <option value="grocery">মুদি ও সুপারশপ (Grocery)</option>
                  <option value="fashion">ফ্যাশন ও গার্মেন্টস (Fashion)</option>
                  <option value="pharmacy">ফার্মেসি ও মেডিসিন (Pharmacy)</option>
                  <option value="restaurant">রেস্টুরেন্ট ও ক্যাফে (Restaurant)</option>
                  <option value="electronics">ইলেকট্রনিক্স ও গ্যাজেট (Electronics)</option>
                  <option value="general">জেনারেল রিটেইল (General)</option>
                </select>
              </div>

              {/* 4. Subscription Plan - 2 Plans: Trial (14 Days) & Standard */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">প্যাকেজ (Plan)</label>
                  <span className="text-[10px] text-emerald-600 font-semibold">১৪ দিন ফ্রি ট্রায়াল অন্তর্ভুক্ত</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'Trial',
                      name: 'Trial (১৪ দিন)',
                      price: '৳ ০',
                      period: '১৪ দিন ফ্রি',
                      note: 'টাকা লাগবে না • ফুল ফিচার',
                      badge: 'Free',
                    },
                    {
                      id: 'Standard',
                      name: 'Standard',
                      price: '৳ ৯৯৯',
                      period: 'মাসিক',
                      note: 'একই ফিচার • নিয়মিত সেবা',
                      badge: 'Paid',
                    },
                  ].map((p) => {
                    const isSelected = newShop.plan === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setNewShop({ ...newShop, plan: p.id })}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900">{p.name}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              p.id === 'Trial' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {p.badge}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-extrabold text-blue-700">{p.price}</span>
                          <span className="text-[10px] text-slate-400">/{p.period}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate mt-0.5">{p.note}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Collapsible Custom / Security Settings */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center justify-between w-full py-1.5 px-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                    <span>পাসওয়ার্ড ও শাখা সেটিংস ({showAdvancedOptions ? 'লুকান' : 'পরিবর্তন করুন'})</span>
                  </span>
                  {showAdvancedOptions ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {showAdvancedOptions && (
                  <div className="mt-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-slate-700 text-[11px]">পাসওয়ার্ড</label>
                          <span className="text-[9px] text-slate-400">ডিফল্ট: 123456</span>
                        </div>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newShop.ownerPassword}
                            onChange={(e) => setNewShop({ ...newShop, ownerPassword: e.target.value })}
                            className="w-full pl-2.5 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-slate-700 text-[11px]">ক্যাশিয়ার পিন (PIN)</label>
                          <span className="text-[9px] text-slate-400">ডিফল্ট: 1234</span>
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          value={newShop.pin}
                          onChange={(e) => setNewShop({ ...newShop, pin: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="font-bold text-slate-700 text-[11px] block mb-1">ব্রাঞ্চ (Branch)</label>
                        <input
                          type="text"
                          value={newShop.branch}
                          onChange={(e) => setNewShop({ ...newShop, branch: e.target.value })}
                          placeholder="Main Branch"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 text-[11px] block mb-1">ঠিকানা (Address)</label>
                        <input
                          type="text"
                          value={newShop.address}
                          onChange={(e) => setNewShop({ ...newShop, address: e.target.value })}
                          placeholder="Dhaka, Bangladesh"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Starter Catalog toggle */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newShop.seedProducts}
                  onChange={(e) => setNewShop({ ...newShop, seedProducts: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span className="text-slate-600 text-[11px]">
                  দোকানে প্রাথমিক স্যাম্পল পণ্য ও বারকোড যোগ করুন
                </span>
              </label>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddModalOpen(false);
                    setShowAdvancedOptions(false);
                  }}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {addLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>তৈরি হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Create Shop (দোকান তৈরি করুন)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post-Creation Success Credentials Modal */}
      {credentialsModalOpen && createdCredentials && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Shop Created Successfully!</h2>
              <p className="text-xs text-slate-500">
                দোকান চালু হয়েছে। লগইন তথ্য মালিককে শেয়ার করুন:
              </p>
            </div>

            {/* Credentials Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Store Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{createdCredentials.shopName}</span>
                </div>
                <span className="text-xs font-semibold text-blue-700">
                  {createdCredentials.plan} Plan
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Owner</span>
                <span className="font-semibold text-slate-800">{createdCredentials.ownerName}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Login Mobile Number</span>
                    <span className="font-mono font-bold text-xs text-blue-700">{createdCredentials.loginPhone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.loginPhone, 'Mobile Number')}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                    title="Copy Mobile"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Password</span>
                    <span className="font-mono font-bold text-xs text-slate-800">{createdCredentials.loginPassword}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.loginPassword, 'Password')}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                    title="Copy Password"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">POS Security PIN</span>
                    <span className="font-mono font-bold text-xs text-slate-800">{createdCredentials.pin}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.pin, 'PIN')}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                    title="Copy PIN"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={copyFullCredentials}
                className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Full Credentials Message</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCredentialsModalOpen(false);
                    setCreatedCredentials(null);
                  }}
                  className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
                {createdCredentials.shopId && (
                  <button
                    type="button"
                    onClick={() => {
                      setCredentialsModalOpen(false);
                      handleOpenStorePos(createdCredentials.shopId);
                    }}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Open Store POS</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-base font-extrabold text-slate-900">Suspend Store?</h2>
              <p className="text-xs text-slate-500">
                Suspending <span className="font-bold text-slate-800">{targetShopForSuspend?.name}</span> will immediately deactivate POS register access and log out all active store staff.
              </p>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Reason for Suspension</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={2}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendModalOpen(false)}
                className="flex-1 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSuspend}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-500/20"
              >
                Suspend Shop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
