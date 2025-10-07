import { getServerSession } from 'next-auth';
// Import the options file using a static path alias for reliability
import { options } from './[...nextauth]/options'; 
// NOTE: If the '@auth/options' alias is still failing on deployment, 
// you can try using a simple relative path here: 
// import { options } from './[...nextauth]/options'; 

// Use the standard App Router call which is type-safe
export async function auth() {
    return getServerSession(options);
}
