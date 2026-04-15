import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BackendStatusService {
  private backendUrl = environment.apiUrl;
  constructor(private http: HttpClient) { }

  checkBackendStatus(): Observable<boolean> {
    return this.http.get<any>(`${this.backendUrl}/ping`, {
      observe: 'response',
      responseType: 'json' as 'json'
    }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  isBackendRunning(): Promise<boolean> {
    return this.checkBackendStatus().toPromise().then(status => status === true).catch(() => false);
  }
}






