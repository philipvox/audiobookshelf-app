/**
 * src/core/api/baseClient.ts
 *
 * Base HTTP client for AudiobookShelf API with configuration and core HTTP methods.
 * Enhanced with network optimizations: deduplication, caching, retry, and request queue.
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { ApiClientConfig } from '../types/api';
import { networkOptimizer, Priority } from './networkOptimizer';
import { trackEvent } from '../monitoring';

/**
 * Base API client with HTTP methods and configuration
 */
export class BaseApiClient {
  protected axiosInstance: AxiosInstance;
  protected baseURL: string = '';
  protected authToken: string = '';

  // Auth failure handling
  private onAuthFailure: (() => void) | null = null;
  private isVerifyingAuth: boolean = false;

  constructor() {
    // Initialize axios instance with default config
    this.axiosInstance = axios.create({
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and auth retry
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // Handle 401 errors with silent re-auth attempt
        if (error.response?.status === 401 && !this.isVerifyingAuth) {
          const originalRequest = error.config;

          // Skip re-auth for login endpoint
          if (originalRequest?.url?.includes('/login')) {
            return Promise.reject(this.handleError(error));
          }

          // Try to verify token with /api/me
          const isValid = await this.tryVerifyAuth();

          if (!isValid && this.onAuthFailure) {
            // Token is definitely invalid - trigger logout
            trackEvent('auth_session_expired', {
              endpoint: originalRequest?.url,
              method: originalRequest?.method,
            }, 'warning');
            this.onAuthFailure();
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Attempt to verify auth by calling /api/me with retries.
   * Returns true if token is still valid, false only if server confirms invalid.
   *
   * CRITICAL: A single transient 401 + network blip during verification used to
   * trigger permanent logout, wiping ALL local state (progress, downloads, prefs).
   * Now we retry 3 times with backoff, and only return false when the server
   * explicitly confirms the token is invalid (401 response with valid body).
   * Network errors during verification are treated as "unknown" → no logout.
   */
  private async tryVerifyAuth(): Promise<boolean> {
    if (!this.authToken || !this.baseURL) {
      return false;
    }

    this.isVerifyingAuth = true;

    const MAX_RETRIES = 3;
    const RETRY_DELAY_BASE = 500; // 500ms, 1000ms, 2000ms

    try {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Make a direct axios call to avoid our own interceptor
          await this.axiosInstance.get('/api/me', {
            headers: { Authorization: `Bearer ${this.authToken}` },
            timeout: 10000, // 10s timeout per attempt
          });
          // If we get here, token is valid - the original 401 was transient
          return true;
        } catch (verifyError: any) {
          const status = verifyError?.response?.status;

          // Server explicitly says 401 = token is genuinely invalid, no retry needed
          if (status === 401) {
            return false;
          }

          // Server returned 403 = token valid but forbidden, don't logout
          if (status === 403) {
            return true;
          }

          // Network error or timeout — retry, don't assume token is invalid
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve =>
              setTimeout(resolve, RETRY_DELAY_BASE * attempt)
            );
          }
        }
      }

      // All retries exhausted with network errors — assume token is still valid
      // rather than wiping all local data. The user will get a natural retry
      // on their next API call when connectivity returns.
      return true;
    } finally {
      this.isVerifyingAuth = false;
    }
  }

  /**
   * Configure the API client with base URL and optional auth token
   */
  configure(config: ApiClientConfig): void {
    this.baseURL = config.baseURL;
    this.authToken = config.token || '';

    this.axiosInstance.defaults.baseURL = this.baseURL;

    if (config.timeout) {
      this.axiosInstance.defaults.timeout = config.timeout;
    }
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = '';
  }

  /**
   * Get current base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Get current auth token
   */
  getAuthToken(): string {
    return this.authToken;
  }

  /**
   * Set callback for auth failures (401 after verification fails)
   * Used by AuthProvider to trigger logout
   */
  setOnAuthFailure(callback: (() => void) | null): void {
    this.onAuthFailure = callback;
  }

  /**
   * Handle API errors and format them consistently
   */
  protected handleError(error: AxiosError): Error {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = (error.response.data as Record<string, unknown>)?.error as string || error.message;

      switch (status) {
        case 401:
          // Track auth failures for monitoring
          trackEvent('auth_token_expired', {
            endpoint: error.config?.url,
            method: error.config?.method,
          }, 'warning');
          return new Error('Unauthorized - please login again');
        case 403:
          return new Error('Forbidden - insufficient permissions');
        case 404:
          return new Error('Resource not found');
        case 500:
          return new Error('Server error - please try again later');
        default:
          // Avoid leaking raw server error details to the UI
          return new Error(`Server error (${status}). Please try again later.`);
      }
    } else if (error.request) {
      // Request made but no response received
      return new Error('Network error - please check your connection');
    } else {
      // Error setting up the request — avoid leaking internal details
      return new Error('Request failed. Please check your connection and try again.');
    }
  }

