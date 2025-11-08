import { inject, Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { from, map, Observable } from "rxjs";


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private authFire: AngularFireAuth
  ) { }

  register(email: string, password: string): Observable<any> {
    return from(this.authFire.createUserWithEmailAndPassword(email, password)).pipe(
    );
  }

  login(email: string, password: string): Observable<any> {
    return from(this.authFire.signInWithEmailAndPassword(email, password)).pipe(
    );
  }

  logout(): Observable<void> {
    return from(this.authFire.signOut()).pipe(
    );
  }

  getCurrentUser(): Observable<firebase.default.User | null> {
    return this.authFire.authState;
  }

  isAuthenticated(): Observable<boolean> {
    return this.authFire.authState.pipe(
      map(user => !!user)
    );
  }
}