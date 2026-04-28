export type AppError<E extends string = string> = {
  code: E;
  message: string;
};

export type AppResult<T, E extends string = string> =
  | { ok: true; data: T }
  | { ok: false; error: AppError<E> };

export function succeed<T>(data: T): AppResult<T, never> {
  return { ok: true, data };
}

export function fail<E extends string>(
  code: E,
  message: string,
): AppResult<never, E> {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}
