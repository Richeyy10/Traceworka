import { NextResponse, NextRequest } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import bcrypt from 'bcryptjs';

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
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ message: 'Token and new password are required.' }, { status: 400 });
    }

    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('passwordResetToken', '==', token).limit(1).get();

    if (userSnapshot.empty) {
      return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 400 });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    if (userData.passwordResetExpires < Date.now()) {
      // Remove the expired token and send an error
      await userDoc.ref.update({
        passwordResetToken: FieldValue.delete(),
        passwordResetExpires: FieldValue.delete(),
      });
      return NextResponse.json({ message: 'Token has expired.' }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password and clear the reset token fields
    await userDoc.ref.update({
      password: hashedPassword,
      passwordResetToken: FieldValue.delete(),
      passwordResetExpires: FieldValue.delete(),
    });

    return NextResponse.json({ message: 'Password reset successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Error in password reset:', error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}