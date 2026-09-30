import Link from 'next/link';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import clsx from 'clsx';

import Videocam from './icons/Videocam';
import useTime from '../hooks/useTime';

interface HeaderProps {
  navItems?: boolean;
}

/** Set once AksaRank is live, so AksaMeet can link back to its platform. */
const AKSARANK_URL = process.env.NEXT_PUBLIC_AKSARANK_URL;

const Header = ({ navItems = true }: HeaderProps) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { currentDateTime } = useTime();
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <header className="w-full px-4 sm:px-6 py-3 flex items-center justify-between bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-40">
      <Link href="/" className="flex items-center gap-2.5 group shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
          <Videocam width={24} height={24} color="#ffffff" />
        </div>
        <div className="flex flex-col leading-none select-none">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xl tracking-tight text-gray-900">Aksa</span>
            <span className="font-semibold text-xl tracking-tight text-blue-600">Meet</span>
          </div>
          <span className="hidden sm:block text-[10px] font-medium uppercase tracking-wider text-gray-500 mt-0.5">
            by AksaRank
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2 sm:gap-4">
        {navItems && (
          <div
            suppressHydrationWarning
            className="hidden md:flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200/70 rounded-full text-xs font-medium text-gray-600 select-none"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span suppressHydrationWarning>{currentDateTime}</span>
          </div>
        )}
        {navItems && (
          <Link
            href="/check"
            className="hidden sm:inline text-sm font-medium text-gray-700 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50"
          >
            Camera check
          </Link>
        )}
        {navItems && isSignedIn && (
          <Link
            href="/history"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50"
          >
            History
          </Link>
        )}
        {navItems && AKSARANK_URL && (
          <a
            href={AKSARANK_URL}
            className="hidden sm:inline text-sm font-medium text-gray-700 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50"
          >
            AksaRank
          </a>
        )}
        <div className={clsx('flex items-center', isLoaded ? 'animate-fade-in' : 'opacity-0')}>
          {isSignedIn ? (
            <div className="flex items-center gap-3">
              {!navItems && (
                <span className="hidden sm:block text-sm text-gray-600 max-w-[16rem] truncate">
                  {email}
                </span>
              )}
              {/* Clerk's own button: account, switching and sign-out all work. */}
              <UserButton />
            </div>
          ) : (
            <SignInButton>
              <button
                type="button"
                className="h-9 px-4 rounded-xl text-sm font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50"
              >
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
