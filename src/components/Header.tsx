import Link from 'next/link';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import clsx from 'clsx';

import Apps from './icons/Apps';
import Avatar from './Avatar';
import Feedback from './icons/Feedback';
import Help from './icons/Help';
import IconButton from './IconButton';
import PlainButton from './PlainButton';
import Videocam from './icons/Videocam';
import Settings from './icons/Settings';
import useTime from '../hooks/useTime';

interface HeaderProps {
  navItems?: boolean;
}

const Header = ({ navItems = true }: HeaderProps) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { currentDateTime } = useTime();
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <header className="w-full px-4 sm:px-6 py-3 flex items-center justify-between bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-40">
      <div className="w-64 max-w-full">
        <Link href="/" className="flex items-center gap-2.5 w-full group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
            <Videocam width={24} height={24} color="#ffffff" />
          </div>
          <div className="flex items-center gap-1.5 select-none">
            <span className="font-bold text-xl tracking-tight text-gray-900">Aksa</span>
            <span className="font-semibold text-xl tracking-tight text-blue-600">Meet</span>
            <span className="hidden sm:inline-block ml-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
              HD
            </span>
          </div>
        </Link>
      </div>
      <div className="flex items-center cursor-default">
        {navItems && (
          <>
            <div
              suppressHydrationWarning
              className="hidden md:flex items-center gap-2 mr-3 px-3 py-1 bg-gray-50 border border-gray-200/70 rounded-full text-xs font-medium text-gray-600 select-none"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span suppressHydrationWarning>{currentDateTime}</span>
            </div>
            <div className="hidden sm:contents [&>button]:mx-1.5">
              <IconButton title="Support" icon={<Help />} />
              <IconButton title="Report a problem" icon={<Feedback />} />
              <IconButton title="Settings" icon={<Settings />} />
            </div>
          </>
        )}
        <div className="ml-2 flex items-center justify-end w-[6.5625rem] lg:ml-5">
          {navItems && (
            <div className="hidden sm:block">
              <IconButton title="Apps" icon={<Apps />} />
            </div>
          )}
          <div
            className={clsx(
              'w-[3.04rem] grow flex items-center justify-end [&_img]:w-9 [&_span]:w-9 [&_img]:h-9 [&_span]:h-9',
              isLoaded ? 'animate-fade-in' : 'opacity-0'
            )}
          >
            {isSignedIn ? (
              <>
                {!navItems && (
                  <div className="hidden sm:block mr-3 font-roboto leading-4 text-right text-meet-black">
                    <div className="text-sm leading-4">{email}</div>
                    <div className="text-sm hover:text-meet-blue cursor-pointer">
                      Switch account
                    </div>
                  </div>
                )}
                <div className="relative h-9">
                  <UserButton />
                  <div className="absolute left-0 top-0 flex items-center justify-center pointer-events-none">
                    <Avatar
                      participant={{
                        name: user?.fullName,
                        image: user.hasImage ? user.imageUrl : undefined,
                      }}
                      width={36}
                    />
                  </div>
                </div>
              </>
            ) : (
              <SignInButton>
                <PlainButton size="sm">Sign In</PlainButton>
              </SignInButton>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
