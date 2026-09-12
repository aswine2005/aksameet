'use client';
import React from 'react';
import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-blue-50/40 via-white to-gray-50 py-12 px-4">
      <SignIn />
    </div>
  );
}
