import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

const config = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

function getSecondaryAuth() {
  const existing = getApps().find(a => a.name === 'admin-create');
  const app = existing ?? initializeApp(config, 'admin-create');
  return getAuth(app);
}

export async function adminCreateUser(email, password) {
  const auth = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await signOut(auth);
  return cred.user.uid;
}
