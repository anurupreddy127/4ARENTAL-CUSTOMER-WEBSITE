/**
 * User-related type definitions
 */

export interface User {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}