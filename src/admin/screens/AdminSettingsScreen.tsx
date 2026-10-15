import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Clock,
  Check,
  Globe,
  Mail,
  Phone,
  Lock,
  User,
  Power,
  RefreshCw,
  Search,
  Database,
} from 'lucide-react';
import { api } from '../../services/api';

interface AdminSettingsScreenProps {
  onShowToast?: (msg: string, type?: 'success' | 'danger') => void;
}

export const AdminSettingsScreen: React.FC<AdminSettingsScreenProps> = ({ onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'audit'>('general');
  const [saving, setSaving] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');

  const [platformSettings, setPlatformSettings] = useState({
    platformName: 'ShopPOS SaaS Platform',
    supportEmail: 'support@shoppos.com',
    supportPhone: '+880 1700-000000',
    currencySymbol: '৳',
    maintenanceMode: false,
  });

  const [profile, setProfile] = useState({
    name: 'Admin Manager',
    email: 'admin@shoppos.com',
    newPassword: '',
    confirmPassword: '',
  });

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const loadSettings = async () => {
    try {
      const res = await api.getAdminSettings();
      if (res?.settings) {
        setPlatformSettings((prev) => ({ ...prev, ...res.settings }));
      }
      if (res?.currentAdmin) {
        setProfile((prev) => ({
          ...prev,
          name: res.currentAdmin.name || prev.name,
          email: res.currentAdmin.email || prev.email,
        }));
      }
    } catch {
      // Ignore network hiccup
    }
  };

  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await api.getAdminAuditLogs();
      if (res?.logs) setAuditLogs(res.logs);
    } catch {
      // Ignore
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSavePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateAdminPlatformSettings(platformSettings);
      if (onShowToast) onShowToast('Platform settings updated successfully.', 'success');
    } catch (err: any) {
      if (onShowToast) onShowToast(err?.message || 'Failed to update settings', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.newPassword && profile.newPassword !== profile.confirmPassword) {
      if (onShowToast) onShowToast('New passwords do not match.', 'danger');
      return;
    }
    setSaving(true);
    try {
      await api.updateAdminProfile({
        name: profile.name.trim(),
        email: profile.email.trim(),
        password: profile.newPassword || undefined,
      });
      setProfile((prev) => ({ ...prev, newPassword: '', confirmPassword: '' }));
      if (onShowToast) onShowToast('Admin profile updated successfully.', 'success');
    } catch (err: any) {
      if (onShowToast) onShowToast(err?.message || 'Profile update failed', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q) ||
      log.user?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-3.5 sm:p-6 space-y-5 max-w-4xl mx-auto pb-28 md:pb-8">
      {/* Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            <span>Settings</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Platform preferences, administrator access, and audit trail
          </p>
        </div>

        {/* Minimal Pill Segmented Tab Control */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-semibold text-slate-600 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Platform
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Admin Profile
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('audit');
              loadAuditLogs();
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {/* Tab 1: General Platform Settings (Minimal Card Style) */}
      {activeTab === 'general' && (
        <form onSubmit={handleSavePlatform} className="space-y-4">
          {/* Card: Brand & Regional */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Globe className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Platform Identity & Regional
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Platform Name
                </label>
                <input
                  type="text"
                  required
                  value={platformSettings.platformName}
                  onChange={(e) =>
                    setPlatformSettings({ ...platformSettings, platformName: e.target.value })
                  }
                  placeholder="e.g. ShopPOS Platform"
                  className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  required
                  value={platformSettings.currencySymbol}
                  onChange={(e) =>
                    setPlatformSettings({ ...platformSettings, currencySymbol: e.target.value })
                  }
                  placeholder="৳"
                  className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Support Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={platformSettings.supportEmail}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, supportEmail: e.target.value })
                    }
                    placeholder="support@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Support Helpline
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={platformSettings.supportPhone}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, supportPhone: e.target.value })
                    }
                    placeholder="+880 1700-000000"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Maintenance Mode (Minimal Toggle) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Power className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Maintenance Mode
                  </span>
                  {platformSettings.maintenanceMode && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Temporarily pause tenant operations while performing database updates or upgrades.
                </p>
              </div>

              {/* Minimal Apple/Stripe-like switch */}
              <button
                type="button"
                onClick={() =>
                  setPlatformSettings({
                    ...platformSettings,
                    maintenanceMode: !platformSettings.maintenanceMode,
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  platformSettings.maintenanceMode ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                role="switch"
                aria-checked={platformSettings.maintenanceMode}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    platformSettings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Minimal Save Bar */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Admin Profile & Security (Minimal Layout) */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Admin Identity Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Admin Credentials
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                <Shield className="w-3 h-3 text-slate-500" />
                <span>Super Administrator</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Admin Manager"
                  className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="admin@shoppos.com"
                  className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Password Security Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Lock className="w-4 h-4 text-slate-500" />
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Change Password
                </h2>
                <p className="text-[11px] text-slate-400">
                  Leave fields empty if you do not want to change your current password
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={profile.newPassword}
                  onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={profile.confirmPassword}
                  onChange={(e) => setProfile({ ...profile, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Minimal Save Bar */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{saving ? 'Updating...' : 'Update Profile'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Minimal Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Audit & System Events</span>
                </h2>
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full">
                  ২ দিন পর অটো রিমুভ (Auto-Purge: 2 Days)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                নিরাপত্তা ও অডিট ট্রেইল ইভেন্টসমূহ ২ দিন পর্যন্ত সংরক্ষিত থাকে এবং ২ দিন পর স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়।
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Filter events..."
                  className="pl-7 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={loadAuditLogs}
                disabled={auditLoading}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
                title="Refresh audit trail"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {filteredLogs.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Database className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
                <p className="font-semibold text-slate-600 text-xs">No audit events logged yet</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Administrative actions and logins will appear here automatically.
                </p>
              </div>
            ) : (
              filteredLogs.map((log, i) => (
                <div key={log._id || i} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                        {log.action}
                      </span>
                      <span className="text-slate-800 font-medium truncate">{log.details}</span>
                    </div>
                    {log.user && (
                      <p className="text-[10px] text-slate-400 mt-0.5">By: {log.user}</p>
                    )}
                  </div>
                  <span className="text-slate-400 font-mono text-[10px] shrink-0">
                    {new Date(log.timestamp || log.createdAt || Date.now()).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
