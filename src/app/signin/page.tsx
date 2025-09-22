import { getProviders } from "next-auth/react";
import { Suspense } from 'react';
import SigninComponent from "@/components/SigninComponent";
export default async function SignInPage() {
  const providers = await getProviders();
  return(
    <Suspense fallback={<div>Loading...</div>}>
      <SigninComponent providers={providers} />;
    </Suspense>
  );
}
