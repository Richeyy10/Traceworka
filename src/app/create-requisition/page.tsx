'use client';

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import logo from '@/assets/logowithnobkg.png';
import RequisitionForm from "@/components/requisitionform";


export default function CreateRequisition() {
    const { data: session, status } = useSession();
    const userRole = session?.user?.role || 'staff';
    const userDepartment = session?.user?.department || 'default';
    const router = useRouter(); // <-- Initialize router

    const isStaff = userRole === 'staff';
    const isSupervisor = userRole === 'supervisor';
    const isOwner = userRole === 'owner';

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
    const userName = session.user.name ?? 'Unknown Requester';

    // 2. Set the condition: The form should be shown if the user is NOT the 'owner'.
    // Since the owner is redirected above, this condition handles Supervisor and Staff.
    const showForm = userRole !== 'owner';

    const dashboardTitle = isStaff ? "Requisitions Form" : 
    isSupervisor ? `Supervisor Dashboard (${userDepartment})` :
    "Owner Dashboard";
    return (
        <>
            <div className="mx-auto p-4 sm:p-8 bg-gray-100 min-h-screen text-black">
            {/* --- Header (Unchanged) --- */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
                <Image src={logo} alt='Traceworka' width={150} height={150} className='ml-0 sm:ml-[10%]' />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                    {dashboardTitle}
                </h1>
                <div className="flex space-x-4">
                    <Link href="/" className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
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
            <RequisitionForm requesterName={userName} />
          </div>
        </>
    );
}
}