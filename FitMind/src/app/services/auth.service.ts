import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, authState, User } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { from, map, Observable, switchMap, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

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
    return from(signOut(this.auth));
  }

  getCurrentUser(): Observable<User | null> {
    // authState musí byť volaný v injection contexte
    return authState(this.auth);
  }

  isAdmin(): Observable<boolean> {
    return authState(this.auth).pipe(
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
          })
        );
      })
    );
  }
  
}
