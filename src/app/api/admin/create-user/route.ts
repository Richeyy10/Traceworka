import { NextResponse, NextRequest } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";

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
    
    // Check if the user is authenticated and is an admin
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ message: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const userRef = db.collection('users');
    const userSnapshot = await userRef.where('email', '==', userEmail).limit(1).get();
    const userData = userSnapshot.docs[0]?.data();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden. Must be an admin.' }, { status: 403 });
    }

    const { name, email, password, role } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: 'All fields are required.' }, { status: 400 });
    }

    // Check if a user with this email already exists
    const existingUser = await userRef.where('email', '==', email).limit(1).get();
    if (!existingUser.empty) {
      return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 });
    }

    // Hash the password securely
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = {
      name,
      email,
      password: hashedPassword,
      role,
    };

    // Save the new user to Firestore
    await userRef.add(newUser);

    return NextResponse.json({ message: 'User created successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}