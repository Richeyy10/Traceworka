'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import RequisitionForm from '@/components/requisitionform';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'authenticated') {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex justify-between flex-row sm:flex-row sm:justify-between sm:items-center bg-white p-4 shadow-md space-y-4 sm:space-y-0">
          <h1 className="text-xl font-bold text-black">Traceworka</h1>
          <div className="flex items-center space-x-4">
            <Link href="/my-requisitions" className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              My Requisitions
            </Link>
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
  } else if (status === 'unauthenticated') {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-4">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
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
      </div>
    );
  } else {
    // This handles the 'loading' status and any other unexpected states.
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }
}
