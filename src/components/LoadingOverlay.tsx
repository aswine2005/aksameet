import React from 'react';

const LoadingOverlay = () => {
  return (
    <div className="z-50 fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 backdrop-blur-md">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Logo and spinner */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Animated spinner */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-8 border-white/20 rounded-full"></div>
          <div className="absolute inset-0 border-8 border-t-white border-r-white border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-3xl">
              🎥
            </div>
          </div>
        </div>

        {/* Loading text */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2 animate-pulse">
            Aksa Meet
          </h2>
          <p className="text-lg text-white/80">
            Setting up your meeting space...
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
