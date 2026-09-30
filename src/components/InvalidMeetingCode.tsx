import { useRouter } from 'next/navigation';

import Button from './Button';
import Header from './Header';

const InvalidMeetingCode = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50/30 to-white">
      <Header />
      <div className="w-full h-full flex flex-col items-center justify-center mt-[6.75rem] px-4">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-red-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative text-8xl">⚠️</div>
        </div>
        <h1 className="text-4xl sm:text-5xl leading-tight font-bold text-gray-900 tracking-normal mb-4 text-center">
          Invalid meeting code
        </h1>
        <p className="text-lg text-gray-600 mb-8 text-center max-w-md">
          Meeting codes look like <span className="font-mono">abc-defg-hij</span>
          . Check the link you were sent and try again.
        </p>
        <Button size="md" onClick={() => router.push('/')} className="shadow-xl">
          Return to home
        </Button>
      </div>
    </div>
  );
};

export default InvalidMeetingCode;
