import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
// Safely load optional JSON config (works even if user deletes the file and uses only .env)
const localConfigs = import.meta.glob<{ default: Record<string, string> }>(
  '../firebase-applet-config.json',
  { eager: true }
);
const rawConfig: Record<string, string> =
  localConfigs['../firebase-applet-config.json']?.default ||
  (localConfigs['../firebase-applet-config.json'] as unknown as Record<string, string>) ||
  {};

// Prioritize environment variables (.env / Vercel / Netlify), fallback to JSON if present
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || rawConfig.measurementId || '',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Determine database: custom named database or standard (default) database
const configuredDbId = import.meta.env.VITE_FIREBASE_DATABASE_ID || rawConfig.firestoreDatabaseId;
const isDefaultDb = !configuredDbId || configuredDbId === '(default)' || (rawConfig.projectId === 'batalha--naval' && configuredDbId.startsWith('ai-studio-'));

export const db = isDefaultDb ? getFirestore(app) : getFirestore(app, configuredDbId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection as required
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Checking connection...');
    }
  }
}
testConnection();

export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: unknown) {
    const errCode = (err as { code?: string })?.code;
    const errMsg = (err as { message?: string })?.message || String(err);
    if (
      errCode === 'auth/unauthorized-domain' ||
      errMsg.includes('validateOrigin') ||
      errMsg.includes('unauthorized domain') ||
      errMsg.includes('unauthorized-domain')
    ) {
      const currentHost = window.location.hostname;
      const customError = new Error(
        `O domínio "${currentHost}" não está na lista de domínios autorizados do Firebase Authentication do projeto "${firebaseConfig.projectId}". Acesse o Firebase Console > Authentication > Settings > Authorized Domains e adicione este domínio.`
      );
      (customError as { code?: string }).code = 'auth/unauthorized-domain';
      throw customError;
    }
    console.error('Google Sign-in failed:', err);
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged };
