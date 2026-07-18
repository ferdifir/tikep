export class AuthenticationError extends Error {
  constructor(message = "Akses hanya tersedia melalui Telegram Mini App.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export function isAuthenticationError(error: unknown) {
  return error instanceof AuthenticationError;
}
