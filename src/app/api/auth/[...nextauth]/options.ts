import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';
import { getAuth } from 'firebase-admin/auth'; 

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
export const adminAuth = getAuth(); // Exporting adminAuth for potential use in callbacks

export const options: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: {
                    label: "Email:",
                    type: "text",
                    placeholder: "your-email@example.com",
                },
                password: {
                    label: "Password:",
                    type: "password",
                    placeholder: "",
                },
            },
            async authorize(credentials) {
                if (!credentials || !credentials.email || !credentials.password) {
                    console.log("Authorization credentials missing or undefined.");
                    return null;
                }
                
                console.log("Credentials received:", credentials);
                
                try {
                    const userRef = db.collection('users');
                    const snapshot = await userRef.where('email', '==', credentials.email).get();

                    if (snapshot.empty) {
                        return null;
                    }

                    const userDoc = snapshot.docs[0];
                    const userData = userDoc.data();

                    const isMatch = await bcrypt.compare(credentials.password, userData.password);

                    if (!isMatch) {
                        return null;
                    }

                    // 1. CRITICAL FIX: Return employeeId from the authorize function
                    return {
                        id: userDoc.id,
                        email: userData.email,
                        name: userData.name,
                        role: userData.role,
                        department: userData.department,
                        // === NEW LINE ADDED HERE ===
                        employeeId: userData.employeeId || userDoc.id, // Ensure you retrieve this field
                    };
                } catch (error) {
                    console.error("Authorization error:", error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                // 2. CRITICAL FIX: Add employeeId to the JWT token
                token.role = user.role;
                token.department = user.department;
                // === NEW LINE ADDED HERE ===
                token.employeeId = user.employeeId; 
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                // 3. CRITICAL FIX: Add employeeId to the final session object
                session.user.role = token.role as string;
                session.user.department = token.department as string;
                // === NEW LINE ADDED HERE ===
                session.user.employeeId = token.employeeId as string;
            }
            console.log("Session object:", session);
            return session;
        },
    },
    pages: {
        signIn: "/signin",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