  // ==================== Core HTTP Methods ====================

  /**
   * Perform GET request with network optimizations
   * - Request deduplication (prevents duplicate concurrent requests)
   * - Automatic retry with exponential backoff
   * - Request queue with priority
   */
  async get<T>(
    url: string,
    config?: AxiosRequestConfig & {
      cacheTTL?: number;
      priority?: Priority;
      skipCache?: boolean;
      skipOptimizations?: boolean;
    }
  ): Promise<T> {
    const { cacheTTL, priority, skipCache, skipOptimizations, ...axiosConfig } = config || {};

    // Build cache key from URL
    const cacheKey = `GET:${url}`;

    // Use raw request if optimizations disabled
    if (skipOptimizations) {
      const response = await this.axiosInstance.get<T>(url, axiosConfig);
      return response.data;
    }

    return networkOptimizer.get<T>(
      cacheKey,
      async () => {
        const response = await this.axiosInstance.get<T>(url, axiosConfig);
        return response.data;
      },
      { cacheTTL, priority, skipCache }
    );
  }

  /**
   * Perform POST request with optimizations
   * - Automatic retry for server errors
   * - Request queue with high priority
   */
  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & {
      priority?: Priority;
      invalidateCache?: string | RegExp;
      skipRetry?: boolean;
    }
  ): Promise<T> {
    const { priority = 'high', invalidateCache, skipRetry, ...axiosConfig } = config || {};

    return networkOptimizer.mutate<T>(
      async () => {
        const response = await this.axiosInstance.post<T>(url, data, axiosConfig);
        return response.data;
      },
      { priority, invalidateCache, skipRetry }
    );
  }

  /**
   * Perform PATCH request with optimizations
   */
  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & {
      priority?: Priority;
      invalidateCache?: string | RegExp;
      skipRetry?: boolean;
    }
  ): Promise<T> {
    const { priority = 'high', invalidateCache, skipRetry, ...axiosConfig } = config || {};

    return networkOptimizer.mutate<T>(
      async () => {
        const response = await this.axiosInstance.patch<T>(url, data, axiosConfig);
        return response.data;
      },
      { priority, invalidateCache, skipRetry }
    );
  }

  /**
   * Perform PUT request with optimizations
   */
  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & {
      priority?: Priority;
      invalidateCache?: string | RegExp;
      skipRetry?: boolean;
    }
  ): Promise<T> {
    const { priority = 'high', invalidateCache, skipRetry, ...axiosConfig } = config || {};

    return networkOptimizer.mutate<T>(
      async () => {
        const response = await this.axiosInstance.put<T>(url, data, axiosConfig);
        return response.data;
      },
      { priority, invalidateCache, skipRetry }
    );
  }

  /**
   * Perform DELETE request with optimizations
   */
  async delete<T>(
    url: string,
    config?: AxiosRequestConfig & {
      priority?: Priority;
      invalidateCache?: string | RegExp;
      skipRetry?: boolean;
    }
  ): Promise<T> {
    const { priority = 'high', invalidateCache, skipRetry, ...axiosConfig } = config || {};

    return networkOptimizer.mutate<T>(
      async () => {
        const response = await this.axiosInstance.delete<T>(url, axiosConfig);
        return response.data;
      },
      { priority, invalidateCache, skipRetry }
    );
  }

  /**
   * Prefetch data into cache (low priority, non-blocking)
   */
  prefetch<T>(url: string, cacheTTL: number = 60000): void {
    const cacheKey = `GET:${url}`;
    networkOptimizer.prefetch(cacheKey, async () => {
      const response = await this.axiosInstance.get<T>(url);
      return response.data;
    }, cacheTTL);
  }

  /**
   * Invalidate cache for a URL pattern
   */
  invalidateCache(pattern: string | RegExp): void {
    networkOptimizer.cache.invalidatePattern(pattern);
  }

  /**
   * Reset all network optimizations (on logout, etc)
   */
  resetNetwork(): void {
    networkOptimizer.reset();
  }
}
