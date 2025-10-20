import { getServerSession } from 'next-auth';
import { options } from '../api/auth/[...nextauth]/options';
import { redirect } from 'next/navigation';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import DashboardClient from './dashboardClient';
import Image from 'next/image';
import logo from '@/assets/logowithnobkg.png'

// Initialize Firebase Admin SDK if it hasn't been already
if (!getApps().length) {
  try {
    const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
    initializeApp({
      credential: cert(serviceAccountKey),
    });
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
  }
}

const db = getFirestore();

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default async function DashboardPage() {
  const session = await getServerSession(options);

  if (!session) {
    redirect('/api/auth/signin');
  }

  let currentUser: User | null = null;
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', session.user?.email).limit(1).get();

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      currentUser = {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      };
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  const userRole = currentUser?.role;
  const allowedReviewRoles = ['supervisor', 'owner']; 

  // --- NEW LOGIC: Redirect Reviewers to the functional page ---
  if (userRole && allowedReviewRoles.includes(userRole)) {
      // Owner/Supervisor should use the page that handles the filtered lists.
      redirect('/my-requisitions');
  }
  // --- END NEW LOGIC ---

  // If the user falls through here, they are either staff, or their role is missing.
  // We will deny access as staff should be at the root page ('/').
  
  return (
    <>
      <div className="flex flex-row justify-between sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <Image src={logo} alt='Traceworka' width={150} height={150} className='ml-[10%]' />
        <h1 className="text-3xl font-bold mr-[10%]">Dashboard</h1>
      </div>
      <div>
        {userRole && allowedReviewRoles.includes(userRole) && currentUser ? (
          // This path is now unreachable due to the redirect above, serving as a clean fallback
          <DashboardClient currentUser={currentUser} />
        ) : (
          // Deny access for staff or unknown roles who shouldn't be here
          <p className="p-8">Access Denied. Please use the submission page (/).</p>
        )}
      </div>
    </>
  );
}
