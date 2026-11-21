import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types';
// ISSUE #40 FIX: Import secure logout dispatcher
import { dispatchSecureLogout } from '@/shared/lib/auth-events';
import { redirectToLogin, isPublicAuthPath } from '@/shared/lib/navigation';
import { clearActiveWorkspaceContextId, getActiveWorkspaceContextId } from '@/shared/lib/workspace-context';
import { getApiUrl } from '@/lib/runtime-env';

/**
 * ISSUE #41 FIX: API timeout configuration
 * - Default timeout: 30 seconds for standard API requests
 * - Prevents hanging requests from blocking the UI indefinitely
 */
const API_TIMEOUT_MS = 30000; // 30 seconds

// Create axios instance
const apiClient = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true, // Important for HTTP-only cookies
  timeout: API_TIMEOUT_MS, // ISSUE #41 FIX: Add default timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if we're currently refreshing the token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

/**
 * ISSUE #48 FIX: Token refresh retry configuration
 * - Max 3 retry attempts with exponential backoff
 * - Base delay: 1 second, max delay: 8 seconds
 */
const TOKEN_REFRESH_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
};

/**
 * ISSUE #48 FIX: Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number): number {
  const delay = TOKEN_REFRESH_CONFIG.baseDelayMs * Math.pow(2, attempt);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() - 0.5);
  return Math.min(delay + jitter, TOKEN_REFRESH_CONFIG.maxDelayMs);
}

/**
 * ISSUE #48 FIX: Sleep helper for backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ISSUE #48 FIX: Attempt token refresh with retries and backoff
 */
async function attemptTokenRefresh(): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < TOKEN_REFRESH_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getBackoffDelay(attempt - 1);
        await sleep(delay);
      }

      await apiClient.post('/auth/refresh');
      return; // Success
    } catch (error) {
      lastError = error as Error;
    }
  }

  // All retries exhausted
  throw lastError || new Error('Token refresh failed after all retries');
}

