import { useState, type FormEvent } from 'react';
import { useEmailCapture } from '../hooks/useEmailCapture';

export default function EmailCapture() {
  const { status, email, error, submit, setEmail } = useEmailCapture();
  const [value, setValue] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;
    submit(value);
  };

  if (status === 'success') {
    return (
      <div className="border border-hairline bg-label px-5 py-4 flex items-center gap-3 min-h-[52px]">
        <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-in-stock shrink-0">
          Stamped
        </span>
        <span className="font-mono text-[15px]">On the list. Thursday, 11:00.</span>
        <span className="font-mono text-[13px] text-ink-muted ml-auto hidden sm:inline truncate">
          {email}
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3" noValidate>
      <div className="flex-1 flex flex-col gap-1.5">
        <label htmlFor="drop-email" className="sr-only">
          Email address
        </label>
        <input
          id="drop-email"
          type="email"
          inputMode="email"
          placeholder="you@email.com"
          value={value}
          disabled={status === 'submitting'}
          onChange={(e) => {
            setValue(e.target.value);
            setEmail(e.target.value);
          }}
          className={`h-12 px-4 bg-label border font-body text-[17px] w-full ${
            status === 'error' ? 'border-sold' : 'border-hairline'
          }`}
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? 'email-error' : 'email-helper'}
        />
        {status === 'error' ? (
          <p id="email-error" className="text-[15px] text-sold">
            {error}
          </p>
        ) : (
          <p id="email-helper" className="font-mono text-[13px] text-ink-muted uppercase tracking-[0.08em]">
            One email per drop.
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="press inline-flex items-center justify-center bg-accent text-ink font-medium text-[15px] h-12 px-6 w-full sm:w-[200px] shrink-0 hover:brightness-95 disabled:brightness-90"
      >
        {status === 'submitting' ? 'Sending…' : 'Get the drop list'}
      </button>
    </form>
  );
}
