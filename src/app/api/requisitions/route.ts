import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
// ASSUMPTION: This absolute path is correctly configured in tsconfig.json
import { options } from '@auth/options'; 
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

interface Requisition {
    id: string;
    itemName: string;
    quantity: number;
    unitCost: number;
    totalCost: number; // Not used in this file but useful for clients
    requesterName: string;
    requesterEmail: string;
    department: string;
    status: string;
    created: FieldValue;
    // ... other fields needed for query results
}

interface PaginatedResponse {
    data: Requisition[];
    meta: {
        currentPage: number;
        limit: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}


// Data received from the client request body (req.json())
interface RequisitionData {
    itemName: string;
    quantity: number;
    unitCost: number;
    requesterName: string;
    requesterEmail: string;
    department: string;
    reason: string;
}

interface NewRequisitionDocument extends RequisitionData {
    status: string;
    created: FieldValue;
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
    
    // 💥 FIX 1: Explicitly pass req and null to resolve session on Vercel
    const session = await getServerSession(req, null, options);

    if (!session || !session.user) {
        return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }
    
    const user = session.user as UserSession;

    try {
        const data = await req.json() as RequisitionData;
        
        if (!data.itemName || !data.quantity || !data.unitCost) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }
        
        const requesterData = {
            requesterName: user.name,
            requesterEmail: user.email,
            department: user.department || 'N/A',
        };
        
        const docData: NewRequisitionDocument = {
            ...data, 
            ...requesterData,
            status: 'Pending Supervisor Review', 
            created: FieldValue.serverTimestamp(), 
        };

        const docRef = await db.collection('requisitions').add(docData);
        
        const supervisorEmail = await getReviewerEmail('supervisor', docData.department);
        
        if (supervisorEmail) {
            await sendNewRequisitionEmail(docData, supervisorEmail);
        } else {
            console.warn(`WARNING: No supervisor found for department ${docData.department}. Skipping notification.`);
        }

        return NextResponse.json({ message: 'Requisition submitted successfully.', id: docRef.id }, { status: 201 });

    } catch (error) {
        console.error('Failed to create requisition:', error);
        return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
    }
}


// --- GET HANDLER (Fetch/Query Requisitions - Used by the client page) ---
export async function GET(req: NextRequest): Promise<NextResponse<PaginatedResponse | { error: string }>> {
    
    // 💥 FIX 2: Explicitly pass req and null to resolve session on Vercel
    const session = await getServerSession(req, null, options);
    
    if (!session || !session.user) {
        // This is the error message the SWR hook is receiving on deployment
        return NextResponse.json({ error: "Authentication required to fetch requisitions." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    
    // Query parameters used by your client component (page.tsx)
    const userRole = session.user.role || searchParams.get('role');
    const userEmail = session.user.email;
    const userDepartment = session.user.department;
    const view = searchParams.get('view'); // 'action', 'my-submissions', or 'all'
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;

    let query: Query = db.collection('requisitions').orderBy('created', 'desc');

    // 1. FILTERING BASED ON USER ROLE AND VIEW
    if (userRole === 'staff' || view === 'my-submissions') {
        // Staff view or Supervisor/Owner's personal submissions
        query = query.where('requesterEmail', '==', userEmail);
    } else if (userRole === 'supervisor' && view === 'action') {
        // Supervisor Action Queue: Pending Supervisor Review in their department
        if (userDepartment) {
            query = query.where('department', '==', userDepartment)
                         .where('status', '==', 'Pending Supervisor Review');
        } else {
            // No department defined for supervisor, should return empty or error
            return NextResponse.json({ data: [], meta: { currentPage: 1, limit: limit, hasNextPage: false, hasPrevPage: false } });
        }
    } else if (userRole === 'owner' && view === 'action') {
        // Owner Action Queue: Approved by Supervisor or Pending Supervisor Review (to handle supervisor absence)
        query = query.where('status', 'in', ['Approved by Supervisor', 'Pending Supervisor Review']);
    } 
    // If userRole is 'owner' and view is 'all', no further query filtering is needed.


    // 2. PAGINATION
    // Fetch one extra document to determine if there is a next page
    const snapshot = await query.limit(limit + 1).offset(offset).get();
    
    const data: Requisition[] = snapshot.docs.slice(0, limit).map(doc => ({
        id: doc.id,
        ...doc.data(),
    } as Requisition));

    const hasNextPage = snapshot.docs.length > limit;
    const hasPrevPage = page > 1;

    const meta = {
        currentPage: page,
        limit: limit,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
    };

    return NextResponse.json({ data, meta });
}
