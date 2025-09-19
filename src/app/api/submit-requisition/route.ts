import { NextResponse, NextRequest } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getServerSession } from "next-auth";
import { options } from "../auth/[...nextauth]/options";
import { revalidatePath } from 'next/cache';

// Initialize Firebase Admin SDK if it hasn't been already
if (!getApps().length) {
  const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  initializeApp({
    credential: cert(serviceAccountKey),
  });
}

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(options);
    
    // Check if the user is authenticated and has an email
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const formData = await request.json();
    
    // Combine form data with user session data
    const newRequisition = {
      ...formData,
      status: 'Pending',
      requesterName: session.user.name,
      email: session.user.email,
    };

    // Add a new document to the 'requisitions' collection
    const docRef = await db.collection('requisitions').add(newRequisition);

    // Revalidate the dashboard page to show the new data
    revalidatePath('/dashboard');

    console.log('Form data saved with ID:', docRef.id);
    return NextResponse.json({ message: 'Form submitted successfully!' }, { status: 200 });

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return NextResponse.json({ message: 'Failed to process request.' }, { status: 500 });
  }
}