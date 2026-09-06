export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export interface ApiError {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
