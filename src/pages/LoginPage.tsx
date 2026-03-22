import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { translations, Language } from '../translations';
import { LogIn, Mail, Lock, Eye, EyeOff, AlertTriangle, Loader2, TrendingUp, ArrowLeft, CheckCircle } from 'lucide-react';

interface LoginPageProps {
  language: Language;
}

const LoginPage: React.FC<LoginPageProps> = ({ language }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const t = translations[language];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoggingIn(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === 'auth/invalid-email') {
        setError(t.invalidEmail);
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(t.authError);
      } else if (err.code === 'auth/too-many-requests') {
        setError(t.tooManyRequests);
      } else if (err.code === 'auth/network-request-failed') {
        setError(t.networkError);
      } else if (err.code === 'auth/user-disabled') {
        setError(t.userDisabled);
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError(t.accountExistsWithDifferentCredential);
      } else {
        setError(err.message || "Login failed.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t.invalidEmail);
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setResetSent(true);
    } catch (err: any) {
      console.error("Reset Error:", err);
      if (err.code === 'auth/invalid-email') {
        setError(t.invalidEmail);
      } else if (err.code === 'auth/user-not-found') {
        // If enumeration protection is on, this might not be thrown
        setError(t.authError);
      } else if (err.code === 'auth/too-many-requests') {
        setError(t.tooManyRequests);
      } else if (err.code === 'auth/network-request-failed') {
        setError(t.networkError);
      } else {
        setError(err.message || "Failed to send reset link.");
      }
    } finally {
      setIsResetting(false);
    }
  };

  if (view === 'forgot') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
              <Lock className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-stone-900">{t.resetPassword}</h1>
            <p className="text-stone-500 mt-2">{t.signInSubtitle}</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100 p-6 sm:p-8">
            {resetSent ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-stone-700 font-bold">{t.resetLinkSent}</p>
                <button
                  onClick={() => setView('login')}
                  className="w-full flex items-center justify-center gap-2 text-emerald-600 font-bold hover:bg-emerald-50 py-3 rounded-xl transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t.backToLogin}
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-widest flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    {t.email}
                  </label>
                  <input
                    type="email"
                    placeholder="farmer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-4 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-lg font-bold"
                    required
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                  {isResetting ? t.saving : t.sendResetLink}
                </button>

                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="w-full flex items-center justify-center gap-2 text-stone-500 font-bold hover:bg-stone-50 py-3 rounded-xl transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t.backToLogin}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
            <TrendingUp className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900">{t.appTitle}</h1>
          <p className="text-stone-500 mt-2">{t.signInSubtitle}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100 p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-widest flex items-center gap-2">
                <Mail className="w-3 h-3" />
                {t.email}
              </label>
              <input
                type="email"
                placeholder="farmer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-lg font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-3 h-3" />
                {t.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-lg font-bold pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="text-right mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot');
                    setError(null);
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  {t.forgotPassword}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {isLoggingIn ? t.signingIn : t.login}
            </button>

            <div className="text-center">
              <Link
                to="/signup"
                className="text-sm text-stone-500 font-bold hover:text-emerald-600 transition-colors"
              >
                {t.noAccount} <span className="text-emerald-600">{t.signUp}</span>
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-stone-400 leading-relaxed px-4">
            {t.termsNote}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
