/**
 * Project Key Detection Utility - MVP Version
 * Simple detection that uses admin-configured settings
 */

export interface ProjectKeyDetectionResult {
  projectKey: string | null;
  source: 'settings' | 'fallback';
  confidence: 'high' | 'low';
}

/**
 * Simple project key detection for MVP
 */
export const detectProjectKey = (): ProjectKeyDetectionResult => {
  // Strategy 1: Use admin-configured project key from settings
  try {
    const adminProjectKey = (window as any).projectKey;
    if (adminProjectKey && typeof adminProjectKey === 'string') {
      return {
        projectKey: adminProjectKey,
        source: 'settings',
        confidence: 'high'
      };
    }
  } catch (e) {
    console.debug('Failed to read project key from settings:', e);
  }

  // Strategy 2: Fallback to global
  return {
    projectKey: 'global',
    source: 'fallback',
    confidence: 'low'
  };
};

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

/**
 * Gets the current project key - simplified for MVP
 */
export const getCurrentProjectKey = async (): Promise<string> => {
  const detection = detectProjectKey();
  console.debug('Project key detection result:', detection);
  
  return detection.projectKey || 'global';
};

/**
 * Enhanced project key detection with details (for debugging)
 */
export const getCurrentProjectKeyWithDetails = async (): Promise<{
  projectKey: string;
  source: string;
  confidence: string;
  baseUrl: string;
  url: string;
}> => {
  const detection = detectProjectKey();
  const projectKey = await getCurrentProjectKey();
  const baseUrl = getBaseUrl();
  
  return {
    projectKey,
    source: detection.source,
    confidence: detection.confidence,
    baseUrl,
    url: window.location.href
  };
}; 