'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logo from '@/assets/logowithnobkg.png';

export default function HomeDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter(); // <-- Initialize router

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (status === 'authenticated') {
    const userRole = session.user?.role || 'staff';

    // 1. Critical Redirection Logic for Owner
    if (userRole === 'owner') {
      router.push('/dashboard');
      // Render a placeholder while the redirect is happening
      return (
        <div className="flex justify-center items-center min-h-screen">
          <p>Redirecting to Owner Dashboard...</p>
        </div>
      );
    }

    // 2. Set the condition: The form should be shown if the user is NOT the 'owner'.
    // Since the owner is redirected above, this condition handles Supervisor and Staff.
    const showForm = userRole !== 'owner';

    return (
      <>
        <div className="flex flex-col">
          <header className="flex justify-between flex-row sm:flex-row sm:justify-between sm:items-center bg-white p-4 shadow-md space-y-4 sm:space-y-0">
            <Image src={logo} alt='Traceworka' width={150} height={150} className='ml-[10%]' />
            <div className="flex items-center space-x-4">
              {/* {userRole === 'staff' && (
                <Link href="/my-requisitions" className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                  My Requisitions
                </Link>
              )
              } */}

              {/* NEW: Add link to the Review Dashboard for Supervisors */}
              {userRole === 'supervisor' && (
                <Link href="/dashboard" className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                  Review Dashboard
                </Link>
              )}

              <button
                onClick={() => signOut()}
                className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 mr-9"
              >
                Sign Out
              </button>
            </div>
          </header>
        </div>
        <div className="flex flex-col items-center justify-center h-[80vh] bg-gray-50">
          <h1 className="text-3xl text-black font-bold mb-8">Welcome, {session.user.name || 'User'}!</h1>
          <p className="text-lg text-gray-600 mb-10">What would you like to do today?</p>

          <div className="flex space-x-6">

            <Link href="/my-requisitions" passHref>
              <div className="flex flex-col bg-white p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 h-[200px] w-80 cursor-pointer justify-center items-center text-center border-t-4 border-blue-500">
                <h2 className="text-xl text-black font-semibold mb-2">My Requisitions</h2>
              </div>
            </Link>

            <Link href="/create-requisition" passHref>
              <div className="flex flex-col bg-white p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 h-[200px] w-80 cursor-pointer justify-center items-center text-center border-t-4 border-green-500">
                <h2 className="text-xl text-black font-semibold mb-2">Create New Requisition</h2>
              </div>
            </Link>
            {userRole === 'supervisor' && (
              <Link href="/admin" passHref>
              <div className="flex flex-col bg-white p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 w-80 h-[200px] cursor-pointer justify-center items-center text-center border-t-4 border-blue-500">
                <h2 className="text-xl text-black font-semibold mb-2">Create New User</h2>
              </div>
            </Link>
            )}

          </div>
        </div>
      </>
    );
  }
}