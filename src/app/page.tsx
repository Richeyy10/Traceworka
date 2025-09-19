'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import RequisitionForm from '@/components/requisitionform';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex justify-between items-center bg-white p-4 shadow-md">
          <h1 className="text-xl font-bold text-black">Traceworka Requisition App</h1>
          <div className="flex items-center space-x-4">
            <Link href="/my-requisitions" className="mt-4 inline-block text-blue-600 hover:underline">
              Go to My Requisitions
            </Link>
          </div>
          <div>
            <button
              onClick={() => signOut()}
              className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </header>
        <main className="flex-1">
          <RequisitionForm requesterName={session.user?.name || ''} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Welcome to the Requisition App
      </h1>
      <p className="text-gray-600 mb-8">
        Please sign in to access and fill out the requisition form.
      </p>
      <button
        onClick={() => signIn()}
        className="py-2 px-6 rounded-lg shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        Sign In
      </button>
    </div>
  );
}