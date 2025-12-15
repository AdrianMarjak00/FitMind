import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../app/services/auth.service';
import { take, tap } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.auth.isAdmin().pipe(
      take(1),
      tap((isAdmin) => {
        if (!isAdmin) {
          Swal.fire({
            icon: 'warning',
            title: 'Oops...',
            text: 'You are not admin.!',
          });
          this.router.navigate(['/']);
        }
      })
    );
  }
}