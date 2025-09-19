import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { options } from '../auth/[...nextauth]/options';
import bcrypt from 'bcryptjs';

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

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(options);

    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'Missing password fields.' }, { status: 400 });
    }

    // Find the user by email
    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('email', '==', session.user.email).limit(1).get();

    if (userSnapshot.empty) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Verify the current password
    const isPasswordCorrect = await bcrypt.compare(currentPassword, userData.password);
    if (!isPasswordCorrect) {
      return NextResponse.json({ message: 'Incorrect current password.' }, { status: 403 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database
    await userDoc.ref.update({ password: hashedPassword });

    return NextResponse.json({ message: 'Password updated successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
