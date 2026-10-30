/** Errors the API returns on purpose. Anything else becomes a 500 with no internal detail. */
export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export const badRequest = (code: string, message: string, details?: unknown) => new HttpError(422, code, message, details);
export const unauthorised = (message = 'Sign in to continue.') => new HttpError(401, 'unauthorised', message);
export const forbidden = (message = 'You do not have access to this.') => new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);
export const tooMany = (message = 'Too many attempts. Try again in a few minutes.') => new HttpError(429, 'rate_limited', message);
