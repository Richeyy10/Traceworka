// import { NextResponse, NextRequest } from 'next/server';
// import { initializeApp, cert, getApps } from 'firebase-admin/app';
// import { getFirestore } from 'firebase-admin/firestore';
// import { getServerSession } from "next-auth";
// import { options } from '../../auth/[...nextauth]/options';
// import { Resend } from 'resend';

// // Initialize Resend
// const resend = new Resend(process.env.RESEND_API_KEY);

// // Initialize Firebase Admin SDK if it hasn't been already
// if (!getApps().length) {
//     try {
//         const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
//         initializeApp({
//             credential: cert(serviceAccountKey),
//         });
//     } catch (error) {
//         console.error("Error initializing Firebase Admin SDK:", error);
//     }
// }

// const db = getFirestore();

// // Helper type for dynamic route context to satisfy the TypeScript compiler
// type Context = {
//     params: Promise<{
//         id: string;
//     }>;
// };

// // Handles PATCH requests (for updates like status)
// export async function PATCH(request: NextRequest, context: Context) {
//     try {
//         const session = await getServerSession(options);
//         const userRole = session?.user?.role;
//         const userEmail = session?.user?.email;

//         if (!userEmail) {
//             return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
//         }

//         const { id } = await context.params;
//         const body = await request.json();

//         const docRef = db.collection('requisitions').doc(id);
//         const doc = await docRef.get();

//         if (!doc.exists) {
//             return NextResponse.json({ message: 'Requisition not found.' }, { status: 404 });
//         }
        
//         const currentData = doc.data();
        
//         // Security Check for Canceled status: only the owner can cancel a pending requisition
//         if (body.status === 'Canceled') {
//             if (currentData?.requesterEmail !== userEmail) {
//                 return NextResponse.json({ message: 'Forbidden. You can only cancel your own requisitions.' }, { status: 403 });
//             }
//             if (currentData?.status !== 'Pending') {
//                 return NextResponse.json({ message: 'Only pending requisitions can be canceled.' }, { status: 400 });
//             }
//         }
        
//         // Security Check for Approved/Rejected status: only an admin can approve/reject
//         if ((body.status === 'Approved' || body.status === 'Rejected') && userRole !== 'admin') {
//             return NextResponse.json({ message: 'Forbidden. Only admins can approve or reject requisitions.' }, { status: 403 });
//         }

//         const updatedData = {
//             ...body,
//             lastUpdated: new Date(),
//         };

//         await docRef.update(updatedData);

//         // --- Email Notification Logic ---
//         let emailSubject = '';
//         let emailMessage = '';
        
//         if (updatedData.status === 'Approved') {
//             emailSubject = 'Requisition Approved';
//             emailMessage = `Your requisition for ${currentData?.itemName} has been approved.`;
//         } else if (updatedData.status === 'Rejected') {
//             emailSubject = 'Requisition Rejected';
//             emailMessage = `Your requisition for ${currentData?.itemName} has been rejected.`;
//         } else if (updatedData.status === 'Canceled') {
//             emailSubject = 'Requisition Canceled';
//             emailMessage = `Your requisition for ${currentData?.itemName} has been canceled.`;
//         }

//         if (emailSubject && currentData?.requesterEmail) {
//             try {
//                 await resend.emails.send({
//                     from: 'Requisition System <noreply@yourdomain.com>', // Replace with your domain
//                     to: currentData.requesterEmail,
//                     subject: emailSubject,
//                     html: `<p>${emailMessage}</p>`,
//                 });
//             } catch (emailError) {
//                 console.error('Failed to send email:', emailError);
//             }
//         }

//         return NextResponse.json({ message: 'Requisition updated successfully' }, { status: 200 });
//     } catch (error) {
//         console.error('Failed to update requisition:', error);
//         return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
//     }
// }

// // Handles DELETE requests
// export async function DELETE(request: NextRequest, context: Context) {
//     try {
//         const session = await getServerSession(options);
//         const userRole = session?.user?.role;

//         // Only allow admins to delete requisitions
//         if (userRole !== 'admin') {
//             return NextResponse.json({ message: 'Forbidden. You do not have permission to delete requisitions.' }, { status: 403 });
//         }

//         const { id } = await context.params;

//         if (!id) {
//             return NextResponse.json({ message: 'Requisition ID is required.' }, { status: 400 });
//         }

