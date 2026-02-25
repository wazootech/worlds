import { STATUS_CODE, STATUS_TEXT, type StatusCode } from "@std/http/status";

/**
 * ErrorResponseInit is the initialization options for ErrorResponse.
 */
export interface ErrorResponseInit {
  message: string;
  code: StatusCode;
  headers?: Headers | HeadersInit;
}

/**
 * ErrorResponse is a structured JSON error response.
 */
export class ErrorResponse extends Response {
  public constructor(init: ErrorResponseInit) {
    const { message, code } = init;
    const headers = new Headers(init.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    super(
      JSON.stringify({
        error: {
          code,
          message,
          statusText: STATUS_TEXT[code],
        },
      }),
      {
        status: code,
        headers: headers,
      },
    );
  }

  /**
   * BadRequest creates a 400 Bad Request error response.
   */
  static BadRequest(
    message: string,
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({
      message,
      code: STATUS_CODE.BadRequest,
      headers,
    });
  }

  /**
   * Unauthorized creates a 401 Unauthorized error response.
   */
  static Unauthorized(
    message = "Unauthorized",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({
      message,
      code: STATUS_CODE.Unauthorized,
      headers,
    });
  }

  /**
   * Forbidden creates a 403 Forbidden error response.
   */
  static Forbidden(
    message = "Forbidden",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({
      message,
      code: STATUS_CODE.Forbidden,
      headers,
    });
  }

  /**
   * NotFound creates a 404 Not Found error response.
   */
  static NotFound(
    message = "Not found",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({
      message,
      code: STATUS_CODE.NotFound,
      headers,
    });
  }

  /**
   * MethodNotAllowed creates a 405 Method Not Allowed error response.
   */
  static MethodNotAllowed(
    message = "Method Not Allowed",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({
      message,
      code: STATUS_CODE.MethodNotAllowed,
      headers,
    });
  }

  /**
   * Conflict creates a 409 Conflict error response.
   */
  static Conflict(
    message: string,
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({
      message,
      code: STATUS_CODE.Conflict,
      headers,
    });
  }

  /**
   * PayloadTooLarge creates a 413 Payload Too Large error response.
   */
  static PayloadTooLarge(
    message = "Payload Too Large",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({
      message,
      code: STATUS_CODE.ContentTooLarge,
      headers,
    });
  }

  /**
   * UnsupportedMediaType creates a 415 Unsupported Media Type error response.
   */
  static UnsupportedMediaType(
    message = "Unsupported Media Type",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({
      message,
      code: STATUS_CODE.UnsupportedMediaType,
      headers,
    });
  }

  /**
   * RateLimitExceeded creates a 429 Too Many Requests error response.
   */
  static RateLimitExceeded(
    message = "Rate limit exceeded",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({
      message,
      code: STATUS_CODE.TooManyRequests,
      headers,
    });
  }

  /**
   * InternalServerError creates a 500 Internal Server Error response.
   */
  static InternalServerError(
    message = "Internal Server Error",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({
      message,
      code: STATUS_CODE.InternalServerError,
      headers,
    });
  }
}
