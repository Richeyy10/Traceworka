import { getProviders } from "next-auth/react";
import SigninComponent from "@/components/SigninComponent";
export default async function SignInPage() {
  const providers = await getProviders();
  return <SigninComponent providers={providers} />;
}