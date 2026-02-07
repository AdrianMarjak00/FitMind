import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './payment-success.html',
  styleUrls: ['./payment-success.scss']
})
export class PaymentSuccessComponent implements OnInit {
  sessionId: string | null = null;
  loading = true;
  verified = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.sessionId = params['session_id'];
      if (this.sessionId) {
        this.verifySession(this.sessionId);
      } else {
        this.loading = false;
      }
    });
  }

  verifySession(sessionId: string) {
    this.http.post(`${environment.apiUrl}/payment/verify-session`, { session_id: sessionId })
      .subscribe({
        next: (res: any) => {
          console.log('Payment verified:', res);
          this.verified = true;
          this.loading = false;
        },
        error: (err) => {
          console.error('Verification failed', err);
          this.loading = false;
        }
      });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToTraining(): void {
    this.router.navigate(['/training']);
  }
}
