import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    let profileUnsub = () => {};
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      profileUnsub();
      if (firebaseUser) {
        setUser(firebaseUser);
        // Écoute en temps réel le profil (photoURL mise à jour immédiatement)
        profileUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          setUserProfile(snap.exists() ? snap.data() : null);
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => { unsubscribe(); profileUnsub(); };
  }, []);

  const login  = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = ()                 => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
