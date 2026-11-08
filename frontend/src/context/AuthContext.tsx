"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, signInWithGoogle, signOutUser } from "../lib/firebase";
import { api } from "../lib/api";
import { AirShareUser } from "../lib/types";

interface AuthContextType {
  firebaseUser: User | null;
  airshareUser: AirShareUser | null;
  loading: boolean;
  authError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  airshareUser: null,
  loading: true,
  authError: null,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [airshareUser, setAirshareUser] = useState<AirShareUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const profile = await api.syncUser();
          if (profile?.user) {
            setAirshareUser(profile.user);
          }
        } catch (err) {
          console.warn("Failed to sync user with backend:", err);
        }
      } else {
        setAirshareUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Firebase Sign-In Error:", err);
      if (err?.code === "auth/unauthorized-domain") {
        setAuthError("Unauthorized Domain: Please add 'ashikulislamkhan.github.io' to Firebase Console > Authentication > Settings > Authorized domains.");
      } else if (err?.code === "auth/popup-closed-by-user") {
        setAuthError(null);
      } else {
        setAuthError(err?.message || "Sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await signOutUser();
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, airshareUser, loading, authError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
