import { Injectable, inject, NgZone, Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

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
  sendEmailVerification,
  sendPasswordResetEmail
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, collection, query, where, getDocs } from '@angular/fire/firestore';
import { from, map, Observable, switchMap, of, EMPTY, defer } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);
  private http = inject(HttpClient);
  private injector = inject(Injector);
  private currentUser$ = authState(this.auth);

  private googleProvider = new GoogleAuthProvider();
  private appleProvider = new OAuthProvider('apple.com');

  constructor() {
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

  sendPasswordResetEmail(email: string): Observable<void> {
    return defer(() => 
      this.ngZone.run(() => sendPasswordResetEmail(this.auth, email))
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

        return runInInjectionContext(this.injector, () => {
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
        });
      })
    );
  }

  loginWithGoogle(): Observable<User> {
    return defer(() =>
      this.ngZone.run(() => signInWithPopup(this.auth, this.googleProvider))
    ).pipe(map(res => res.user));
  }

  loginWithApple(): Observable<User> {
    return defer(() =>
      this.ngZone.run(() => signInWithPopup(this.auth, this.appleProvider))
    ).pipe(map(res => res.user));
  }

  sendVerificationEmail(userToVerify?: User): Observable<void> {
    const user = userToVerify || this.auth.currentUser;
    if (user) {
      return defer(() => this.ngZone.run(() => sendEmailVerification(user)));
    }
    return EMPTY;
  }

  isEmailVerified(): boolean {
    return this.auth.currentUser?.emailVerified ?? false;
  }

  checkEmailExists(email: string): Observable<boolean> {
    return runInInjectionContext(this.injector, () => {
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      return from(getDocs(q)).pipe(
        map(snapshot => !snapshot.empty)
      );
    });
  }

  sendWelcomeEmail(email: string, firstName: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/email/welcome`, { email, first_name: firstName });
  }

  checkUserHasProfile(uid: string): Observable<boolean> {
    return runInInjectionContext(this.injector, () => {
      const userRef = doc(this.firestore, 'users', uid);
      return from(getDoc(userRef)).pipe(
        map(docSnap => docSnap.exists())
      );
    });
  }
}