export type ApiSuccess<T> = {
  ok: true
  data: T
}

export type ApiFailure = {
  ok: false
  error: {
    code: string
    message: string
    cause?: unknown
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export function success<T>(data: T): ApiSuccess<T> {
  return { ok: true, data }
}

export function failure(
  code: string,
  message: string,
  cause?: unknown,
): ApiFailure {
  return {
    ok: false,
    error: { code, message, cause },
  }
}

export function toFailure(
  code: string,
  error: unknown,
  fallbackMessage = "Unexpected service error",
): ApiFailure {
  if (error instanceof Error) {
    return failure(code, error.message, error)
  }

  return failure(code, fallbackMessage, error)
}
