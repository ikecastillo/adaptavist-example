import React, { useEffect, useState } from 'react';
import DynamicTable from '@atlaskit/dynamic-table';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button';
import { getBaseUrl } from './utils/projectKey';
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

  useEffect(() => {
    initializeComponent();
  }, []);

  const initializeComponent = async () => {
    try {
      logger.info('Portal Footer initializing');
      
      await Promise.all([
        fetchRequests(),
        fetchButtonConfigs()
      ]);
    } catch (error) {
      logger.error('Error initializing Portal Footer:', error);
      setError(`Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const baseUrl = getBaseUrl();
      const apiUrl = `${baseUrl}/rest/portal-requests/1.0/recent`;
      
      logger.debug('Fetching requests from:', apiUrl);
      
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
      const url = `${baseUrl}/rest/portal-requests/1.0/settings/buttons`;
      
      logger.debug('Loading button configs from:', url);
      
      const response = await fetch(url, {
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
        setButtonConfigs([]);
      }
    } catch (error) {
      logger.error('Error fetching button configs:', error);
      setButtonConfigs([]);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusLozengeAppearance = (statusCategory: string): 'default' | 'new' | 'inprogress' | 'moved' | 'success' | 'removed' => {
    switch (statusCategory?.toLowerCase()) {
      case 'new':
        return 'new';
      case 'indeterminate':
        return 'inprogress';
      case 'done':
        return 'success';
      default:
        return 'default';
    }
  };

  // Debug component for development
  const DebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') {
      return null;
    }

    return (
      <div style={{
        background: '#f4f5f7',
        border: '1px solid #dfe1e6',
        borderRadius: '4px',
        padding: '12px',
        marginBottom: '16px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <strong>Debug Info:</strong><br/>
        Requests: {requests.length}<br/>
        Buttons: {buttonConfigs.length}<br/>
        Loading: {loading.toString()}<br/>
        Error: {error || 'none'}<br/>
        Base URL: {getBaseUrl()}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Spinner size="medium" />
        <p style={{ marginTop: '10px', color: '#6b778c' }}>
          Loading requests...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <DebugInfo />
        
        <div style={{
          background: '#ffebe6',
          border: '1px solid #ff8b00',
          borderRadius: '4px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <strong style={{ color: '#bf2600' }}>Error loading requests:</strong>
          <p style={{ margin: '8px 0 0 0', color: '#6b778c' }}>{error}</p>
          <Button 
            appearance="link" 
            onClick={fetchRequests}
            style={{ marginTop: '8px', padding: '0' }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

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

  return (
    <div style={{ padding: '20px' }}>
      <DebugInfo />
      
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#172b4d' }}>
          Recent Requests ({requests.length})
        </h3>
        {requests.length === 0 && (
          <p style={{ color: '#6b778c', fontStyle: 'italic' }}>
            No recent requests found. Make sure a JQL query is configured in the settings.
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