//         const docRef = db.collection('requisitions').doc(id);
//         const doc = await docRef.get();

//         if (!doc.exists) {
//             return NextResponse.json({ message: 'Requisition not found.' }, { status: 404 });
//         }

//         await docRef.delete();

//         return NextResponse.json({ message: 'Requisition deleted successfully.' }, { status: 200 });

//     } catch (error) {
//         console.error('Failed to delete requisition:', error);
//         return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
//     }
// }


import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options'; 
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Query } from 'firebase-admin/firestore'; // <-- NEW: Imported Query
import { Resend } from 'resend'; 

// Initialize Firebase Admin SDK
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
const resend = new Resend(process.env.RESEND_API_KEY); 

// Helper interfaces
interface UserSession {
    email: string;
    role: string;
    department?: string;
    name: string;
}

interface RequisitionData {
    id: string;
    itemName: string;
    requesterName: string;
    requesterEmail: string;
    department: string;
    status: string;
    rejectionReason?: string;
    quantity: number; // Added for cost calculation in email
    unitCost: number; // Added for cost calculation in email
}

// --- NEW: Dynamic Reviewer Email Lookup Function ---

/**
 * Queries the 'users' collection to find the email of the required reviewer.
 * @param role The role to find ('supervisor' or 'owner').
 * @param department The department to filter by (required for supervisor).
 * @returns The reviewer's email address or null if not found.
 */
async function getReviewerEmail(role: 'supervisor' | 'owner', department?: string): Promise<string | null> {
    const usersRef = db.collection('users');
    let query: Query = usersRef.where('role', '==', role);
    
    if (role === 'supervisor' && department) {
        query = query.where('department', '==', department);
    } 
    
    const snapshot = await query.limit(1).get();

    if (!snapshot.empty) {
        return snapshot.docs[0].data().email as string;
    }

    return null;
}

// --- RESEND EMAIL NOTIFICATION FUNCTION ---

/**
 * Sends an email notification using the Resend SDK.
 */
async function sendEmailNotification(reqData: RequisitionData, nextStatus: string) {
    // IMPORTANT: Replace with your actual verified domain email
    const SENDER_EMAIL = 'no-reply@yourverifieddomain.com'; 
    
    let toEmail = '';
    let subject = '';
    let htmlBody = '';
    
    const totalCost = (reqData.quantity * reqData.unitCost).toFixed(2);
    const itemDetails = `Requisition #${reqData.id} for <b>${reqData.itemName}</b> (Dept: ${reqData.department}, Cost: #$${totalCost})`;
    const dashboardLink = 'https://your-app-domain.com/my-requisitions'; 

    switch (nextStatus) {
        // --- Staff Notifications (Final Statuses) ---
        case 'Approved':
            toEmail = reqData.requesterEmail;
            subject = `✅ APPROVED: ${reqData.itemName} is Ready for Fulfillment`;
            htmlBody = `<p>Your requisition, ${itemDetails}, has been fully approved by the Owner.</p>
                        <p>It is now marked as final and ready for procurement.</p>
                        <p>View Details: <a href="${dashboardLink}">Click Here</a></p>`;
            break;
            
        case 'Rejected by Owner':
        case 'Rejected by Supervisor':
            toEmail = reqData.requesterEmail;
            subject = `❌ REJECTED: Your Requisition for ${reqData.itemName}`;
            htmlBody = `<p>Your requisition, ${itemDetails}, was **rejected** by the ${nextStatus.split(' ')[2]}.</p>
                        <p style="color: red; font-weight: bold;">Reason: ${reqData.rejectionReason || 'No reason provided.'}</p>
                        <p>View Details: <a href="${dashboardLink}">Click Here</a></p>`;
            break;

        // --- Owner Notifications (Ready for Final Review) ---
        case 'Approved by Supervisor':
            const ownerEmail = await getReviewerEmail('owner'); // Lookup Owner Email
            if (!ownerEmail) {
                console.warn('WARNING: Owner email not found. Skipping notification.');
                return;
            }
            toEmail = ownerEmail;
            subject = `⭐ FINAL APPROVAL NEEDED: ${reqData.itemName}`;
            htmlBody = `<p>The requisition, ${itemDetails}, has passed the Supervisor review and requires your final approval.</p>
                        <p>Please review it in your Action Queue now.</p>
                        <p>Review Now: <a href="${dashboardLink}?view=action">Click Here</a></p>`;
            break;
            
        default:
            return; 
    }

    if (toEmail) {
        try {
            const { data, error } = await resend.emails.send({
                from: SENDER_EMAIL,
                to: [toEmail],
                subject: subject,
                html: htmlBody,
            });

            if (error) {
                console.error('Resend Email Error:', error);
            } else {
                console.log(`Notification email sent to ${toEmail} for status ${nextStatus}.`);
            }
        } catch (err) {
            console.error('Failed to send email via Resend:', err);
        }
    }
}

