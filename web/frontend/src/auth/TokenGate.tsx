import { useState, useEffect } from 'react';
import { setToken, hasToken, clearToken } from './token';
import { onUpdateRequired } from '../lib/api';

interface Props {
  children: React.ReactNode;
}

export default function TokenGate({ children }: Props) {
  const [authed, setAuthed] = useState(hasToken);
  const [updateRequired, setUpdateRequired] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    return onUpdateRequired(() => setUpdateRequired(true));
  }, []);

  useEffect(() => {
    function onUnauthorized() {
      clearToken();
      setAuthed(false);
      setError('رمز الوصول غير صحيح');
    }
    window.addEventListener('balagh:unauthorized', onUnauthorized);
    return () => window.removeEventListener('balagh:unauthorized', onUnauthorized);
  }, []);

  if (updateRequired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="max-w-sm w-full text-center space-y-4 p-8 bg-surface rounded-2xl border border-border">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold text-text-primary">تحديث مطلوب</h1>
          <p className="text-text-secondary text-sm">
            يرجى تحديث لوحة التحكم للاستمرار.
          </p>
          <p className="text-text-muted text-xs font-mono">UPDATE_REQUIRED</p>
        </div>
      </div>
    );
  }

  if (authed) return <>{children}</>;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setError('يرجى إدخال رمز الوصول');
      return;
    }
    setToken(trimmed);
    setAuthed(true);
    setError('');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="max-w-sm w-full space-y-6 p-8 bg-surface rounded-2xl border border-border shadow-2xl">
        <div className="text-center space-y-2">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white text-xl font-bold"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            ب
          </div>
          <h1 className="text-xl font-bold text-text-primary">بلاغ — لوحة التحكم</h1>
          <p className="text-text-secondary text-sm">أدخل رمز الوصول للمتابعة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(''); }}
              placeholder="رمز الوصول"
              autoFocus
              className="w-full px-4 py-3 bg-surface-alt border border-border rounded-lg text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-[color:var(--accent)] transition-colors"
              dir="ltr"
            />
            {error && <p className="text-severity-critical text-xs mt-1">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            دخول
          </button>
        </form>
      </div>
    </div>
  );
}
