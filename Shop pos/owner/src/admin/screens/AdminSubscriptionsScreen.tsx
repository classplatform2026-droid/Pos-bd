import React, { useState, useEffect } from 'react';
import { Plus, Check, Edit2, X } from 'lucide-react';
import { api } from '../../services/api';
import { AdminPlanItem } from '../types';

interface AdminSubscriptionsScreenProps {
  onShowToast?: (msg: string, type?: 'success' | 'danger') => void;
  onNavigateToShop?: (shopId: string) => void;
}

export const AdminSubscriptionsScreen: React.FC<AdminSubscriptionsScreenProps> = ({
  onShowToast,
  onNavigateToShop: _onNavigateToShop,
}) => {
  const [plans, setPlans] = useState<AdminPlanItem[]>([
    {
      _id: 'plan_trial',
      name: 'Trial',
      price: 0,
      billingPeriod: '14 days',
      status: 'active',
      staffLimit: 10,
      productLimit: 500,
      features: [
        '14 Days Full Access (টাকা লাগবে না)',
        'Full POS Register',
        'Maximum 500 Products & Inventory',
        'Sales & Profit Analytics',
        'Customer Due & Khata',
        'Barcode & Receipt Printing',
      ],
    },
    {
      _id: 'plan_standard',
      name: 'Standard',
      price: 999,
      billingPeriod: 'month',
      status: 'active',
      staffLimit: 10,
      productLimit: 500,
      features: [
        'Continuous Full Access',
        'Full POS Register',
        'Maximum 500 Products & Inventory',
        'Sales & Profit Analytics',
        'Customer Due & Khata',
        'Barcode & Receipt Printing',
      ],
    },
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlanItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 499,
    billingPeriod: 'month',
    status: 'active' as 'active' | 'inactive',
    staffLimit: 2,
    productLimit: 500,
    featuresText: '2 Staff\n500 Products\nPOS',
  });

  const fetchPlans = async () => {
    try {
      const res = await api.getAdminPlans();
      if (res?.plans && res.plans.length > 0) {
        setPlans(res.plans);
      }
    } catch (err) {
      console.warn('Plans fetch notice:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      price: 499,
      billingPeriod: 'month',
      status: 'active',
      staffLimit: 5,
      productLimit: 1000,
      featuresText: '5 Staff\n1,000 Products\nPOS',
    });
    setModalOpen(true);
  };

  const openEditModal = (plan: AdminPlanItem) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price,
      billingPeriod: plan.billingPeriod || 'month',
      status: plan.status,
      staffLimit: plan.staffLimit,
      productLimit: plan.productLimit,
      featuresText: plan.features.join('\n'),
    });
    setModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const features = formData.featuresText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingPlan) {
        await api.updateAdminPlan(editingPlan._id, {
          name: formData.name,
          price: Number(formData.price),
          billingPeriod: formData.billingPeriod,
          status: formData.status,
          staffLimit: Number(formData.staffLimit),
          productLimit: Number(formData.productLimit),
          features,
        });
        if (onShowToast) onShowToast(`Plan "${formData.name}" updated.`, 'success');
      } else {
        await api.createAdminPlan({
          name: formData.name,
          price: Number(formData.price),
          billingPeriod: formData.billingPeriod,
          status: formData.status,
          staffLimit: Number(formData.staffLimit),
          productLimit: Number(formData.productLimit),
          features,
        });
        if (onShowToast) onShowToast(`Plan "${formData.name}" created.`, 'success');
      }
      setModalOpen(false);
      fetchPlans();
    } catch (err) {
      if (onShowToast) onShowToast((err as Error).message || 'Failed to save plan.', 'danger');
    }
  };

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Subscriptions</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage plans and active subscriptions</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Plan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {plans.map((plan) => {
          const isActive = plan.status === 'active';
          return (
            <div
              key={plan._id}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">{plan.name}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-slate-900">৳ {plan.price}</span>
                  <span className="text-xs text-slate-500 font-medium">/ {plan.billingPeriod || 'month'}</span>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-700">
                      <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                      <span className="font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEditModal(plan)}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit Plan</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">
                {editingPlan ? 'Edit Plan' : 'Create Plan'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePlan} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Price (৳ / mo)</label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Features (one per line)</label>
                <textarea
                  rows={3}
                  value={formData.featuresText}
                  onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
