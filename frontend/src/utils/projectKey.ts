/**
 * Project Key Detection Utility
 * Comprehensive detection of current Jira project key from various sources
 * with robust URL construction for all Jira contexts
 */

export interface ProjectKeyDetectionResult {
  projectKey: string | null;
  source: 'meta' | 'url' | 'global' | 'servicedesk' | 'manual' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  portalId?: string;
}

/**
 * Comprehensive project key detection using multiple strategies
 */
export const detectProjectKey = (): ProjectKeyDetectionResult => {
  // Strategy 1: AJS.Meta (highest confidence - works on most Jira pages)
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

  // Strategy 2: Service Desk Customer Portal (high confidence)
  try {
    const pathname = window.location.pathname;
    const portalMatch = pathname.match(/\/servicedesk\/customer\/portal\/(\d+)/);
    if (portalMatch) {
      return {
        projectKey: null, // Will be resolved async
        source: 'servicedesk',
        confidence: 'high',
        portalId: portalMatch[1]
      };
    }
  } catch (e) {
    console.debug('Failed to extract portal ID from URL:', e);
  }

  // Strategy 3: URL pattern matching for regular Jira pages (medium confidence)
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

    // Match /issues/?jql=project%20%3D%20PROJECTKEY
    const jqlMatch = window.location.search.match(/[?&]jql=.*?project\s*=\s*([A-Z][A-Z0-9]+)/);
    if (jqlMatch) {
      return {
        projectKey: jqlMatch[1],
        source: 'url',
        confidence: 'medium'
      };
    }
  } catch (e) {
    console.debug('Failed to extract project key from URL:', e);
  }

  // Strategy 4: Global window object (medium confidence)
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

  // Strategy 5: Document meta tags
  try {
    const metaElement = document.querySelector('meta[name="project-key"]');
    if (metaElement) {
      const metaKey = metaElement.getAttribute('content');
      if (metaKey && metaKey.match(/^[A-Z][A-Z0-9]+$/)) {
        return {
          projectKey: metaKey,
          source: 'meta',
          confidence: 'medium'
        };
      }
    }
  } catch (e) {
    console.debug('Failed to read project key from meta tag:', e);
  }

  // No project key detected
  return {
    projectKey: null,
    source: 'fallback',
    confidence: 'low'
  };
};

/**
 * Gets project key from service desk portal ID using REST API
 */
export const getProjectKeyFromPortalId = async (portalId: string): Promise<string | null> => {
  try {
    const baseUrl = getBaseUrl();
    console.debug(`Fetching project key for portal ${portalId} from: ${baseUrl}/rest/servicedeskapi/servicedesk/${portalId}`);
    
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
      const projectKey = data.projectKey || data.key;
      console.debug(`Found project key for portal ${portalId}:`, projectKey);
      return projectKey || null;
    } else {
      console.debug(`Failed to get project key for portal ${portalId}: HTTP ${response.status}`);
    }
  } catch (e) {
    console.debug('Failed to get project key from portal ID:', e);
  }
  return null;
};

/**
 * Robust base URL construction that works in all Jira contexts
 */
export const getBaseUrl = (): string => {
  try {
    // Strategy 1: Use AJS.contextPath() if available (most reliable)
    if ((window as any).AJS && typeof (window as any).AJS.contextPath === 'function') {
      const contextPath = (window as any).AJS.contextPath();
      const origin = window.location.origin;
      return origin + contextPath;
    }

    // Strategy 2: Extract from current URL pathname
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    
    // Handle different URL patterns
    const patterns = [
      // Service Desk Customer Portal: /servicedesk/customer/portal/14
      /^(\/[^\/]*)?\/servicedesk\/customer\/portal\/\d+/,
      // Regular Jira pages: /projects/PROJECTKEY, /browse/PROJECTKEY-123
      /^(\/[^\/]*)?\/(?:projects|browse)\/[A-Z][A-Z0-9]+/,
      // Issues page: /issues/
      /^(\/[^\/]*)?\/issues/,
      // Dashboard: /secure/Dashboard.jspa
      /^(\/[^\/]*)?\/secure\/Dashboard\.jspa/,
      // Any other Jira page
      /^(\/[^\/]*)?\/secure\//,
      // Generic pattern for any path with context
      /^(\/[^\/]*)?\/[^\/]+/
    ];

    for (const pattern of patterns) {
      const match = pathname.match(pattern);
      if (match && match[1]) {
        const contextPath = match[1];
        console.debug('Extracted context path from URL:', contextPath);
        return origin + contextPath;
      }
    }

    // Strategy 3: Fallback - assume no context path
    console.debug('No context path detected, using origin only');
    return origin;
  } catch (e) {
    console.error('Error constructing base URL:', e);
    // Ultimate fallback
    return window.location.origin;
  }
};

/**
 * Gets the current project key with comprehensive fallback strategy
 */
export const getCurrentProjectKey = async (): Promise<string> => {
  const detection = detectProjectKey();
  console.debug('Project key detection result:', detection);
  
  // If we have a direct project key, return it
  if (detection.projectKey) {
    return detection.projectKey;
  }

  // If we're on a service desk portal, try to get the project key
  if (detection.source === 'servicedesk' && detection.portalId) {
    console.debug(`Attempting to get project key from portal ID: ${detection.portalId}`);
    const projectKey = await getProjectKeyFromPortalId(detection.portalId);
    if (projectKey) {
      return projectKey;
    }
  }

  // Try additional strategies for service desk portals
  if (detection.source === 'servicedesk') {
    // Strategy: Try to get from the current page's data attributes or meta tags
    try {
      // Look for project key in data attributes
      const projectElement = document.querySelector('[data-project-key]');
      if (projectElement) {
        const dataKey = projectElement.getAttribute('data-project-key');
        if (dataKey && dataKey.match(/^[A-Z][A-Z0-9]+$/)) {
          console.debug('Found project key in data attribute:', dataKey);
          return dataKey;
        }
      }

      // Look for project key in page title or other elements
      const titleMatch = document.title.match(/\[([A-Z][A-Z0-9]+)\]/);
      if (titleMatch) {
        console.debug('Found project key in page title:', titleMatch[1]);
        return titleMatch[1];
      }
    } catch (e) {
      console.debug('Failed to extract project key from page elements:', e);
    }
  }

  // Fallback to 'global' for global settings
  console.debug('Using fallback project key: global');
  return 'global';
};

/**
 * Enhanced project key detection with detailed logging
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