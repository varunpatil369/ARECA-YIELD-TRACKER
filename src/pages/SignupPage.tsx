import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { translations, Language } from '../translations';
import { UserPlus, Mail, Lock, Eye, EyeOff, AlertTriangle, Loader2, TrendingUp } from 'lucide-react';

interface SignupPageProps {
  language: Language;
}

const SignupPage: React.FC<SignupPageProps> = ({ language }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const t = translations[language];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError(t.weakPassword);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordsDoNotMatch);
      return;
    }

    setIsSigningUp(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Store user in Firestore after signup
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        createdAt: serverTimestamp()
      });

      navigate('/');
    } catch (err: any) {
      console.error("Signup Error:", err);
      if (err.code === 'auth/invalid-email') {
        setError(t.invalidEmail);
      } else if (err.code === 'auth/email-already-in-use' || err.code === 'auth/account-exists-with-different-credential') {
        setError(t.accountExistsWithDifferentCredential);
      } else if (err.code === 'auth/weak-password') {
        setError(t.weakPassword);
      } else if (err.code === 'auth/network-request-failed') {
        setError(t.networkError);
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError(t.accountExistsWithDifferentCredential);
      } else {
        setError(err.message || "Signup failed.");
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
            <TrendingUp className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900">{t.appTitle}</h1>
          <p className="text-stone-500 mt-2">{t.addNewHarvest}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100 p-6 sm:p-8">
          <form onSubmit={handleSignup} className="space-y-5">
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
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-3 h-3" />
                {t.confirmPassword}
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              disabled={isSigningUp}
              className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigningUp ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              {isSigningUp ? t.saving : t.createAccount}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-stone-500 font-bold hover:text-emerald-600 transition-colors"
              >
                {t.hasAccount} <span className="text-emerald-600">{t.login}</span>
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

export default SignupPage;
