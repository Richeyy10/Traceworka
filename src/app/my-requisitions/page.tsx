'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import logo from '@/assets/logowithnobkg.png'

// Define the fetcher function for SWR
const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) {
        const error = new Error('An error occurred while fetching the data.');
        throw error;
    }
    return res.json();
});

// Update the interface to match the data fields
interface Requisition {
    id: string;
    itemName: string;
    quantity: number;
    department: string;
    requesterName: string;
    employeeId: string;
    unitCost: number;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Canceled';
    requesterEmail: string;
    created: string;
}

export default function MyRequisitionsPage() {
    const { data: session, status } = useSession();
    const { data, error, isLoading, mutate } = useSWR<Requisition[]>('/api/requisitions', fetcher);

    const handleCancel = async (id: string) => {
        if (window.confirm('Are you sure you want to cancel this requisition?')) {
            try {
                const response = await fetch(`/api/requisitions/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'Canceled' }),
                });

                if (response.ok) {
                    console.log('Requisition canceled successfully.');
                    mutate(); // Re-fetch the data to update the table
                } else {
                    console.error('Failed to cancel requisition:', await response.text());
                }
            } catch (error) {
                console.error('An unexpected error occurred:', error);
            }
        }
    };


    if (status === 'loading' || isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen text-black">
                <p>Loading...</p>
            </div>
        );
    }

    if (status === 'unauthenticated' || error) {
        return (
            <div className="flex justify-center items-center min-h-screen text-black">
                <p>Please log in to view your requisitions.</p>
            </div>
        );
    }

    const myRequisitions = data?.filter(req => req.requesterEmail === session?.user?.email) || [];

    return (
        <div className="mx-auto p-4 sm:p-8 bg-gray-100 min-h-screen text-black">
            <div className="flex flex-row justify-between sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
            <Image src={logo} alt='Traceworka' width={150} height={150} className='ml-[10%]' />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Requisitions</h1>
                <div className="flex space-x-4">
                    <Link href="/" className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        Go Back
                    </Link>
                    <button
                        onClick={() => signOut()}
                        className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow mobile-scroll">
                {myRequisitions.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Item
                                </th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantity
                                </th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Department
                                </th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date Submitted
                                </th>
                                <th scope="col" className="relative px-3 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-black">
                            {myRequisitions.map((req) => (
                                <tr key={req.id}>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">{req.itemName}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm">{req.quantity}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm">{req.department}</td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                req.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm">{new Date(req.created).toLocaleDateString()}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {req.status === 'Pending' && (
                                            <button
                                                onClick={() => handleCancel(req.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-6 text-center text-gray-500">
                        No requisitions found.
                    </div>
                )}
            </div>
        </div>
    );
}