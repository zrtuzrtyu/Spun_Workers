import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";

interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "worker";
  status: "active" | "inactive" | "pending";
  earnings: number;
  balance?: number;
  averageRating?: number;
  ratingCount?: number;
  trustTier?: "New" | "Trusted" | "Premium";
  quizCompleted?: boolean;
  level?: number; // 1-5
  onboardingCompleted?: boolean;
  country?: string;
  paymentEmail?: string;
  age?: string;
  gender?: string;
  telegram?: string;
  username?: string;
  isAnonymous?: boolean;
  onboardingStep?: number;
  notificationsEnabled?: boolean;
  skills?: string[];
  languages?: string[];
  identityVerified?: boolean;
  tutorialShown?: boolean;
  createdAt?: any;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  firebaseUser: FirebaseUser | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, firebaseUser: null });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const docRef = doc(db, "users", fbUser.uid);
          unsubDoc = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data() as AppUser;
              
              // Force root admin role if it's not set correctly in Firestore
              if (fbUser.email?.toLowerCase() === "tronicflamess@gmail.com" && userData.role !== "admin") {
                try {
                  await updateDoc(docRef, { role: "admin" });
                  // The next snapshot will have the correct role, but we should still set loading to false just in case
                } catch (err) {
                  console.error("Failed to force admin role:", err);
                  // Set user anyway so they aren't stuck
                  setUser({ ...userData, role: "admin" });
                }
                setLoading(false);
                return;
              }
              
              setUser(userData);
            } else {
              setUser(null);
            }
            setLoading(false);
          }, (error) => {
            console.error("Error fetching user data:", error);
            setUser(null);
            setLoading(false);
          });
        } catch (error) {
          console.error("Error setting up user listener:", error);
          setUser(null);
          setLoading(false);
        }
      } else {
        setUser(null);
        if (unsubDoc) unsubDoc();
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, firebaseUser }}>
      {children}
    </AuthContext.Provider>
  );
};
