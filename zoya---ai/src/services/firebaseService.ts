import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  getDocFromServer,
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on startup
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Firebase Auth Service Functions
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Failed to sign in with Google", error);
    throw error;
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Failed to sign out", error);
    throw error;
  }
}

// User Profile Functions
export async function getUserProfile(uid: string): Promise<any> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveUserProfile(uid: string, name: string, age: number, email: string) {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, "users", uid);
    await setDoc(docRef, {
      uid,
      name: name.slice(0, 100),
      age: Math.floor(age),
      email: email.slice(0, 200),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserProfile(uid: string, name: string, age: number) {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, {
      name: name.slice(0, 100),
      age: Math.floor(age),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Firestore helper functions
export async function createSession(sessionId: string, title: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be authenticated to create a session");

  const path = `sessions/${sessionId}`;
  try {
    await setDoc(doc(db, "sessions", sessionId), {
      id: sessionId,
      userId: user.uid,
      title: title.slice(0, 100), // Enforce length limits
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function addMessageToSession(
  sessionId: string,
  messageId: string,
  sender: "user" | "zoya",
  text: string,
  sources?: { title: string; uri: string }[]
) {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be authenticated to add messages");

  const path = `sessions/${sessionId}/messages/${messageId}`;
  try {
    await setDoc(doc(db, "sessions", sessionId, "messages", messageId), {
      id: messageId,
      sender,
      text: text.slice(0, 5000), // Enforce limit
      sources: sources || null,
      createdAt: serverTimestamp(),
    });

    // Update the session's updatedAt timestamp and possibly title
    const sessionPath = `sessions/${sessionId}`;
    await updateDoc(doc(db, "sessions", sessionId), {
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getSessionsForUser(): Promise<any[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const path = "sessions";
  try {
    // Note: Since allow list checks resource.data.userId == request.auth.uid,
    // we query or list safely. In our rules, the allow list is enforced.
    const q = query(collection(db, "sessions"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);
    const sessions: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userId === user.uid) {
        sessions.push(data);
      }
    });
    return sessions.sort((a: any, b: any) => {
      const timeA = a.updatedAt && typeof a.updatedAt.toDate === "function" ? a.updatedAt.toDate().getTime() : 0;
      const timeB = b.updatedAt && typeof b.updatedAt.toDate === "function" ? b.updatedAt.toDate().getTime() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToMessages(sessionId: string, callback: (messages: any[]) => void, onError?: (error: any) => void) {
  const path = `sessions/${sessionId}/messages`;
  try {
    const q = query(collection(db, "sessions", sessionId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const messages: any[] = [];
        snapshot.forEach((doc) => {
          messages.push(doc.data());
        });
        callback(messages);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteSession(sessionId: string) {
  const path = `sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, "sessions", sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Notepad functions
export async function createNote(noteId: string, title: string, content: string, category: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be authenticated to create a note");

  const path = `notes/${noteId}`;
  try {
    await setDoc(doc(db, "notes", noteId), {
      id: noteId,
      userId: user.uid,
      title: title.slice(0, 200),
      content: content.slice(0, 100000),
      category: category.slice(0, 50),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateNote(noteId: string, title: string, content: string, category: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be authenticated to update a note");

  const path = `notes/${noteId}`;
  try {
    await updateDoc(doc(db, "notes", noteId), {
      title: title.slice(0, 200),
      content: content.slice(0, 100000),
      category: category.slice(0, 50),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getNotesForUser(): Promise<any[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const path = "notes";
  try {
    const q = query(collection(db, "notes"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);
    const notes: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userId === user.uid) {
        notes.push(data);
      }
    });
    return notes.sort((a: any, b: any) => {
      const timeA = a.updatedAt && typeof a.updatedAt.toDate === "function" ? a.updatedAt.toDate().getTime() : 0;
      const timeB = b.updatedAt && typeof b.updatedAt.toDate === "function" ? b.updatedAt.toDate().getTime() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function deleteNote(noteId: string) {
  const path = `notes/${noteId}`;
  try {
    await deleteDoc(doc(db, "notes", noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

