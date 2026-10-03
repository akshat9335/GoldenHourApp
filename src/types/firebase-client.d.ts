declare module 'firebase/app' {
  export interface FirebaseApp {
    name: string;
    options: Record<string, any>;
    [key: string]: any;
  }
  export function initializeApp(config: any): FirebaseApp;
  export function getApps(): FirebaseApp[];
}

declare module 'firebase/auth' {
  export interface Auth {
    [key: string]: any;
  }
  export function getAuth(app?: any): Auth;
}

declare module 'firebase/firestore' {
  export type Unsubscribe = () => void;
  export interface Firestore {
    [key: string]: any;
  }
  export function getFirestore(app?: any): Firestore;
  export function collection(db: any, ...pathSegments: string[]): any;
  export function doc(db: any, ...pathSegments: string[]): any;
  export function getDoc(docRef: any): Promise<any>;
  export function setDoc(docRef: any, data: any, options?: any): Promise<any>;
  export function updateDoc(docRef: any, data: any): Promise<any>;
  export function deleteDoc(docRef: any): Promise<any>;
  export function addDoc(colRef: any, data: any): Promise<any>;
  export function query(colRef: any, ...queryConstraints: any[]): any;
  export function where(fieldPath: string, opStr: string, value: any): any;
  export function orderBy(fieldPath: string, directionStr?: string): any;
  export function onSnapshot(
    ref: any,
    onNext: (snapshot: any) => void,
    onError?: (error: any) => void
  ): () => void;
  export function serverTimestamp(): any;
  export function writeBatch(db: any): any;
}
