import { NextResponse, NextRequest } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getServerSession } from "next-auth";
import { options } from '../auth/[...nextauth]/options';
import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

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

// Handles GET requests
export async function GET() {
  try {
    const session = await getServerSession(options);
    const userEmail = session?.user?.email;
    const userRole = session?.user?.role;

    if (!userEmail) {
      return NextResponse.json({ message: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const requisitionsRef = db.collection('requisitions');
    let query;

    if (userRole === 'admin') {
      // Admin sees all requisitions
      query = requisitionsRef.orderBy('created', 'desc');
    } else {
      // Standard user sees only their own requisitions
      query = requisitionsRef.where('requesterEmail', '==', userEmail).orderBy('created', 'desc');
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return NextResponse.json([], { status: 200 });
    }

    const requisitions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created: data.created ? data.created.toDate().toISOString() : null,
        lastUpdated: data.lastUpdated ? data.lastUpdated.toDate().toISOString() : null,
      };
    });

    return NextResponse.json(requisitions, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch requisitions:', error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// Handles POST requests
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(options);
        
        if (!session?.user?.email) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();
        const { itemName, quantity, department, reason, unitCost, requesterName, employeeId } = data;

        // Create a new requisition document in Firestore
        const newRequisition = {
            itemName,
            quantity: Number(quantity),
            department,
            reason,
            unitCost: Number(unitCost),
            requesterName,
            employeeId,
            requesterEmail: session.user.email,
            status: 'Pending',
            created: FieldValue.serverTimestamp(),
            lastUpdated: FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection('requisitions').add(newRequisition);

        // --- New Email Notification for Admin ---
        const adminEmail = 'admin@yourcompany.com'; // <-- **Replace with your admin's email**
        const emailSubject = 'New Requisition Submitted';
        const emailMessage = `A new requisition for ${itemName} has been submitted by ${requesterName}. Please log in to the dashboard to review it.`;

        try {
            await resend.emails.send({
                from: 'Requisition System <noreply@yourdomain.com>', // Replace with your domain
                to: adminEmail,
                subject: emailSubject,
                html: `<p>${emailMessage}</p>`,
            });
            console.log('Admin notification email sent successfully.');
        } catch (emailError) {
            console.error('Failed to send admin email notification:', emailError);
        }

        return NextResponse.json({ id: docRef.id, message: 'Requisition submitted successfully' }, { status: 201 });
    } catch (error) {
        console.error('Failed to submit requisition:', error);
        return NextResponse.json({ message: 'Failed to submit requisition' }, { status: 500 });
    }
}