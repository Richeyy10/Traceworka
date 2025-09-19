import { NextResponse, NextRequest } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

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

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ message: 'Token is required.' }, { status: 400 });
    }

    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('passwordResetToken', '==', token).limit(1).get();

    if (userSnapshot.empty) {
      return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 400 });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Check if the token has expired
    if (userData.passwordResetExpires && userData.passwordResetExpires < Date.now()) {
      return NextResponse.json({ message: 'Token has expired.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Token is valid.' }, { status: 200 });
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}