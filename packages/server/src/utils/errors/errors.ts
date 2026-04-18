import { STATUS_CODE, STATUS_TEXT, type StatusCode } from "@std/http/status";

/**
 * HttpError is a base class for all HTTP-related errors.
 */
export class HttpError extends Error {
  public readonly isHttpError = true;

  public constructor(
    public readonly status: StatusCode,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  /**
   * toResponse converts the error into a structured JSON Response.
   */
  public toResponse(): Response {
    return Response.json(
      {
        error: {
          code: this.status,
          message: this.message,
          statusText: STATUS_TEXT[this.status],
        },
      },
      {
        status: this.status,
        headers: { "Content-Type": "application/json" },
      },
    );
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