const processQueue = (error: Error | null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

// Return the value as a non-empty string, or null otherwise.
function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

// Pull a `workspaceId` property off a params/data object that may be unknown-typed.
function pluckWorkspaceId(source: unknown): unknown {
  return source && typeof source === 'object' && 'workspaceId' in (source as Record<string, unknown>)
    ? (source as Record<string, unknown>).workspaceId
    : null;
}

function getWorkspaceIdFromConfig(config: InternalAxiosRequestConfig): string | null {
  const headerWorkspaceId = asNonEmptyString(config.headers?.['X-Workspace-Id']);
  if (headerWorkspaceId) {
    return headerWorkspaceId;
  }

  const paramsWorkspaceId = asNonEmptyString(pluckWorkspaceId(config.params));
  if (paramsWorkspaceId) {
    return paramsWorkspaceId;
  }

  const dataWorkspaceId = asNonEmptyString(pluckWorkspaceId(config.data));
  if (dataWorkspaceId) {
    return dataWorkspaceId;
  }

  return getActiveWorkspaceContextId();
}

// Request interceptor - add workspace header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const workspaceId = getWorkspaceIdFromConfig(config);
    if (workspaceId && config.headers) {
      config.headers['X-Workspace-Id'] = workspaceId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth endpoints (and /auth/me init check) must not trigger a refresh-retry loop.
const NO_REFRESH_RETRY_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/me'];
function isNoRefreshRetryUrl(url: string | undefined): boolean {
  return NO_REFRESH_RETRY_PATHS.some((p) => url?.includes(p));
}

// Clear auth state and send the user back to login after a failed refresh.
function handleRefreshFailure(): void {
  if (typeof window === 'undefined') {
    return;
  }
  clearActiveWorkspaceContextId();
  // ISSUE #40 FIX: Dispatch secure logout event with token
  // This prevents malicious scripts from triggering forced logouts
  dispatchSecureLogout();

  // Only redirect if not already on a public page
  const currentPath = window.location.pathname;
  if (!isPublicAuthPath(currentPath)) {
    redirectToLogin();
  }
}

// Perform the refresh + replay the original request; on failure, clean up + reject.
async function refreshAndRetry(originalRequest: InternalAxiosRequestConfig) {
  isRefreshing = true;
  try {
    // ISSUE #48 FIX: Attempt to refresh the token with retries and backoff
    await attemptTokenRefresh();
    processQueue(null);
    return apiClient(originalRequest);
  } catch (refreshError) {
    processQueue(refreshError as Error);
    handleRefreshFailure();
    return Promise.reject(refreshError);
  } finally {
    isRefreshing = false;
  }
}

// Response interceptor - handle 401 and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry for auth endpoints or /auth/me (initialization check)
      if (isNoRefreshRetryUrl(originalRequest.url)) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait for the refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      return refreshAndRetry(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// User-friendly error messages for common scenarios
// ISSUE #41 FIX: Added timeout-specific error messages
const ERROR_MESSAGES: Record<string, string> = {
  'Network Error': 'Unable to connect to the server. Please check your internet connection and try again.',
  'ECONNREFUSED': 'The server is currently unavailable. Please try again in a few moments.',
  'ETIMEDOUT': 'The request timed out. Please check your connection and try again.',
  'ENOTFOUND': 'Unable to reach the server. Please check your internet connection.',
  'ERR_NETWORK': 'Network error. Please check your internet connection and try again.',
  'ECONNABORTED': 'The request timed out. The server may be busy - please try again.',
  'timeout of': 'The request timed out. Please check your connection and try again.',
  'Request failed with status code 500': 'Something went wrong on our end. Please try again later.',
  'Request failed with status code 502': 'The server is temporarily unavailable. Please try again in a few moments.',
  'Request failed with status code 503': 'The service is temporarily unavailable. Please try again later.',
  'Request failed with status code 504': 'The server took too long to respond. Please try again.',
};

// User-friendly copy for specific HTTP status codes.
const STATUS_MESSAGES: Record<number, string> = {
  401: 'Invalid email or password. Please try again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  429: 'Too many requests. Please wait a moment and try again.',
};

// First ERROR_MESSAGES copy whose pattern the message contains, else null.
function matchErrorPattern(message: string): string | null {
  for (const [pattern, friendlyMessage] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(pattern)) {
      return friendlyMessage;
    }
  }
  return null;
}

// Extract a backend `message`, preferring the first field-level validation error.
function getBackendMessage(responseData: ApiResponse | undefined): string | null {
  if (!responseData?.message) {
    return null;
  }
  const errors = (responseData as unknown as Record<string, unknown>).errors;
  if (Array.isArray(errors) && errors.length > 0 && errors[0]?.message) {
    return errors[0].message;
  }
  return responseData.message;
}

// Friendly copy for a transport-level error code (no HTTP response), else null.
function matchNetworkCode(axiosError: AxiosError<ApiResponse>): string | null {
  if (!axiosError.response && axiosError.code) {
    return ERROR_MESSAGES[axiosError.code] ?? null;
  }
  return null;
}

function getAxiosErrorMessage(axiosError: AxiosError<ApiResponse>): string {
  // Check for specific HTTP status codes
  const status = axiosError.response?.status;
  const statusMessage = status ? STATUS_MESSAGES[status] : undefined;
  if (statusMessage) {
    return statusMessage;
  }

  // Check for backend error message with field-level validation errors
  const backendMessage = getBackendMessage(axiosError.response?.data);
  if (backendMessage) {
    return backendMessage;
  }

  // Check for known error patterns and return user-friendly message
  const errorMsg = axiosError.message || '';
  const patternMessage = matchErrorPattern(errorMsg);
  if (patternMessage) {
    return patternMessage;
  }

  // Check for network errors without response
  const networkMessage = matchNetworkCode(axiosError);
  if (networkMessage) {
    return networkMessage;
  }

  // Fallback
  return errorMsg || 'An error occurred. Please try again.';
}

// Helper function to extract error message from API response
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return getAxiosErrorMessage(error as AxiosError<ApiResponse>);
  }

  if (error instanceof Error) {
    // Check for known error patterns
    return matchErrorPattern(error.message) ?? error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
