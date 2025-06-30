import React, { useEffect, useState } from 'react';
import DynamicTable from '@atlaskit/dynamic-table';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button';

interface ServiceDeskRequest {
  key: string;
  summary: string;
  reporter: string;
  created: string;
  status: string;
  statusCategory: string;
}

interface ApiResponse {
  data: ServiceDeskRequest[];
  diagnostics?: {
    requestId: string;
    timestamp: string;
    duration: number;
    user: string;
    jql: string;
    resultCount: number;
    version: string;
  };
}

interface ButtonConfig {
  label: string;
  url: string;
}

const WMPRPortalFooter: React.FC = () => {
  const [requests, setRequests] = useState<ServiceDeskRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [buttonConfigs, setButtonConfigs] = useState<ButtonConfig[]>([]);

  useEffect(() => {
    fetchWMPRRequests();
    fetchButtonConfigs();
  }, []);

  const getBaseUrl = () => {
    // Get the base URL for API calls
    let baseUrl = (window as any).location.origin;
    let contextPath = '';
    
    // Try to get context path from AJS (most reliable method)
    if ((window as any).AJS?.contextPath) {
      contextPath = (window as any).AJS.contextPath();
    } else if ((window as any).contextPath) {
      contextPath = (window as any).contextPath;
    } else {
      // Fallback: detect context path from URL
      const pathname = window.location.pathname;
      const parts = pathname.split('/').filter(part => part.length > 0);
      
      // For URLs like jira.samsungaustin.com/servicedesk/customer/portal/1
      // We don't want any context path - API is at root level
      if (parts.length > 0) {
        const firstPart = parts[0];
        
        // If first part is 'servicedesk', this is root-level JIRA (no context path)
        if (firstPart === 'servicedesk') {
          contextPath = '';
        } 
        // If first part is 'jira', this is context-path JIRA (like localhost:2990/jira)
        else if (firstPart === 'jira') {
          contextPath = '/jira';
        }
        // For other first parts, only use if they're not servicedesk-related
        else if (!firstPart.includes('servicedesk') && !firstPart.includes('customer') && !firstPart.includes('portal')) {
          contextPath = '/' + firstPart;
        }
        // Otherwise assume root context (no context path)
      }
    }
    
    // Clean up context path
    if (contextPath && !contextPath.startsWith('/')) {
      contextPath = '/' + contextPath;
    }
    
    const fullUrl = `${baseUrl}${contextPath}`;
    console.log('WMPR Portal Footer - API Base URL:', fullUrl);
    console.log('WMPR Portal Footer - Current pathname:', window.location.pathname);
    console.log('WMPR Portal Footer - Detected context path:', contextPath || '(none - root level)');
    console.log('WMPR Portal Footer - Window origin:', baseUrl);
    return fullUrl;
  };

  const fetchWMPRRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const baseUrl = getBaseUrl();
      const apiUrl = `${baseUrl}/rest/wmpr-requests/1.0/recent`;
      
      console.log('Fetching WMPR requests from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      setRequests(data.data || []);
      console.log('WMPR requests loaded:', data.data?.length || 0);
    } catch (err) {
      console.error('Error fetching WMPR requests:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchButtonConfigs = async () => {
    try {
      const baseUrl = getBaseUrl();
      const apiUrl = `${baseUrl}/rest/wmpr-requests/1.0/settings`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
      });

      if (response.ok) {
        const data = await response.json();
        // Extract button configurations from settings
        const buttons: ButtonConfig[] = [];
        for (let i = 1; i <= 5; i++) {
          const label = data[`button${i}Label`];
          const url = data[`button${i}Url`];
          if (label && url) {
            buttons.push({ label, url });
          }
        }
        setButtonConfigs(buttons);
      }
    } catch (error) {
      console.error('Error fetching button configs:', error);
      // Don't show error for button configs, just silently fail
    }
  };

  const getStatusLozengeAppearance = (statusCategory: string) => {
    switch (statusCategory.toLowerCase()) {
      case 'new':
      case 'indeterminate':
        return 'default';
      case 'in-progress':
      case 'indeterminate':
        return 'inprogress';
      case 'done':
      case 'complete':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const head = {
    cells: [
      {
        key: 'key',
        content: 'Issue Key',
        isSortable: false,
      },
      {
        key: 'summary',
        content: 'Summary',
        isSortable: false,
      },
      {
        key: 'reporter',
        content: 'Reporter',
        isSortable: false,
      },
      {
        key: 'status',
        content: 'Status',
        isSortable: false,
      },
      {
        key: 'created',
        content: 'Created',
        isSortable: false,
      },
    ],
  };

  const rows = requests.map((request, index) => ({
    key: `row-${index}`,
    cells: [
      {
        key: 'key',
        content: (
          <a 
            href={`${getBaseUrl()}/browse/${request.key}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#0052CC', textDecoration: 'none' }}
          >
            {request.key}
          </a>
        ),
      },
      {
        key: 'summary',
        content: (
          <span title={request.summary}>
            {request.summary.length > 50 ? `${request.summary.substring(0, 50)}...` : request.summary}
          </span>
        ),
      },
      {
        key: 'reporter',
        content: request.reporter,
      },
      {
        key: 'status',
        content: (
          <Lozenge appearance={getStatusLozengeAppearance(request.statusCategory)}>
            {request.status}
          </Lozenge>
        ),
      },
      {
        key: 'created',
        content: formatDate(request.created),
      },
    ],
  }));

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        background: '#f4f5f7',
        borderRadius: '3px',
        margin: '10px 0'
      }}>
        <Spinner size="medium" />
        <p style={{ marginTop: '10px', color: '#5e6c84' }}>Loading WMPR requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        background: '#ffebe6',
        borderRadius: '3px',
        margin: '10px 0',
        border: '1px solid #ff5630'
      }}>
        <p style={{ color: '#bf2600', margin: '0 0 10px 0' }}>
          Error loading WMPR requests: {error}
        </p>
        <p style={{ color: '#5e6c84', fontSize: '12px', margin: '0 0 10px 0' }}>
          API URL: {getBaseUrl()}/rest/wmpr-requests/1.0/recent
        </p>
        <button 
          onClick={fetchWMPRRequests}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            background: '#0052CC',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      margin: '20px 0',
      background: '#fff',
      borderRadius: '3px',
      border: '1px solid #dfe1e6'
    }}>
      <div style={{ 
        padding: '16px',
        borderBottom: '1px solid #dfe1e6',
        background: '#f4f5f7'
      }}>
        <h3 style={{ 
          margin: '0',
          color: '#172b4d',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          Recent WMPR Requests
        </h3>
      </div>
      {buttonConfigs.length > 0 && (
        <div style={{ 
          padding: '16px',
          borderBottom: '1px solid #dfe1e6',
          background: '#fafbfc'
        }}>
          <div style={{ 
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {buttonConfigs.map((config, index) => (
              <Button
                key={index}
                appearance="primary"
                onClick={() => window.open(config.url, '_blank', 'noopener,noreferrer')}
              >
                {config.label}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: '0' }}>
        {requests.length === 0 ? (
          <div style={{ 
            padding: '40px 20px',
            textAlign: 'center',
            color: '#5e6c84'
          }}>
            No WMPR requests found.
          </div>
        ) : (
          <DynamicTable
            head={head}
            rows={rows}
            rowsPerPage={10}
            defaultPage={1}
            isLoading={false}
            isFixedSize
          />
        )}
      </div>
    </div>
  );
};

export default WMPRPortalFooter; 