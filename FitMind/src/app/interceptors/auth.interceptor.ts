import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { switchMap, take, catchError, timeout, filter } from 'rxjs/operators';
import { from, of, throwError } from 'rxjs';

/**
 * Interceptor na automatické pridávanie Firebase ID tokenu do Authorization hlavičke.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(Auth);

    // Zoznam verejných endpointov, ktoré nepotrebujú token
    const publicEndpoints = ['/api/status', '/api/health', '/api/admin/check-email', '/api/payment/webhook'];
    const isPublic = publicEndpoints.some(path => req.url.includes(path));

    // Ak ide o volanie na náš backend API a nie je to verejný endpoint
    if (req.url.includes('/api/') && !isPublic) {
        return authState(auth).pipe(
            filter(user => user !== undefined),
            take(1),
            timeout(5000),
            switchMap(currentUser => {
                if (currentUser) {
                    return from(currentUser.getIdToken()).pipe(
                        switchMap(token => {
                            if (!token) {
                                console.warn(`[Interceptor] Token is empty for user: ${currentUser.uid}`);
                                return next(req);
                            }
                            const authReq = req.clone({
                                setHeaders: { Authorization: `Bearer ${token}` }
                            });
                            // Dôležité: Tu nepoužívame catchError vo vnútri switchMap pre ID token,
                            // aby sme nezachytili chyby zo samotného requestu (napr. 401 z backendu).
                            return next(authReq);
                        }),
                        catchError(err => {
                            // Ak je error z Firebase (zlyhalo getIdToken)
                            console.error("[Interceptor] getIdToken failed:", err);
                            return next(req); // Skúsime poslať aspoň bez tokenu
                        })
                    );
                }

                // Ak tu skončíme, pošleme request bez tokenu - uvidíme či sme "logged in"
                console.warn(`[Interceptor] Sending request without token (No user session) for URL: ${req.url}`);
                return next(req);
            }),
            catchError((err) => {
                // Tu zachytávame chyby z authState alebo HttpErrorResponse
                if (err instanceof HttpErrorResponse) {
                    // Ak je to chyba z backendu (napr. 401), pošleme ju ďalej do komponentu
                    return throwError(() => err);
                }
                console.error("[Interceptor] Auth error:", err);
                return next(req);
            })
        );
    }

    return next(req);
};
