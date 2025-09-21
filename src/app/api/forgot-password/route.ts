import { NextResponse, NextRequest } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required.' }, { status: 400 });
    }

    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('email', '==', email).limit(1).get();

    // Do not reveal if the user exists for security reasons
    if (userSnapshot.empty) {
      console.log('User not found. Not sending email.');
      // Return a success message to prevent user enumeration attacks
      return NextResponse.json({ message: 'If an account with that email exists, a password reset link has been sent.' }, { status: 200 });
    }

    const userDoc = userSnapshot.docs[0];
    const userRef = userDoc.ref;
    
    // Generate a secure, temporary token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 3600000; // Token valid for 1 hour

    // Save the token and expiry to the user's document
    await userRef.update({
      passwordResetToken: resetToken,
      passwordResetExpires: tokenExpiry,
    });

    // Send the password reset email
    const resetUrl = `${request.nextUrl.origin}/reset-password?token=${resetToken}`;
    const emailSubject = 'Password Reset Request';
    const emailMessage = `You requested a password reset. Click this link to reset your password: <a href="${resetUrl}">Reset Password</a>. This link is valid for 1 hour.`;

    await resend.emails.send({
      from: 'Requisition System <noreply@yourdomain.com>',
      to: email,
      subject: emailSubject,
      html: emailMessage,
    });

    return NextResponse.json({ message: 'Password reset email sent successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Error in forgot password request:', error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}