import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, authState, User } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { from, map, Observable, switchMap, of } from 'rxjs';

interface UserProfile {
  weight: number | null;
  goal: string;
  frequency: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  register(email: string, password: string): Observable<User> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      map(res => res.user)
    );
  }

  // New method to save additional user data to Firestore
  saveUserProfileData(uid: string, profileData: UserProfile): Observable<void> {
    const userDocRef = doc(this.firestore, 'users', uid);
    return from(setDoc(userDocRef, profileData));
  }

  login(email: string, password: string): Observable<User> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      map(res => res.user)
    );
  }

  logout(): Observable<void> {
    return from(signOut(this.auth));
  }

  getCurrentUser(): Observable<User | null> {
    return authState(this.auth);
  }

  isAdmin(): Observable<boolean> {
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user || !user.uid) {
          return of(false);
        }
        
        const adminRef = doc(this.firestore, 'admins', user.uid);
        return from(getDoc(adminRef)).pipe(
          map(adminDoc => {
            if (adminDoc.exists()) {
              const adminData = adminDoc.data();
              return adminData['isAdmin'] === true;
            }
            return false;
          })
        );
      })
    );
  }
}