'use client';

import { useState, FormEvent } from 'react';
import InputField from '@/components/ui/inputfield';
import { useRouter } from 'next/navigation';

export default function SignupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    branch: '',
    password: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Registration successful! Redirecting to login...');
        setTimeout(() => {
          router.push('/api/auth/signin');
        }, 2000);
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-100 min-h-screen">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Sign Up
        </h1>
        {message && <p className="text-green-600 text-center mb-4">{message}</p>}
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Full Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., John Doe"
            required
          />
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
            label="Department"
            name="department"
            type="text"
            value={formData.department}
            onChange={handleInputChange}
            placeholder="e.g., Engineering, Sales, HR"
            required
          />
          <InputField
            label="Branch"
            name="branch"
            type="text"
            value={formData.branch}
            onChange={handleInputChange}
            placeholder="e.g., Ibadan, Abuja, Lagos"
            required
          />
          <InputField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Choose a password"
            required
          />
          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}