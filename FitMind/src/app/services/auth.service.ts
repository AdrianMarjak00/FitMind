import { Injectable, inject, NgZone } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  authState,
  User,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  sendEmailVerification
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, collection, query, where, getDocs } from '@angular/fire/firestore';
import { from, map, Observable, switchMap, of, EMPTY, defer } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);
  private currentUser$ = authState(this.auth);

  // Providers vytvorené pri inicializácii (v injection context)
  private googleProvider = new GoogleAuthProvider();
  private appleProvider = new OAuthProvider('apple.com');

  constructor() {
    // Konfigurácia Apple provider
    this.appleProvider.addScope('email');
    this.appleProvider.addScope('name');
  }

  register(email: string, password: string): Observable<User> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      map(res => res.user)
    );
  }

  login(email: string, password: string): Observable<User> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      map(res => res.user)
    );
  }

  logout(): Observable<void> {
    return defer(() => this.ngZone.run(() => signOut(this.auth)));
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUser$;
  }

  isAdmin(): Observable<boolean> {
    return this.currentUser$.pipe(
      switchMap(user => {
        if (!user || !user.uid) {
          return of(false);
        }

        // Kontrola v Firestore kolekcii 'admins'
        const adminRef = doc(this.firestore, 'admins', user.uid);
        return from(getDoc(adminRef)).pipe(
          map(adminDoc => {
            if (adminDoc.exists()) {
              const adminData = adminDoc.data();
              return adminData['isAdmin'] === true;
            }
            return false;
          }),
          catchError(() => {
            return of(false);
          })
        );
      })
    );
  }

  // Google Sign-In
  loginWithGoogle(): Observable<User> {
    return defer(() =>
      this.ngZone.run(() => signInWithPopup(this.auth, this.googleProvider))
    ).pipe(map(res => res.user));
  }

  // Apple Sign-In
  loginWithApple(): Observable<User> {
    return defer(() =>
      this.ngZone.run(() => signInWithPopup(this.auth, this.appleProvider))
    ).pipe(map(res => res.user));
  }

  // Odoslanie verifikačného emailu
  sendVerificationEmail(): Observable<void> {
    const user = this.auth.currentUser;
    if (user) {
      return defer(() => this.ngZone.run(() => sendEmailVerification(user)));
    }
    return EMPTY;
  }

  // Kontrola či je email overený
  isEmailVerified(): boolean {
    return this.auth.currentUser?.emailVerified ?? false;
  }

  // Kontrola existencie emailu v Firestore (pre duplicity)
  checkEmailExists(email: string): Observable<boolean> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    return from(getDocs(q)).pipe(
      map(snapshot => !snapshot.empty)
    );
  }

  // Kontrola či používateľ má profil v Firestore
  checkUserHasProfile(uid: string): Observable<boolean> {
    const userRef = doc(this.firestore, 'users', uid);
    return from(getDoc(userRef)).pipe(
      map(docSnap => docSnap.exists())
    );
  }
}
