'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (user) router.replace('/dashboard');
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setIsLoading(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // One-click mock login — fills credentials and logs in instantly
  const handleMockLogin = async () => {
    setIsLoading(true);
    try {
      await login('oliver.brown@domain.io', 'demo');
      toast.success('Logged in as mock user!');
      router.replace('/dashboard');
    } catch {
      toast.error('Mock login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (IS_MOCK) {
      toast('Google OAuth requires a real backend. Use the demo login instead.', { icon: 'ℹ️' });
      return;
    }
    setIsGoogleLoading(true);
    window.location.href = authApi.googleLoginUrl();
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

        {/* Mock mode banner */}
        {isMounted && IS_MOCK && (
          <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 mb-1">🚧 Mock Mode Active</p>
            <p className="text-xs text-amber-600">
              Backend not connected. Use the demo button below to explore the full UI.
            </p>
          </div>
        )}

        <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">Login</h1>

        {/* Demo login button — only in mock mode */}
        {isMounted && IS_MOCK && (
          <button
            onClick={handleMockLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl py-3 px-4 text-sm transition-colors duration-200 mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : '⚡'}
            Quick Demo Login
          </button>
        )}

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="w-full flex items-center justify-center gap-3 bg-green-50 border border-green-100 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 hover:bg-green-100 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed mb-5"
        >
          {isGoogleLoading ? (
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Login with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or sign up through email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email + Password form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            id="email"
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
            autoComplete="email"
          />
          <input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
            autoComplete="current-password"
          />
          <button
            id="login-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors duration-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Logging in…
              </span>
            ) : 'Login'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-green-600 hover:underline font-medium">Register</a>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
