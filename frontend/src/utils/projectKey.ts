/**
 * Utility functions for portal integration
 */

/**
 * Gets the base URL for API calls
 */
export const getBaseUrl = (): string => {
  try {
    // Use AJS.contextPath() if available (most reliable)
    if ((window as any).AJS && typeof (window as any).AJS.contextPath === 'function') {
      const contextPath = (window as any).AJS.contextPath();
      const origin = window.location.origin;
      return origin + contextPath;
    }

    // Fallback - assume no context path
    return window.location.origin;
  } catch (e) {
    console.error('Error constructing base URL:', e);
    return window.location.origin;
  }
}; 