// 'use client';

// import { useSession, signOut } from 'next-auth/react';
// import RequisitionForm from '@/components/requisitionform';
// import Link from 'next/link';
// import Image from 'next/image';
// import logo from '@/assets/logowithnobkg.png'

// export default function Home() {
//   const { data: session, status } = useSession();

//   if (status === 'loading') {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <p>Loading...</p>
//       </div>
//     );
//   }

//   // This page is now ONLY for authenticated users.
//   if (status === 'authenticated') {
//     return (
//       <div className="flex flex-col min-h-screen">
//         <header className="flex justify-between flex-row sm:flex-row sm:justify-between sm:items-center bg-white p-4 shadow-md space-y-4 sm:space-y-0">
//           <Image src={logo} alt='Traceworka' width={150} height={150} className='ml-[10%]' />
//           <div className="flex items-center space-x-4">
//             <Link href="/my-requisitions" className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
//               My Requisitions
//             </Link>
//             <button
//               onClick={() => signOut()}
//               className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
//             >
//               Sign Out
//             </button>
//           </div>
//         </header>
//         <main className="flex-1">
//           <RequisitionForm requesterName={session.user?.name || ''} />
//         </main>
//       </div>
//     );
//   }
// }


// 'use client';

// import { useSession, signOut } from 'next-auth/react';
// import RequisitionForm from '@/components/requisitionform';
// import Link from 'next/link';
// import Image from 'next/image';
// import logo from '@/assets/logowithnobkg.png'

// export default function Home() {
//   const { data: session, status } = useSession();

//   if (status === 'loading') {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <p>Loading...</p>
//       </div>
//     );
//   }

//   // This page is now ONLY for authenticated users.
//   if (status === 'authenticated') {
//     // 1. Get the user's role from the session. Default to 'staff' if not found.
//     const userRole = session.user?.role || 'staff'; 
    
//     // 2. Set the condition: The form should be shown if the user is NOT the 'owner'.
//     const showForm = userRole !== 'owner';

//     return (
//       <div className="flex flex-col min-h-screen">
//         <header className="flex justify-between flex-row sm:flex-row sm:justify-between sm:items-center bg-white p-4 shadow-md space-y-4 sm:space-y-0">
//           <Image src={logo} alt='Traceworka' width={150} height={150} className='ml-[10%]' />
//           <div className="flex items-center space-x-4">
//             <Link href="/my-requisitions" className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
//               My Requisitions
//             </Link>
//             <button
//               onClick={() => signOut()}
//               className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
//             >
//               Sign Out
//             </button>
//           </div>
//         </header>
//         <main className="flex-1">
//           {/* 3. Conditional Rendering: The form only appears if showForm is true */}
//           {showForm && (
//             <RequisitionForm requesterName={session.user?.name || ''} />
//           )}
//         </main>
//       </div>
//     );
//   }
// }


'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // <-- NEW: Import useRouter for redirection
import RequisitionForm from '@/components/requisitionform';
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/assets/logowithnobkg.png';

export default function Home() {
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
      <div className="flex flex-col min-h-screen">
        <header className="flex justify-between flex-row sm:flex-row sm:justify-between sm:items-center bg-white p-4 shadow-md space-y-4 sm:space-y-0">
          <Image src={logo} alt='Traceworka' width={150} height={150} className='ml-[10%]' />
          <div className="flex items-center space-x-4">
            {userRole === 'staff' && (
              <Link href="/my-requisitions" className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              My Requisitions
            </Link>
            )
            }
            
            {/* NEW: Add link to the Review Dashboard for Supervisors */}
            {userRole === 'supervisor' && (
                <Link href="/dashboard" className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                    Review Dashboard
                </Link>
            )}

            <button
              onClick={() => signOut()}
              className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </header>
        <main className="p-8 bg-gray-50">
          <div className="items-center">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Submit New Requisition</h1>
            {/* 3. Conditional Rendering: The form only appears if showForm is true */}
            {showForm && (
              <RequisitionForm requesterName={session.user?.name || ''} />
            )}
          </div>
        </main>
      </div>
    );
  }
}