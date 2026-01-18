import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth, idToken } from '@angular/fire/auth';
import { switchMap, take, catchError } from 'rxjs/operators';
import { from, of } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(Auth);

    // Zoznam URL adries, ktoré vyžadujú token (všetky naše backend API volania)
    // Ak URL obsahuje '/api/', pridáme token
    if (req.url.includes('/api/')) {
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
            catchError(err => {
                console.error('Auth Interceptor Error:', err);
                return next(req);
            })
        );
    }

    return next(req);
};
