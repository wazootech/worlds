import { STATUS_CODE, type StatusCode } from "@std/http/status";

/**
 * HttpError is a base class for all HTTP-related errors.
 */
export class HttpError extends Error {
  public constructor(
    public readonly status: StatusCode,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

/**
 * BadRequestError represents a 400 Bad Request error.
 */
export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(STATUS_CODE.BadRequest, message);
  }
}

/**
 * UnauthorizedError represents a 401 Unauthorized error.
 */
export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized") {
    super(STATUS_CODE.Unauthorized, message);
  }
}

/**
 * ForbiddenError represents a 403 Forbidden error.
 */
export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super(STATUS_CODE.Forbidden, message);
  }
}

/**
 * NotFoundError represents a 404 Not Found error.
 */
export class NotFoundError extends HttpError {
  constructor(message = "Not found") {
    super(STATUS_CODE.NotFound, message);
  }
}

/**
 * ConflictError represents a 409 Conflict error.
 */
export class ConflictError extends HttpError {
  constructor(message: string) {
    super(STATUS_CODE.Conflict, message);
  }
}

/**
 * InternalServerError represents a 500 Internal Server Error.
 */
export class InternalServerError extends HttpError {
  constructor(message = "Internal Server Error") {
    super(STATUS_CODE.InternalServerError, message);
  }
}
