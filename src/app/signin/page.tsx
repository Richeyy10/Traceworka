'use client';

import SigninComponent from '@/components/SigninComponent';
import { Suspense } from 'react';
import { getProviders } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { ClientSafeProvider } from 'next-auth/react';

function SigninWrapper() {
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);
  
  useEffect(() => {
    const fetchProviders = async () => {
      const providers = await getProviders();
      setProviders(providers);
    };
    fetchProviders();
  }, []);

  return <SigninComponent providers={providers} />;
}

export default function SigninPage() {
  return (
    <Suspense fallback={<div>Loading providers...</div>}>
      <SigninWrapper />
    </Suspense>
  );
}
