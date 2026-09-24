export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message = "Bad request", details?: unknown) {
    return new AppError(400, message, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new AppError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new AppError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new AppError(404, message);
  }

  static conflict(message = "Conflict") {
    return new AppError(409, message);
  }
}