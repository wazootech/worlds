/**
 * ErrorResponseInit is the initialization options for ErrorResponse.
 */
export interface ErrorResponseInit {
  message: string;
  code: number;
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
    return new ErrorResponse({ message, code: 400, headers });
  }

  /**
   * Unauthorized creates a 401 Unauthorized error response.
   */
  static Unauthorized(
    message = "Unauthorized",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({ message, code: 401, headers });
  }

  /**
   * Forbidden creates a 403 Forbidden error response.
   */
  static Forbidden(
    message = "Forbidden",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({ message, code: 403, headers });
  }

  /**
   * NotFound creates a 404 Not Found error response.
   */
  static NotFound(
    message = "Not found",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({ message, code: 404, headers });
  }

  /**
   * MethodNotAllowed creates a 405 Method Not Allowed error response.
   */
  static MethodNotAllowed(
    message = "Method Not Allowed",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({ message, code: 405, headers });
  }

  /**
   * Conflict creates a 409 Conflict error response.
   */
  static Conflict(
    message: string,
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({ message, code: 409, headers });
  }

  /**
   * PayloadTooLarge creates a 413 Payload Too Large error response.
   */
  static PayloadTooLarge(
    message = "Payload Too Large",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({ message, code: 413, headers });
  }

  /**
   * UnsupportedMediaType creates a 415 Unsupported Media Type error response.
   */
  static UnsupportedMediaType(
    message = "Unsupported Media Type",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({ message, code: 415, headers });
  }

  /**
   * RateLimitExceeded creates a 429 Too Many Requests error response.
   */
  static RateLimitExceeded(
    message = "Rate limit exceeded",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({ message, code: 429, headers });
  }

  /**
   * InternalServerError creates a 500 Internal Server Error response.
   */
  static InternalServerError(
    message = "Internal Server Error",
    headers: Headers | HeadersInit = {},
  ): ErrorResponse {
    return new ErrorResponse({ message, code: 500, headers });
  }
}
