import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInAnonymously,
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
        if (firebaseUser.isAnonymous) {
          // Compte démo : profil fictif, pas de document Firestore
          setUserProfile({
            nom: 'Démo', prenom: 'Compte', role: 'dg',
            directionId: 'dg', isDemo: true,
          });
          setLoading(false);
        } else {
          profileUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
            setUserProfile(snap.exists() ? snap.data() : null);
            setLoading(false);
          });
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => { unsubscribe(); profileUnsub(); };
  }, []);

  const login      = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const loginDemo  = ()                => signInAnonymously(auth);
  const logout     = ()                => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
