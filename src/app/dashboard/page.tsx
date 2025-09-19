import { getServerSession } from 'next-auth';
import { signOut } from 'next-auth/react';
import { options } from '../api/auth/[...nextauth]/options';
import { redirect } from 'next/navigation';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import DashboardClient from './dashboardClient';

// Initialize Firebase Admin SDK if it hasn't been already
if (!getApps().length) {
  const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  initializeApp({
    credential: cert(serviceAccountKey),
  });
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

  // Fetch the user's role from the Firestore database
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

  // Render the dashboard based on the user's role
  return (
    <div>
      <h1 className="text-3xl font-bold p-8">Dashboard</h1>
      {currentUser?.role === 'admin' ? (
        <DashboardClient currentUser={currentUser} />
      ) : (
        <p className="p-8">Access Denied. You must be an administrator to view this page.</p>
      )}
    </div>
  );
}