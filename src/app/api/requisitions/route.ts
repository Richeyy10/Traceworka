import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../auth/[...nextauth]/options';
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

// Data received from the client request body (req.json())
interface RequisitionData {
    itemName: string;
    quantity: number;
    unitCost: number;
    // NOTE: requesterName, requesterEmail, and department should ideally be pulled 
    // from the session or calculated, but are included here if the client sends them.
    requesterName: string;
    requesterEmail: string;
    department: string;
    
    // Add other fields from your form here
}

// FIX: New interface for the complete document structure added to Firestore.
// It extends the data received from the request and adds server-side fields.
interface NewRequisitionDocument extends RequisitionData {
    status: string;
    created: FieldValue;
    // Initialize audit fields as FieldValue.delete() or undefined if not needed at creation
    supervisorApprovedBy?: string;
    supervisorApprovedEmail?: string;
    supervisorApprovedDate?: FieldValue;
    ownerApprovedBy?: string;
    ownerApprovedEmail?: string;
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

// --- RESEND EMAIL NOTIFICATION FUNCTION (For New Requisition) ---
async function sendNewRequisitionEmail(reqData: RequisitionData, supervisorEmail: string) {
    const SENDER_EMAIL = 'no-reply@yourverifieddomain.com'; 
    const totalCost = (reqData.quantity * reqData.unitCost).toFixed(2);
    const dashboardLink = 'https://your-app-domain.com/my-requisitions?view=action'; 

    const subject = `⭐ NEW REQUISITION: ${reqData.itemName} from ${reqData.requesterName}`;
    const htmlBody = `<p>A new requisition requires your immediate review:</p>
                      <ul>
                          <li>Item: <b>${reqData.itemName}</b></li>
                          <li>Department: <b>${reqData.department}</b></li>
                          <li>Requester: ${reqData.requesterName}</li>
                          <li>Total Cost: #$${totalCost}</li>
                      </ul>
                      <p>Please review it in your Action Queue now.</p>
                      <p>Review Now: <a href="${dashboardLink}">Click Here</a></p>`;

    try {
        const { error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to: [supervisorEmail],
            subject: subject,
            html: htmlBody,
        });

        if (error) {
            console.error('Resend Email Error:', error);
        } else {
            console.log(`New requisition notification sent to supervisor: ${supervisorEmail}.`);
        }
    } catch (err) {
        console.error('Failed to send new requisition email via Resend:', err);
    }
}


// --- POST HANDLER (Create New Requisition) ---
export async function POST(req: NextRequest): Promise<NextResponse<{ message: string; id?: string }>> {
    
    const session = await getServerSession(options);

    if (!session || !session.user) {
        return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }
    
    const user = session.user as UserSession;

    try {
        // Cast the request body to the expected type
        const data = await req.json() as RequisitionData;
        
        // Basic validation
        if (!data.itemName || !data.quantity || !data.unitCost) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }
        
        // Ensure requester details are taken from the session for security/accuracy
        const requesterData = {
            requesterName: user.name,
            requesterEmail: user.email,
            department: user.department || 'N/A', // Use department from session
        };
        
        // FIX: Use NewRequisitionDocument to correctly type the object being added to Firestore
        const docData: NewRequisitionDocument = {
            ...data, 
            ...requesterData, // Override client-provided requester details with session data
            
            // These fields are for Firestore and now included in NewRequisitionDocument:
            status: 'Pending Supervisor Review', 
            created: FieldValue.serverTimestamp(), 
            
            // Initialize other fields if necessary
        };

        const docRef = await db.collection('requisitions').add(docData);
        
        // 4. Send email notification to the Supervisor
        const supervisorEmail = await getReviewerEmail('supervisor', docData.department);
        
        if (supervisorEmail) {
            // Send email to the supervisor
            await sendNewRequisitionEmail(docData, supervisorEmail);
        } else {
            console.warn(`WARNING: No supervisor found for department ${docData.department}. Skipping notification.`);
            // In a real app, you might set the status to 'Needs Routing' here
        }

        return NextResponse.json({ message: 'Requisition submitted successfully.', id: docRef.id }, { status: 201 });

    } catch (error) {
        console.error('Failed to create requisition:', error);
        return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
    }
}
