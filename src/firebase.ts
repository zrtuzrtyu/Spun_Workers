import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { toast } from "sonner";

import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function extractErrorMessage(error: any): string {
  if (!error) return "An unknown error occurred.";
  const msg = error.message || String(error);
  
  if (error.code) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return "Invalid email or password. Please try again.";
      case 'auth/email-already-in-use':
        return "This email is already in use by another account.";
      case 'auth/weak-password':
        return "Your password is too weak. Please use at least 6 characters.";
      case 'auth/network-request-failed':
        return "Network error. Please check your internet connection.";
      case 'auth/too-many-requests':
        return "Too many failed attempts. Please try again later.";
      case 'permission-denied':
        return "You don't have permission to perform this action.";
    }
  }

  // Fallback for raw Firebase Error strings
  if (msg.includes('auth/invalid-credential')) return "Invalid email or password. Please try again.";
  if (msg.includes('auth/email-already-in-use')) return "This email is already in use by another account.";
  if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) return "You don't have permission to perform this action.";
  if (msg.includes('offline') || msg.includes('Failed to fetch')) return "Network error. Please check your internet connection.";
  
  return msg;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, preventToast: boolean = false) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', errInfo);
  
  if (!preventToast) {
    toast.error(extractErrorMessage(error));
  }
  
  // We don't throw here to prevent unhandled promise rejections crashing certain user flows.
  // The caller can check their try/catch logic properly.
}
