import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, authState, User } from '@angular/fire/auth';
import { from, map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private auth: Auth) {}

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
    return authState(this.auth);
  }

  isAdmin(): Observable<boolean> {
    return authState(this.auth).pipe(
      map(user => {
        if (!user) return false;          // nie je prihlásený
        return user.email === 'adrianmarjak2156165@gmail.com'; // iba tento email je admin
      })
    );
  }
  
}
