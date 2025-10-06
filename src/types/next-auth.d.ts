// import { DefaultSession } from 'next-auth';

// declare module "next-auth" {
//   interface Session {
//     user: {
//       role: string
//       address: string
//     } & DefaultSession["user"]
//   }

//   interface User {
//     role?: string;
//   }
// }

import { DefaultSession } from "next-auth";

// This declaration file extends NextAuth's default types
// to include our custom fields (role and department)

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
    } & DefaultSession["user"];
  }

  /**
   * The interface for the user object retrieved from the database.
   */
  interface User {
    role: string;
    department: string;
  }
}