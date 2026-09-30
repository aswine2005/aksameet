import { FormEvent, useState } from 'react';
import { SignInButton } from '@clerk/nextjs';

import Button from './Button';
import Header from './Header';
import TextField from './TextField';

const MAX_NAME_LENGTH = 50;

interface GuestNameFormProps {
  meetingId: string;
  initialName: string;
  onSubmit: (name: string) => Promise<void>;
}

const GuestNameForm = ({
  meetingId,
  initialName,
  onSubmit,
}: GuestNameFormProps) => {
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const trimmedName = name.trim();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmedName || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(trimmedName.slice(0, MAX_NAME_LENGTH));
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-white">
      <Header navItems={false} />
      <main className="flex items-center justify-center px-4 py-16">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 flex flex-col items-center gap-6"
        >
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              What&apos;s your name?
            </h1>
            <p className="text-sm text-gray-600">
              You&apos;re joining <span className="font-mono">{meetingId}</span>{' '}
              as a guest. This is the name others will see.
            </p>
          </div>
          <TextField
            label="Your name"
            name="name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            rounding="lg"
            disabled={!trimmedName || submitting}
          >
            {submitting ? 'Please wait…' : 'Continue'}
          </Button>
          <p className="text-sm text-gray-600">
            Have an account?{' '}
            <SignInButton>
              <button type="button" className="text-blue-600 font-semibold">
                Sign in
              </button>
            </SignInButton>
          </p>
        </form>
      </main>
    </div>
  );
};

export default GuestNameForm;
