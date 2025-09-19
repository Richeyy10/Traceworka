'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import RequisitionsTable from '@/components/RequisitionsTable';

const DashboardContent = () => {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === 'admin';

    return (
        <div className="container mx-auto p-8 bg-gray-100 min-h-screen">
            <div className="flex justify-between items-center bg-white p-4 shadow-md">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Welcome, {session?.user?.name || 'User'}!</h1>
            <button
                onClick={() => signOut()}
                className="py-2 ml-5 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
                <div>
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">My Requisitions</h2>
                    <p className="text-gray-600">You can view your submitted requisitions by clicking the link below.</p>
                    <Link href="/my-requisitions" className="mt-4 inline-block text-blue-600 hover:underline">
                        Go to My Requisitions
                    </Link>
                </div>
            )}
        </div>
    );
};

export default DashboardContent;