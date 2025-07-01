/**
 * Project Key Detection Utility
 * Detects the current Jira project key from various sources
 */

export interface ProjectKeyDetectionResult {
  projectKey: string | null;
  source: 'meta' | 'url' | 'global' | 'manual' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detects the current project key using multiple strategies
 */
export const detectProjectKey = (): ProjectKeyDetectionResult => {
  // Strategy 1: AJS.Meta (highest confidence)
  try {
    const meta = (window as any).AJS?.Meta?.get('project-key');
    if (meta && typeof meta === 'string' && meta.match(/^[A-Z][A-Z0-9]+$/)) {
      return {
        projectKey: meta,
        source: 'meta',
        confidence: 'high'
      };
    }
  } catch (e) {
    console.debug('Failed to read project key from AJS.Meta:', e);
  }

  // Strategy 2: URL pattern matching (medium confidence)
  try {
    const pathname = window.location.pathname;
    
    // Match /projects/PROJECTKEY or /browse/PROJECTKEY-123
    const projectMatch = pathname.match(/\/(?:projects|browse)\/([A-Z][A-Z0-9]+)/);
    if (projectMatch) {
      return {
        projectKey: projectMatch[1],
        source: 'url',
        confidence: 'medium'
      };
    }

    // Match service desk portal URLs and extract project key
    const portalMatch = pathname.match(/\/servicedesk\/customer\/portal\/(\d+)/);
    if (portalMatch) {
      // For now, we'll need to make an API call to get the project key from portal ID
      // This is async, so we'll handle it separately
      return {
        projectKey: null,
        source: 'url',
        confidence: 'low'
      };
    }
  } catch (e) {
    console.debug('Failed to extract project key from URL:', e);
  }

  // Strategy 3: Global window object (medium confidence)
  try {
    const globalKey = (window as any).projectKey;
    if (globalKey && typeof globalKey === 'string' && globalKey.match(/^[A-Z][A-Z0-9]+$/)) {
      return {
        projectKey: globalKey,
        source: 'global',
        confidence: 'medium'
      };
    }
  } catch (e) {
    console.debug('Failed to read project key from window.projectKey:', e);
  }

  // No project key detected
  return {
    projectKey: null,
    source: 'fallback',
    confidence: 'low'
  };
};

/**
 * Async function to get project key from service desk portal ID
 */
export const getProjectKeyFromPortalId = async (portalId: string): Promise<string | null> => {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/rest/servicedeskapi/servicedesk/${portalId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin'
    });

    if (response.ok) {
      const data = await response.json();
      return data.projectKey || null;
    }
  } catch (e) {
    console.debug('Failed to get project key from portal ID:', e);
  }
  return null;
};

/**
 * Gets the base URL for API calls
 */
export const getBaseUrl = (): string => {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  
  // Extract context path (everything before /projects, /browse, /servicedesk, etc.)
  const contextMatch = pathname.match(/^(\/[^\/]*)?(?:\/(?:projects|browse|servicedesk).*)?$/);
  const contextPath = contextMatch && contextMatch[1] !== '/' ? contextMatch[1] : '';
  
  return origin + contextPath;
};

/**
 * Gets the current project key with fallback to 'global'
 */
export const getCurrentProjectKey = async (): Promise<string> => {
  const detection = detectProjectKey();
  
  if (detection.projectKey) {
    return detection.projectKey;
  }

  // Try to get from service desk portal if we're on a portal page
  const pathname = window.location.pathname;
  const portalMatch = pathname.match(/\/servicedesk\/customer\/portal\/(\d+)/);
  if (portalMatch) {
    const projectKey = await getProjectKeyFromPortalId(portalMatch[1]);
    if (projectKey) {
      return projectKey;
    }
  }

  // Fallback to 'global' for global settings
  return 'global';
}; 