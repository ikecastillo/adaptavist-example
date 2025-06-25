import React, { useEffect, useState } from 'react';
import DynamicTable from '@atlaskit/dynamic-table';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';

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

const WMPRPortalFooter: React.FC = () => {
  const [requests, setRequests] = useState<ServiceDeskRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWMPRRequests();
  }, []);

  const fetchWMPRRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the base URL for the current Jira instance
      const baseUrl = (window as any).location.origin;
      const contextPath = (window as any).AJS?.contextPath() || '';
      
      const response = await fetch(`${baseUrl}${contextPath}/rest/wmpr-requests/1.0/recent`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setRequests(data.data || []);
    } catch (err) {
      console.error('Error fetching WMPR requests:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
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
            href={`/browse/${request.key}`} 
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
        <p style={{ color: '#bf2600', margin: '0' }}>
          Error loading WMPR requests: {error}
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