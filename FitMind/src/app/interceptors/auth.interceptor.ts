import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth, user } from '@angular/fire/auth';
import { switchMap, take, catchError } from 'rxjs/operators';
import { from, of } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(Auth);

    // List of public endpoints that don't need a token
    const publicEndpoints = ['/api/status', '/api/health', '/api/admin/check-email', '/api/payment/webhook'];
    const isPublic = publicEndpoints.some(path => req.url.includes(path));

    // If it's a backend API call and NOT a public endpoint, try to add token
    if (req.url.includes('/api/') && !isPublic) {
        return user(auth).pipe(
            take(1),
            switchMap(currentUser => {
                if (currentUser) {
                    return from(currentUser.getIdToken()).pipe(
                        switchMap(token => {
                            const authReq = req.clone({
                                setHeaders: {
                                    Authorization: `Bearer ${token}`
                                }
                            });
                            return next(authReq);
                        })
                    );
                }
                // Ak nie je prihlásený, pokračujeme bez tokenu (backend vráti 401)
                return next(req);
            }),
            catchError((err) => {
                console.error("[Interceptor] Error getting token:", err);
                return next(req);
            })
        );
    }

    return next(req);
};
