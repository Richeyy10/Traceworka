import { NextResponse, NextRequest } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getServerSession } from "next-auth";
import { options } from '../../auth/[...nextauth]/options';
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

// Handles PATCH requests (for updates like status)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(options);
        const userRole = session?.user?.role;
        const userEmail = session?.user?.email;

        if (!userEmail) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const body = await request.json();

        const docRef = db.collection('requisitions').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ message: 'Requisition not found.' }, { status: 404 });
        }
        
        const currentData = doc.data();
        
        // Security Check for Canceled status: only the owner can cancel a pending requisition
        if (body.status === 'Canceled') {
            if (currentData?.requesterEmail !== userEmail) {
                return NextResponse.json({ message: 'Forbidden. You can only cancel your own requisitions.' }, { status: 403 });
            }
            if (currentData?.status !== 'Pending') {
                return NextResponse.json({ message: 'Only pending requisitions can be canceled.' }, { status: 400 });
            }
        }
        
        // Security Check for Approved/Rejected status: only an admin can approve/reject
        if ((body.status === 'Approved' || body.status === 'Rejected') && userRole !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Only admins can approve or reject requisitions.' }, { status: 403 });
        }

        const updatedData = {
            ...body,
            lastUpdated: new Date(),
        };

        await docRef.update(updatedData);

        // --- Email Notification Logic ---
        let emailSubject = '';
        let emailMessage = '';
        
        if (updatedData.status === 'Approved') {
            emailSubject = 'Requisition Approved';
            emailMessage = `Your requisition for ${currentData?.itemName} has been approved.`;
        } else if (updatedData.status === 'Rejected') {
            emailSubject = 'Requisition Rejected';
            emailMessage = `Your requisition for ${currentData?.itemName} has been rejected.`;
        } else if (updatedData.status === 'Canceled') {
            emailSubject = 'Requisition Canceled';
            emailMessage = `Your requisition for ${currentData?.itemName} has been canceled.`;
        }

        if (emailSubject && currentData?.requesterEmail) {
            try {
                await resend.emails.send({
                    from: 'Requisition System <noreply@yourdomain.com>', // Replace with your domain
                    to: currentData.requesterEmail,
                    subject: emailSubject,
                    html: `<p>${emailMessage}</p>`,
                });
            } catch (emailError) {
                console.error('Failed to send email:', emailError);
            }
        }

        return NextResponse.json({ message: 'Requisition updated successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to update requisition:', error);
        return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
    }
}

// Handles DELETE requests
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(options);
        const userRole = session?.user?.role;

        // Only allow admins to delete requisitions
        if (userRole !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. You do not have permission to delete requisitions.' }, { status: 403 });
        }

        const { id } = params;

        if (!id) {
            return NextResponse.json({ message: 'Requisition ID is required.' }, { status: 400 });
        }

        const docRef = db.collection('requisitions').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ message: 'Requisition not found.' }, { status: 404 });
        }

        await docRef.delete();

        return NextResponse.json({ message: 'Requisition deleted successfully.' }, { status: 200 });

    } catch (error) {
        console.error('Failed to delete requisition:', error);
        return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
    }
}
