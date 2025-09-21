import { NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";

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

export async function GET() {
  try {
    const session = await getServerSession(options);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ message: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Fetch requisitions only for the logged-in user's email
    const requisitionsRef = db.collection('requisitions');
    const snapshot = await requisitionsRef.where('requesterEmail', '==', userEmail).get();

    if (snapshot.empty) {
      return NextResponse.json([], { status: 200 });
    }

    const requisitions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(requisitions, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch requisitions:', error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}