// --- PATCH HANDLER (Updating Status) ---
export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
    const session = await getServerSession(options);
    const { id } = context.params;

    if (!session || !session.user) {
        return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }
    
    const user = session.user as UserSession;
    const { status, rejectionReason } = await req.json();

    if (!status) {
        return NextResponse.json({ message: 'Missing status in request body.' }, { status: 400 });
    }

    const now = FieldValue.serverTimestamp();

    try {
        const docRef = db.collection('requisitions').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ message: 'Requisition not found.' }, { status: 404 });
        }
        
        // Ensure we grab the existing data for email use
        const currentData = doc.data() as RequisitionData; 
        let updateData: any = { status };
        
        // --- Auditing and data clearing logic ---
        if (status.includes('Approved')) {
            updateData.rejectionReason = FieldValue.delete();
            updateData.rejectedBy = FieldValue.delete();
            updateData.rejectedEmail = FieldValue.delete();
            updateData.rejectedDate = FieldValue.delete(); 
            updateData.canceledBy = FieldValue.delete();
            updateData.canceledDate = FieldValue.delete();

            if (user.role === 'supervisor') {
                updateData.supervisorApprovedBy = user.name;
                updateData.supervisorApprovedEmail = user.email;
                updateData.supervisorApprovedDate = now;
            } else if (user.role === 'owner') {
                updateData.ownerApprovedBy = user.name;
                updateData.ownerApprovedEmail = user.email;
                updateData.ownerApprovedDate = now;
            }
        } else if (status.includes('Rejected')) {
            if (!rejectionReason) {
                return NextResponse.json({ message: 'Rejection reason is required.' }, { status: 400 });
            }

            updateData.rejectionReason = rejectionReason;
            updateData.rejectedBy = user.name;
            updateData.rejectedEmail = user.email;
            updateData.rejectedDate = now;
            
            updateData.supervisorApprovedBy = FieldValue.delete();
            updateData.supervisorApprovedEmail = FieldValue.delete();
            updateData.supervisorApprovedDate = FieldValue.delete();
            updateData.ownerApprovedBy = FieldValue.delete();
            updateData.ownerApprovedEmail = FieldValue.delete();
            updateData.ownerApprovedDate = FieldValue.delete();
            updateData.canceledBy = FieldValue.delete();
            updateData.canceledDate = FieldValue.delete();
        } else if (status === 'Canceled') {
            updateData.canceledBy = user.name;
            updateData.canceledDate = now; 
            
            updateData.rejectionReason = FieldValue.delete();
            updateData.rejectedBy = FieldValue.delete();
            updateData.rejectedEmail = FieldValue.delete();
            updateData.rejectedDate = FieldValue.delete();
            updateData.supervisorApprovedBy = FieldValue.delete();
            updateData.supervisorApprovedEmail = FieldValue.delete();
            updateData.supervisorApprovedDate = FieldValue.delete();
            updateData.ownerApprovedBy = FieldValue.delete();
            updateData.ownerApprovedEmail = FieldValue.delete();
            updateData.ownerApprovedDate = FieldValue.delete();
        }
        // --- End of Auditing Logic ---
        
        // 2. Perform the update
        await docRef.update(updateData);
        
        // 3. Send Notification AFTER successful update
        await sendEmailNotification({ 
            ...currentData, 
            id: doc.id, 
            rejectionReason: rejectionReason 
        }, status);

        return NextResponse.json({ message: `Requisition status updated to ${status}` });

    } catch (error) {
        console.error('Failed to update requisition:', error);
        return NextResponse.json({ message: 'An unexpected error occurred during update.' }, { status: 500 });
    }
}