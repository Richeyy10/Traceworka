import { NextResponse, NextRequest } from 'next/server';
// ⚠️ FIX: Import the new type-safe session utility instead of options/getServerSession directly
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

// Helper interfaces (for brevity, keeping only essential ones)
interface UserSession {
    email: string;
    role: string;
    department?: string;
    name: string;
}

interface Requisition {
    id: string;
    // ... all requisition properties
    requesterEmail: string;
    department: string;
    status: string;
    created: FieldValue;
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
    // ... other audit fields
}

// --- Dynamic Reviewer Email Lookup Function ---
async function getReviewerEmail(role: 'supervisor' | 'owner', department?: string): Promise<string | null> {
    const usersRef = db.collection('users');
    let query: Query = usersRef.where('role', '==', role);
    
    if (role === 'supervisor' && department) {
        query = query.where('department', '==', department);
    } 
    
    const snapshot = await query.limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0].data().email as string;
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
                        <p>Review Now: <a href="${dashboardLink}">Click Here</a></p>`;

    try {
        await resend.emails.send({
            from: SENDER_EMAIL,
            to: [supervisorEmail],
            subject: subject,
            html: htmlBody,
        });
    } catch (err) {
        console.error('Failed to send new requisition email via Resend:', err);
    }
}


// --- POST HANDLER (Create New Requisition) ---
export async function POST(req: NextRequest): Promise<NextResponse<{ message: string; id?: string }>> {
    
    // 💥 FIX 1: Use the type-safe utility function
    const session = await auth();

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
    
    // 💥 FIX 2: Use the type-safe utility function
    const session = await auth();
    
    if (!session || !session.user) {
        return NextResponse.json({ error: "Authentication required to fetch requisitions." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    
    const userRole = session.user.role || searchParams.get('role');
    const userEmail = session.user.email;
    const userDepartment = session.user.department;
    const view = searchParams.get('view'); 
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;

    let query: Query = db.collection('requisitions').orderBy('created', 'desc');

    // 1. FILTERING BASED ON USER ROLE AND VIEW
    if (userRole === 'staff' || view === 'my-submissions') {
        query = query.where('requesterEmail', '==', userEmail);
    } else if (userRole === 'supervisor' && view === 'action' && userDepartment) {
        query = query.where('department', '==', userDepartment)
                     .where('status', '==', 'Pending Supervisor Review');
    } else if (userRole === 'owner' && view === 'action') {
        query = query.where('status', 'in', ['Approved by Supervisor', 'Pending Supervisor Review']);
    } else if (userRole === 'supervisor' && view === 'action' && !userDepartment) {
        // Supervisor with no department defined
        return NextResponse.json({ data: [], meta: { currentPage: 1, limit: limit, hasNextPage: false, hasPrevPage: false } });
    }
    // 'owner' with 'all' view has no filter

    // 2. PAGINATION
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
