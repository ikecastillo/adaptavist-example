import React, { useEffect, useState } from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import DynamicTable from '@atlaskit/dynamic-table';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import { logger } from './utils/logger';
import { getBaseUrl } from './utils/projectKey';

interface ServiceDeskRequest {
  key: string;
  summary: string;
  status: string;
  created: string;
  updated: string;
  assignee?: string;
}

interface ApiResponse {
  data: ServiceDeskRequest[];
  diagnostics?: any;
}

interface ButtonConfig {
  label: string;
  url: string;
}

interface Settings {
  jql: string;
  buttons: ButtonConfig[];
}

const PortalFooter: React.FC = () => {
  const [requests, setRequests] = useState<ServiceDeskRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({ jql: '', buttons: [] });

  useEffect(() => {
    initializeComponent();
  }, []);

  const initializeComponent = async () => {
    try {
      logger.info('Portal Footer initializing');
      await Promise.all([
        fetchRequests(),
        fetchSettings()
      ]);
    } catch (error) {
      logger.error('Error initializing Portal Footer:', error);
      setError(`Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fetchSettings = async () => {
    try {
      const baseUrl = getBaseUrl();
      const apiUrl = `${baseUrl}/rest/portal-requests/1.0/settings`;
      
      logger.debug('Fetching settings from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSettings(data);
      logger.debug('Settings loaded:', data);
    } catch (err) {
      logger.error('Error fetching settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
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

  const getTableRows = () => {
    return requests.map(request => ({
      key: request.key,
      cells: [
        {
          key: 'key',
          content: <a href={`${getBaseUrl()}/browse/${request.key}`} target="_blank" rel="noopener noreferrer">{request.key}</a>
        },
        {
          key: 'summary',
          content: request.summary
        },
        {
          key: 'status',
          content: request.status
        },
        {
          key: 'created',
          content: formatDate(request.created)
        },
        {
          key: 'updated',
          content: formatDate(request.updated)
        },
        {
          key: 'assignee',
          content: request.assignee || '-'
        }
      ]
    }));
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Spinner size="large" />
        <p style={{ marginTop: '16px', color: '#6b778c' }}>Loading requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <SectionMessage appearance="error" title="Error">
          <p>{error}</p>
        </SectionMessage>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {settings.buttons.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <ButtonGroup>
            {settings.buttons.map((button, index) => (
              <Button
                key={index}
                appearance="default"
                href={button.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {button.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      )}

      <DynamicTable
        head={{
          cells: [
            { key: 'key', content: 'Key' },
            { key: 'summary', content: 'Summary' },
            { key: 'status', content: 'Status' },
            { key: 'created', content: 'Created' },
            { key: 'updated', content: 'Updated' },
            { key: 'assignee', content: 'Assignee' }
          ]
        }}
        rows={getTableRows()}
        loadingSpinnerSize="large"
        isLoading={loading}
        emptyView={
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p>No requests found.</p>
          </div>
        }
      />
    </div>
  );
};

export default PortalFooter; 