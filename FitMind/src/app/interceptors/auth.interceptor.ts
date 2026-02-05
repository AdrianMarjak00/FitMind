import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth, idToken } from '@angular/fire/auth';
import { switchMap, take, catchError } from 'rxjs/operators';
import { from, of } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(Auth);

    // List of public endpoints that don't need a token
    const publicEndpoints = ['/api/status', '/api/health', '/api/admin/check-email'];
    const isPublic = publicEndpoints.some(path => req.url.includes(path));

    // If it's a backend API call and NOT a public endpoint, try to add token
    if (req.url.includes('/api/') && !isPublic) {
        return idToken(auth).pipe(
            take(1),
            switchMap(token => {
                if (token) {
                    const authReq = req.clone({
                        setHeaders: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    return next(authReq);
                }
                return next(req);
            }),
            catchError(() => {
                return next(req);
            })
        );
    }

    return next(req);
};
