"use client";

import { useState, FormEvent } from 'react';
import { signIn, ClientSafeProvider } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InputField from './ui/inputfield';

interface SigninComponentProps {
  providers: Record<string, ClientSafeProvider> | null;
}

export default function SigninComponent({ providers }: SigninComponentProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        redirect: true, // This is the fix. The app now handles the redirect correctly.
        email: formData.email,
        password: formData.password,
        callbackUrl: '/',
      });

    } catch (err) {
      console.error('Sign-in failed:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>
        {error && (
          <p className="text-red-500 text-sm text-center mb-4">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="e.g., john.doe@company.com"
            required
          />
          <InputField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter your password"
            required
          />
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>
        {providers && Object.values(providers).filter(provider => provider.id !== 'credentials').map(provider => (
          <div key={provider.name} className="mt-4">
            <button
              onClick={() => signIn(provider.id, { callbackUrl: '/' })}
              className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in with {provider.name}
            </button>
          </div>
        ))}
        <div className="text-center mt-4">
          <p className="text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-blue-600 hover:underline">
              Sign Up
            </Link>
          </p>
          <div className="text-center mt-4">
            <p className="text-gray-600">
              Forgot password?{' '}
                <Link href="/forgot-password" className="text-blue-600 hover:underline">
                    Reset Password
                </Link>
            </p>
            </div>
        </div>
      </div>
    </div>
  );
}
