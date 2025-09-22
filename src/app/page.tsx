'use client';

import { useSession, signOut, getProviders } from 'next-auth/react';
import RequisitionForm from '@/components/requisitionform';
import SigninComponent from '@/components/SigninComponent';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { ClientSafeProvider } from 'next-auth/react';

function RenderComponent() {
  const { data: session, status } = useSession();
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);
  
  useEffect(() => {
    const fetchProviders = async () => {
      const providers = await getProviders();
      setProviders(providers);
    };
    fetchProviders();
  }, []);

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
  } else {
    return (
      <SigninComponent providers={providers} />
    );
  }
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RenderComponent />
    </Suspense>
  );
}
