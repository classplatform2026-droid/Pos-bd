import React, { useState } from 'react';
import {
  Lock,
  Phone,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { ShopMasterLogo } from '../components/ShopMasterLogo';

export const LoginScreen: React.FC = () => {
  const { loginWithCredentials, suspendedAlertMessage, sessionNoticeMessage, setSessionNoticeMessage } = usePos();
  const [number, setNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSessionNoticeMessage(null);

    const cleanNum = number.trim();
    if (!cleanNum) {
      setError('Please enter your mobile number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await loginWithCredentials({ number: cleanNum, password });
    } catch (err) {
      setError((err as Error).message || 'Invalid mobile number or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 selection:bg-blue-100 selection:text-blue-900 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand logo & title */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center mx-auto shadow-md shadow-blue-500/10 p-2">
            <ShopMasterLogo size={52} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              ShopPOS
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cloud POS & Store Management
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {suspendedAlertMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-rose-900">Account Suspended</p>
                <p className="mt-0.5 text-rose-700 leading-relaxed">{suspendedAlertMessage}</p>
              </div>
            </div>
          )}

          {sessionNoticeMessage && !suspendedAlertMessage && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">Session Notice</p>
                <p className="mt-0.5 text-amber-700 leading-relaxed">{sessionNoticeMessage}</p>
              </div>
            </div>
          )}

          {error && !suspendedAlertMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoFocus
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors focus:outline-none cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? (
              <span>Logging in...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
