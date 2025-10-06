import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options'; 
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Query } from 'firebase-admin/firestore';
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
    rejectionReason?: string; // Used when sending rejection email
    quantity: number;
    unitCost: number;
}

// Interface to satisfy type checking for updateData
interface RequisitionUpdate {
    // FIX: ESLint disable comment to allow 'any' as it is required for 
    // the Firestore SDK's generic type signature for update().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // Index signature to satisfy Firestore SDK's generic type requirement for update()
    status: string;
    rejectionReason?: string | FieldValue;
    rejectedBy?: string | FieldValue;
    rejectedEmail?: string | FieldValue;
    rejectedDate?: FieldValue;
    canceledBy?: string | FieldValue;
    canceledDate?: FieldValue;
    supervisorApprovedBy?: string | FieldValue;
    supervisorApprovedEmail?: string | FieldValue;
    supervisorApprovedDate?: FieldValue;
    ownerApprovedBy?: string | FieldValue;
    ownerApprovedEmail?: string | FieldValue;
    ownerApprovedDate?: FieldValue;
}


// --- Dynamic Reviewer Email Lookup Function ---
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
async function sendEmailNotification(reqData: RequisitionData, nextStatus: string) {
    const SENDER_EMAIL = 'no-reply@yourverifieddomain.com'; 
    let toEmail = '';
    let subject = '';
    let htmlBody = '';
    
    const totalCost = (reqData.quantity * reqData.unitCost).toFixed(2);
    const itemDetails = `Requisition #${reqData.id} for <b>${reqData.itemName}</b> (Dept: ${reqData.department}, Cost: #$${totalCost})`;
    const dashboardLink = 'https://your-app-domain.com/my-requisitions'; 

    switch (nextStatus) {
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

        case 'Approved by Supervisor':
            const ownerEmail = await getReviewerEmail('owner'); 
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
            const { error } = await resend.emails.send({
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
export async function PATCH(
    req: NextRequest, 
    // ESLint disable comment to allow 'any' as a necessary type workaround
    // for Next.js App Router dynamic route type compatibility issues on Vercel build.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context: any 
): Promise<NextResponse<{ message: string }>> {

    const session = await getServerSession(options);
    // Explicitly cast params to the correct type for use inside the function
    const { id } = context.params as { id: string }; 

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
        
        const currentData = doc.data() as Omit<RequisitionData, 'id' | 'rejectionReason'>; 
        const updateData: RequisitionUpdate = { status }; 
        
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
        } as RequisitionData, status);

        return NextResponse.json({ message: `Requisition status updated to ${status}` });

    } catch (error) {
        console.error('Failed to update requisition:', error);
        return NextResponse.json({ message: 'An unexpected error occurred during update.' }, { status: 500 });
    }
}
