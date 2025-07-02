import React, { useEffect, useState } from 'react';
import DynamicTable from '@atlaskit/dynamic-table';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button';
import { getCurrentProjectKey, getBaseUrl, getCurrentProjectKeyWithDetails } from './utils/projectKey';
import { logger } from './utils/logger';

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

const PortalFooter: React.FC = () => {
  const [requests, setRequests] = useState<ServiceDeskRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [buttonConfigs, setButtonConfigs] = useState<ButtonConfig[]>([]);
  const [projectKey, setProjectKey] = useState<string>('global');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    initializeComponent();
  }, []);

  const initializeComponent = async () => {
    try {
      // Get detailed project key information for debugging
      const details = await getCurrentProjectKeyWithDetails();
      setDebugInfo(details);
      setProjectKey(details.projectKey);
      
      logger.info('Portal Footer initialized with details:', details);
      
      await Promise.all([
        fetchWMPRRequests(),
        fetchButtonConfigs()
      ]);
    } catch (error) {
      logger.error('Error initializing Portal Footer:', error);
      setError(`Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fetchWMPRRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const baseUrl = getBaseUrl();
      const apiUrl = `${baseUrl}/rest/portal-requests/1.0/recent`;
      
      // Add project key as query parameter for better backend handling
      const url = new URL(apiUrl);
      url.searchParams.append('projectKey', projectKey);
      
      logger.debug('Fetching requests from:', url.toString());
      logger.debug('Base URL:', baseUrl);
      logger.debug('Project Key:', projectKey);
      
      const response = await fetch(url.toString(), {
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
      logger.debug('Requests loaded:', data.data?.length || 0);
      
      // Log diagnostics if available
      if (data.diagnostics) {
        logger.debug('API Diagnostics:', data.diagnostics);
      }
    } catch (err) {
      logger.error('Error fetching requests:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchButtonConfigs = async () => {
    try {
      const baseUrl = getBaseUrl();
      const url = new URL(`${baseUrl}/rest/portal-requests/1.0/settings`);
      url.searchParams.append('projectKey', projectKey);
      
      logger.debug('Loading button configs for projectKey:', projectKey);
      logger.debug('GET URL:', url.toString());
      
      const response = await fetch(url.toString(), {
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
        logger.debug('Button configs loaded:', buttons.length);
      } else {
        logger.warn('Failed to load button configs:', response.status);
      }
    } catch (error) {
      logger.error('Error fetching button configs:', error);
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

  // Create table data
  const createTableData = () => {
    return requests.map((request, index) => ({
      key: request.key,
      cells: [
        {
          key: 'key',
          content: (
            <a 
              href={`${getBaseUrl()}/browse/${request.key}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0052cc', textDecoration: 'none' }}
            >
              {request.key}
            </a>
          ),
        },
        {
          key: 'summary',
          content: request.summary,
        },
        {
          key: 'reporter',
          content: request.reporter,
        },
        {
          key: 'created',
          content: formatDate(request.created),
        },
        {
          key: 'status',
          content: (
            <Lozenge appearance={getStatusLozengeAppearance(request.statusCategory)}>
              {request.status}
            </Lozenge>
          ),
        },
      ],
    }));
  };

  const tableHead = {
    cells: [
      {
        key: 'key',
        content: 'Key',
        isSortable: false,
        width: 15,
      },
      {
        key: 'summary',
        content: 'Summary',
        isSortable: false,
        width: 40,
      },
      {
        key: 'reporter',
        content: 'Reporter',
        isSortable: false,
        width: 15,
      },
      {
        key: 'created',
        content: 'Created',
        isSortable: false,
        width: 15,
      },
      {
        key: 'status',
        content: 'Status',
        isSortable: false,
        width: 15,
      },
    ],
  };

  // Debug information component
  const DebugInfo = () => {
    if (!debugInfo) return null;
    
    return (
      <div style={{ 
        fontSize: '12px', 
        color: '#6b778c', 
        marginBottom: '10px',
        padding: '8px',
        backgroundColor: '#f4f5f7',
        borderRadius: '3px',
        border: '1px solid #dfe1e6'
      }}>
        <strong>Debug Info:</strong> Project: {debugInfo.projectKey} | 
        Source: {debugInfo.source} | 
        Confidence: {debugInfo.confidence} | 
        Base URL: {debugInfo.baseUrl}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <DebugInfo />
        <Spinner size="medium" />
        <p style={{ marginTop: '10px', color: '#6b778c' }}>Loading recent requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <DebugInfo />
        <div style={{ color: '#de350b', marginBottom: '10px' }}>
          <strong>Error:</strong> {error}
        </div>
        <Button 
          appearance="primary" 
          onClick={fetchWMPRRequests}
          style={{ marginRight: '10px' }}
        >
          Retry
        </Button>
        <Button 
          appearance="subtle" 
          onClick={() => setError(null)}
        >
          Dismiss
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <DebugInfo />
      
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#172b4d' }}>
          Recent Requests ({requests.length})
        </h3>
        {requests.length === 0 && (
          <p style={{ color: '#6b778c', fontStyle: 'italic' }}>
            No recent requests found for project: {projectKey}
          </p>
        )}
      </div>

      {requests.length > 0 && (
        <DynamicTable
          head={tableHead}
          rows={createTableData()}
          rowsPerPage={5}
          defaultPage={1}
          isFixedSize
          defaultSortKey="created"
          defaultSortOrder="DESC"
        />
      )}

      {buttonConfigs.length > 0 && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #dfe1e6' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#172b4d' }}>Quick Actions</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {buttonConfigs.map((button, index) => (
              <Button
                key={index}
                appearance="primary"
                onClick={() => window.open(button.url, '_blank')}
              >
                {button.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalFooter; 