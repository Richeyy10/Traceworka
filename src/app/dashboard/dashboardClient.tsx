'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import RequisitionsTable from '@/components/RequisitionsTable';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DashboardClientProps {
  currentUser: User;
}

const DashboardClient = ({ currentUser }: DashboardClientProps) => {
    const isAdmin = currentUser.role === 'admin';

    return (
        <div className="container mx-auto p-4 sm:p-8 bg-gray-100 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-4 shadow-md rounded-lg mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Welcome, {currentUser.name || 'User'}!</h1>
            <button
                onClick={() => signOut()}
                className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
                Sign Out
            </button>
            </div>
            {isAdmin ? (
                <div>
                    <RequisitionsTable />
                    <Link href="/admin" className="mt-4 inline-block text-blue-600 hover:underline">
                        Go to Admin Dashboard
                    </Link>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">My Requisitions</h2>
                    <p className="text-gray-600 mb-6">You can view your submitted requisitions by clicking the link below.</p>
                    <Link href="/my-requisitions" className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        Go to My Requisitions
                    </Link>
                </div>
            )}
        </div>
    );
};

export default DashboardClient;
