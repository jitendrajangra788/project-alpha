import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

let refreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
        return throwError(() => err);
      }
      if (refreshing) {
        return throwError(() => err);
      }
      refreshing = true;
      return auth.refresh().pipe(
        switchMap((tokens) => {
          refreshing = false;
          return next(
            req.clone({ setHeaders: { Authorization: `Bearer ${tokens.access_token}` } })
          );
        }),
        catchError((refreshErr) => {
          refreshing = false;
          auth.logout();
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
