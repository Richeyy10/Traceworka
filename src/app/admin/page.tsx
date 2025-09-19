import { getServerSession } from 'next-auth';
import { options } from '../api/auth/[...nextauth]/options';
import { redirect } from 'next/navigation';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import AdminUserForm from '@/components/AdminUserForm';
import Link from 'next/link';

// Initialize Firebase Admin SDK if it hasn't been already
if (!getApps().length) {
  const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  initializeApp({
    credential: cert(serviceAccountKey),
  });
}

const db = getFirestore();

export default async function AdminPage() {
  const session = await getServerSession(options);

  if (!session) {
    redirect('/api/auth/signin');
  }

  // Fetch the user's role from the Firestore database
  let currentUserRole = '';
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', session.user?.email).limit(1).get();

    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      currentUserRole = userData.role;
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
  
  if (currentUserRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
        <div className="text-center">
            <h1 className="text-3xl text-black font-bold mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">You must be an administrator to view this page.</p>
            <Link href="/" className="text-blue-600 hover:underline">
              Go back
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-8 bg-gray-100 min-h-screen">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Create New User</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Dashboard
          </Link>
        </div>
        <AdminUserForm />
      </div>
    </div>
  );
}