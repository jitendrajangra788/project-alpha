import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/** Normalize API errors so UI can show a stable message string. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const detail = err.error?.detail;
        let message = err.message || 'Request failed';
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail) && detail[0]?.msg) {
          message = detail.map((d: { msg: string }) => d.msg).join(', ');
        } else if (err.status === 0) {
          message = 'Cannot reach CareConnect API. Check your connection.';
        } else if (err.status === 429) {
          message = 'Too many requests. Please wait a moment and try again.';
        } else if (err.status >= 500) {
          message = 'Something went wrong on our side. Please try again.';
        }
        return throwError(() => ({ ...err, userMessage: message }));
      }
      return throwError(() => err);
    })
  );
};
