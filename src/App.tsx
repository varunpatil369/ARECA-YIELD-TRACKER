import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { Language } from './translations';
import { Loader2 } from 'lucide-react';

// Components
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';

import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('app_language') as Language) || 'en';
  });

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'kn' : 'en';
    setLanguage(newLang);
    localStorage.setItem('app_language', newLang);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  return (
    <ErrorBoundary>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <LoginPage language={language} />} 
        />
        <Route 
          path="/signup" 
          element={user ? <Navigate to="/" /> : <SignupPage language={language} />} 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute user={user} isAuthReady={isAuthReady}>
              {user && (
                <Dashboard 
                  user={user} 
                  language={language} 
                  toggleLanguage={toggleLanguage} 
                />
              )}
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;
