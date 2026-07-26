import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sidestep_drop_list_email';

export type CaptureStatus = 'idle' | 'submitting' | 'success' | 'error';

function mockSubscribe(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (!email.includes('@')) {
        reject(new Error('That address is missing an @ — check it and send again.'));
        return;
      }
      resolve();
    }, 500);
  });
}

export function useEmailCapture() {
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setEmail(stored);
      setStatus('success');
    }
  }, []);

  const submit = useCallback(async (value: string) => {
    setStatus('submitting');
    setError(null);
    try {
      await mockSubscribe(value);
      window.localStorage.setItem(STORAGE_KEY, value);
      setEmail(value);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setStatus('error');
    }
  }, []);

  return { status, email, error, submit, setEmail };
}
