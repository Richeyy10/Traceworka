import { NextResponse, NextRequest } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';

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
    const { name, email, department, branch, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'All fields are required.' }, { status: 400 });
    }

    // Check if a user with this email already exists
    const usersRef = db.collection('users');
    const existingUser = await usersRef.where('email', '==', email).limit(1).get();
    if (!existingUser.empty) {
      return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the new user document
    const newUser = {
      name,
      email,
      department,
      branch,
      password: hashedPassword,
      role: 'staff', // Default role for new sign-ups
    };

    // Save the new user to Firestore
    await usersRef.add(newUser);

    return NextResponse.json({ message: 'User registered successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Registration failed:', error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}