import { DefaultSession } from "next-auth";

// This declaration file extends NextAuth's default types
// to include our custom fields (role, department, and employeeId)

declare module "next-auth" {
  /**
   * The interface for the user object in the session.
   * This ensures TypeScript knows about our custom fields.
   */
  interface Session {
    user: {
      /** The user's custom access role (e.g., 'owner', 'supervisor', 'staff'). */
      role: string;
      /** The user's department or branch. */
      department: string;
      /** The user's employee ID. (FIXED) */
      employeeId: string; // <-- ADDED THIS LINE
    } & DefaultSession["user"];
  }

  /**
   * The interface for the user object retrieved from the database.
   */
  interface User {
    role: string;
    department: string;
    employeeId: string; // <-- ADDED THIS LINE
  }
} 

// CRITICAL: We also need to extend the JWT interface if you are passing the data through the token
declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    department: string;
    employeeId: string; // <-- ADDED THIS LINE
  }
}
