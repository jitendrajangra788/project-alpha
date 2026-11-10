import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { formatApiError } from './api-error';

/** Attach a stable `userMessage` without losing the original response body. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const userMessage = formatApiError(err, err.message || 'Request failed');
        Object.assign(err, { userMessage });
        return throwError(() => err);
      }
      return throwError(() => err);
    })
  );
};
