import React, { useEffect, useState } from 'react';

import Button, { ButtonGroup } from '@atlaskit/button';

import Textfield from '@atlaskit/textfield';

import Form, { Field, FormFooter, HelperMessage, ErrorMessage } from '@atlaskit/form';

import Checkbox from '@atlaskit/checkbox';

import SectionMessage from '@atlaskit/section-message';

import Spinner from '@atlaskit/spinner';

import DynamicTable from '@atlaskit/dynamic-table';

import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';

import { type SelectedType } from '@atlaskit/tabs/types';

import VisuallyHidden from '@atlaskit/visually-hidden';

import { getBaseUrl } from './utils/projectKey';

interface SettingsData {
  projectKey: string;
  jql: string;
  useCustomJql: boolean;
  defaultJql: string;
  button1Label: string;
  button1Url: string;
  button2Label: string;
  button2Url: string;
  button3Label: string;
  button3Url: string;
  button4Label: string;
  button4Url: string;
  button5Label: string;
  button5Url: string;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: string;
}

interface ButtonData {
  buttonNumber: number;
  label: string;
  url: string;
  isConfigured: boolean;
}

const WMPRSettings: React.FC = () => {
  // Get project key from window variable set by the servlet
  const projectKey = (window as any).projectKey || 'global';

  const [settings, setSettings] = useState<SettingsData>({
    projectKey: projectKey,
    jql: '',
    useCustomJql: false,
    defaultJql: 'project = WMPR ORDER BY created DESC',
    button1Label: '',
    button1Url: '',
    button2Label: '',
    button2Url: '',
    button3Label: '',
    button3Url: '',
    button4Label: '',
    button4Url: '',
    button5Label: '',
    button5Url: ''
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Include projectKey parameter in the API call - always send it for consistency
      const url = new URL(`${getBaseUrl()}/rest/portal-requests/1.0/settings`);
      url.searchParams.append('projectKey', projectKey);

      console.log('Loading settings for projectKey:', projectKey);
      console.log('GET URL:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Failed to load settings: ${response.status}`);
      }

      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      setSaveMessage({ type: 'error', text: `Error loading settings: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setLoading(false);
    }
  };

  const validateJql = async (jql: string) => {
    if (!jql || jql.trim() === '') {
      setValidationResult({ valid: false, message: 'JQL cannot be empty' });
      return;
    }

    try {
      setValidating(true);
      const response = await fetch(`${getBaseUrl()}/rest/portal-requests/1.0/settings/validate-jql`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ jql })
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.status}`);
      }

      const result = await response.json();
      setValidationResult(result);
    } catch (error) {
      console.error('Error validating JQL:', error);
      setValidationResult({
        valid: false,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      setSaving(true);
      setSaveMessage(null);

      const payload = {
        projectKey: projectKey, // Use the project key from window variable
        jql: data.jql,
        useCustomJql: data.useCustomJql,
        button1Label: data.button1Label || '',
        button1Url: data.button1Url || '',
        button2Label: data.button2Label || '',
        button2Url: data.button2Url || '',
        button3Label: data.button3Label || '',
        button3Url: data.button3Url || '',
        button4Label: data.button4Label || '',
        button4Url: data.button4Url || '',
        button5Label: data.button5Label || '',
        button5Url: data.button5Url || ''
      };

      console.log('Saving settings for projectKey:', projectKey);
      console.log('POST payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(`${getBaseUrl()}/rest/portal-requests/1.0/settings`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save settings: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      setSaveMessage({ type: 'success', text: result.message || 'Settings saved successfully!' });

      // Update local state
      setSettings(prev => ({ ...prev, ...payload }));
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage({
        type: 'error',
        text: `Error saving settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (index: SelectedType) => {
    setSelectedTab(index);

    // Set status messages for different tabs
    switch(index) {
      case 0:
        setStatusMessage('JQL Configuration tab selected');
        break;
      case 1:
        setStatusMessage('Portal Buttons tab selected');
        break;
      case 2:
        setStatusMessage('Reports & Analytics tab selected');
        break;
      case 3:
        setStatusMessage('Advanced Settings tab selected');
        break;
      case 4:
        setStatusMessage('Help & Documentation tab selected');
        break;
      default:
        setStatusMessage(null);
    }
  };

  // Prepare button data for the table
  const getButtonsTableData = () => {
    const buttons: ButtonData[] = [];
    for (let i = 1; i <= 5; i++) {
      const label = settings[`button${i}Label` as keyof SettingsData] as string;
      const url = settings[`button${i}Url` as keyof SettingsData] as string;
      buttons.push({
        buttonNumber: i,
        label: label || '',
        url: url || '',
        isConfigured: !!(label && url)
      });
    }
    return buttons;
  };

  const buttonTableHead = {
    cells: [
      {
        key: 'button',
        content: 'Button #',
        isSortable: false,
        width: 15,
      },
      {
        key: 'label',
        content: 'Label',
        isSortable: false,
        width: 25,
      },
      {
        key: 'url',
        content: 'URL',
        isSortable: false,
        width: 40,
      },
      {
        key: 'status',
        content: 'Status',
        isSortable: false,
        width: 20,
      },
    ],
  };

  const buttonTableRows = getButtonsTableData().map((button, index) => ({
    key: `button-row-${index}`,
    cells: [
      {
        key: 'button',
        content: (
            <span style={{ fontWeight: 'bold', color: '#172b4d' }}>
            {button.buttonNumber}
          </span>
        ),
      },
      {
        key: 'label',
        content: (
            <span style={{
              color: button.label ? '#172b4d' : '#8993a4',
              fontStyle: button.label ? 'normal' : 'italic'
            }}>
            {button.label || 'Not set'}
          </span>
        ),
      },
      {
        key: 'url',
        content: (
            <span style={{
              color: button.url ? '#0052cc' : '#8993a4',
              fontStyle: button.url ? 'normal' : 'italic',
              fontSize: '12px'
            }}>
            {button.url ? (
                <a href={button.url} target="_blank" rel="noopener noreferrer">
                  {button.url.length > 50 ? `${button.url.substring(0, 50)}...` : button.url}
                </a>
            ) : 'Not set'}
          </span>
        ),
      },
      {
        key: 'status',
        content: (
            <span style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '3px',
              fontSize: '11px',
              fontWeight: 'bold',
              backgroundColor: button.isConfigured ? '#e3fcef' : '#ffebe6',
              color: button.isConfigured ? '#006644' : '#bf2600',
              border: `1px solid ${button.isConfigured ? '#79e2a0' : '#ffbdad'}`
            }}>
            {button.isConfigured ? 'Configured' : 'Not Set'}
          </span>
        ),
      },
    ],
  }));

  if (loading) {
    return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 40px',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <Spinner size="large" />
          <p style={{
            marginTop: '16px',
            color: '#5e6c84',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            Loading WMPR Settings...
          </p>
          <p style={{
            margin: '8px 0 0 0',
            color: '#8993a4',
            fontSize: '14px'
          }}>
            Fetching configuration data
          </p>
        </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    margin: '0 auto',
    padding: '0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '0'
  };

  const contentStyle: React.CSSProperties = {
    overflow: 'hidden'
  };

  const sectionStyle: React.CSSProperties = {
    borderRadius: '0px'
  };

  const sectionTitleStyle: React.CSSProperties = {
    margin: '0 0 16px 0',
    color: '#172b4d',
    fontSize: '18px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const tabPanelStyle: React.CSSProperties = {
    paddingTop: '32px'
  };

  return (
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '600'
          }}>
            WMPR Requests Settings
          </h1>
          <p style={{
            margin: '0',
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: '1.5'
          }}>
            Configure JQL queries and service desk portal buttons for WMPR request display.
            Customize how your team accesses and views work management process requests.
          </p>
        </div>

        {/* Content with Atlaskit Tabs */}
        <div style={contentStyle}>
          {statusMessage && (
              <VisuallyHidden role="status">{statusMessage}</VisuallyHidden>
          )}

          {saveMessage && (
              <div style={{ padding: '20px 32px 0' }}>
                <SectionMessage appearance={saveMessage.type === 'success' ? 'success' : 'error'}>
                  <p>{saveMessage.text}</p>
                </SectionMessage>
              </div>
          )}

          <Tabs onChange={handleTabChange} selected={selectedTab} id="wmpr-settings-tabs">
            <TabList>
              <Tab>JQL Configuration</Tab>
              <Tab>Portal Buttons</Tab>
              <Tab>Reports & Analytics</Tab>
              <Tab>Advanced Settings</Tab>
              <Tab>Help & Documentation</Tab>
            </TabList>

            {/* JQL Configuration Tab */}
            <TabPanel>
              <div style={tabPanelStyle}>
                <div style={sectionStyle}>
                  <h2 style={sectionTitleStyle}>
                    JQL Query Configuration
                  </h2>

                  <SectionMessage appearance="information">
                    <p>
                      Define a custom JQL query to control which WMPR requests appear in the Service Desk portal footer.
                      Leave "Use Custom JQL" unchecked to use the default query.
                    </p>
                  </SectionMessage>

                  <Form onSubmit={handleSubmit}>
                    {({ formProps }) => (
                        <form {...formProps}>
                          <div style={{ marginTop: '24px' }}>
                            <Field
                                name="useCustomJql"
                                defaultValue={settings.useCustomJql}
                            >
                              {({ fieldProps }) => (
                                  <Checkbox
                                      name={fieldProps.name}
                                      isChecked={fieldProps.value}
                                      onChange={(event) => fieldProps.onChange(event.target.checked)}
                                      label="Use Custom JQL Query"
                                  />
                              )}
                            </Field>

                            <Field
                                name="jql"
                                defaultValue={settings.jql}
                                validate={(value) => {
                                  if (!value || value.trim() === '') {
                                    return 'JQL is required when using custom JQL';
                                  }
                                  return undefined;
                                }}
                            >
                              {({ fieldProps, error }) => (
                                  <div style={{ marginTop: '20px' }}>
                                    <label style={{
                                      display: 'block',
                                      marginBottom: '8px',
                                      fontWeight: '600',
                                      color: '#172b4d'
                                    }}>
                                      Custom JQL Query
                                    </label>
                                    <Textfield
                                        {...fieldProps}
                                        placeholder={settings.defaultJql}
                                        onBlur={() => {
                                          if (fieldProps.value && fieldProps.value.trim() !== '') {
                                            validateJql(fieldProps.value);
                                          } else {
                                            setValidationResult(null);
                                          }
                                        }}
                                    />
                                    {error && <ErrorMessage>{error}</ErrorMessage>}

                                    {validating && (
                                        <div style={{
                                          marginTop: '8px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          color: '#5e6c84'
                                        }}>
                                          <Spinner size="small" />
                                          <span style={{ marginLeft: '8px' }}>Validating JQL...</span>
                                        </div>
                                    )}

                                    {validationResult && !validating && (
                                        <div style={{ marginTop: '8px' }}>
                                          {validationResult.valid ? (
                                              <HelperMessage>✅ JQL is valid</HelperMessage>
                                          ) : (
                                              <ErrorMessage>
                                                ❌ {validationResult.message || validationResult.errors}
                                              </ErrorMessage>
                                          )}
                                        </div>
                                    )}

                                    <HelperMessage>
                                      Default JQL: <code style={{
                                      background: '#f4f5f7',
                                      padding: '2px 4px',
                                      borderRadius: '3px'
                                    }}>
                                      {settings.defaultJql}
                                    </code>
                                    </HelperMessage>
                                  </div>
                              )}
                            </Field>
                          </div>

                          <FormFooter>
                            <ButtonGroup>
                              <Button
                                  type="submit"
                                  appearance="primary"
                                  isDisabled={saving}
                              >
                                {saving ? 'Saving...' : 'Save JQL Settings'}
                              </Button>
                              <Button
                                  onClick={loadSettings}
                                  isDisabled={saving}
                              >
                                Reset
                              </Button>
                            </ButtonGroup>
                          </FormFooter>
                        </form>
                    )}
                  </Form>
                </div>
              </div>
            </TabPanel>

            {/* Portal Buttons Tab */}
            <TabPanel>
              <div style={tabPanelStyle}>
                <div style={sectionStyle}>
                  <h2 style={sectionTitleStyle}>
                    Service Desk Portal Buttons
                  </h2>

                  <SectionMessage appearance="information">
                    <p>
                      Configure up to 5 action buttons that will appear above the WMPR requests table in the service desk portal.
                      Only buttons with both label and URL configured will be displayed.
                    </p>
                  </SectionMessage>

                  {/* Current Buttons Status Table */}
                  <div style={{ marginTop: '24px', marginBottom: '32px' }}>
                    <h3 style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#172b4d'
                    }}>
                      Current Configuration
                    </h3>
                    <DynamicTable
                        head={buttonTableHead}
                        rows={buttonTableRows}
                        defaultSortKey="button"
                        defaultSortOrder="ASC"
                        emptyView={<span>No buttons configured</span>}
                    />
                  </div>

                  {/* Button Configuration Forms */}
                  <Form onSubmit={handleSubmit}>
                    {({ formProps }) => (
                        <form {...formProps}>
                          <h3 style={{
                            margin: '0 0 20px 0',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#172b4d'
                          }}>
                            Configure Buttons
                          </h3>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                            gap: '20px'
                          }}>
                            {[1, 2, 3, 4, 5].map((num) => (
                                <div key={num} style={{
                                  padding: '20px',
                                  border: '1px solid #dfe1e6',
                                  borderRadius: '8px',
                                  backgroundColor: '#fff'
                                }}>
                                  <h4 style={{
                                    margin: '0 0 16px 0',
                                    fontSize: '14px',
                                    color: '#172b4d',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                              <span style={{
                                display: 'inline-block',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: '#0052cc',
                                color: 'white',
                                fontSize: '12px',
                                lineHeight: '20px',
                                textAlign: 'center',
                                fontWeight: 'bold'
                              }}>
                                {num}
                              </span>
                                    Button {num}
                                  </h4>

                                  <Field
                                      name={`button${num}Label`}
                                      defaultValue={settings[`button${num}Label` as keyof SettingsData] as string}
                                  >
                                    {({ fieldProps }) => (
                                        <div style={{ marginBottom: '16px' }}>
                                          <label style={{
                                            display: 'block',
                                            marginBottom: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#5e6c84',
                                            textTransform: 'uppercase'
                                          }}>
                                            Button Label
                                          </label>
                                          <Textfield
                                              {...fieldProps}
                                              placeholder={`e.g., "Create Request"`}
                                          />
                                        </div>
                                    )}
                                  </Field>

                                  <Field
                                      name={`button${num}Url`}
                                      defaultValue={settings[`button${num}Url` as keyof SettingsData] as string}
                                  >
                                    {({ fieldProps }) => (
                                        <div>
                                          <label style={{
                                            display: 'block',
                                            marginBottom: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#5e6c84',
                                            textTransform: 'uppercase'
                                          }}>
                                            Button URL
                                          </label>
                                          <Textfield
                                              {...fieldProps}
                                              placeholder="https://example.com/create-request"
                                          />
                                        </div>
                                    )}
                                  </Field>
                                </div>
                            ))}
                          </div>

                          <FormFooter>
                            <ButtonGroup>
                              <Button
                                  type="submit"
                                  appearance="primary"
                                  isDisabled={saving}
                              >
                                {saving ? 'Saving...' : 'Save Button Settings'}
                              </Button>
                              <Button
                                  onClick={loadSettings}
                                  isDisabled={saving}
                              >
                                Reset
                              </Button>
                            </ButtonGroup>
                          </FormFooter>
                        </form>
                    )}
                  </Form>
                </div>
              </div>
            </TabPanel>

            {/* Reports & Analytics Tab (Dummy) */}
            <TabPanel>
              <div style={tabPanelStyle}>
                <div style={sectionStyle}>
                  <h2 style={sectionTitleStyle}>
                    Reports & Analytics
                  </h2>

                  <SectionMessage appearance="information">
                    <p>
                      View detailed analytics and reports on WMPR request usage, performance metrics, and user engagement statistics.
                    </p>
                  </SectionMessage>

                  <div style={{ marginTop: '24px' }}>
                    <h3 style={{ color: '#172b4d', marginBottom: '16px' }}>Coming Soon</h3>
                    <p style={{ color: '#5e6c84', lineHeight: '1.6' }}>
                      This section will include comprehensive analytics for:
                    </p>
                    <ul style={{ color: '#5e6c84', lineHeight: '1.6', marginLeft: '20px' }}>
                      <li>Request volume and trends over time</li>
                      <li>Most frequently accessed request types</li>
                      <li>Button click analytics and conversion rates</li>
                      <li>User engagement patterns</li>
                      <li>Performance metrics and load times</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabPanel>

            {/* Advanced Settings Tab (Dummy) */}
            <TabPanel>
              <div style={tabPanelStyle}>
                <div style={sectionStyle}>
                  <h2 style={sectionTitleStyle}>
                    Advanced Settings
                  </h2>

                  <SectionMessage appearance="information">
                    <p>
                      Configure advanced options for WMPR request handling, caching, permissions, and integration settings.
                    </p>
                  </SectionMessage>

                  <div style={{ marginTop: '24px' }}>
                    <h3 style={{ color: '#172b4d', marginBottom: '16px' }}>Future Configuration Options</h3>
                    <p style={{ color: '#5e6c84', lineHeight: '1.6' }}>
                      Advanced settings will include:
                    </p>
                    <ul style={{ color: '#5e6c84', lineHeight: '1.6', marginLeft: '20px' }}>
                      <li>Cache timeout and refresh intervals</li>
                      <li>Permission-based filtering and access control</li>
                      <li>Custom field mappings and display options</li>
                      <li>Integration with external systems</li>
                      <li>Custom CSS styling options</li>
                      <li>API rate limiting and throttling</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabPanel>

            {/* Help & Documentation Tab (Dummy) */}
            <TabPanel>
              <div style={tabPanelStyle}>
                <div style={sectionStyle}>
                  <h2 style={sectionTitleStyle}>
                    Help & Documentation
                  </h2>

                  <SectionMessage appearance="success">
                    <p>
                      Find answers to common questions, setup guides, and troubleshooting information for WMPR Request configuration.
                    </p>
                  </SectionMessage>

                  <div style={{ marginTop: '24px' }}>
                    <h3 style={{ color: '#172b4d', marginBottom: '16px' }}>Quick Start Guide</h3>
                    <div style={{
                      background: '#fff',
                      padding: '20px',
                      borderRadius: '6px',
                      border: '1px solid #dfe1e6',
                      marginBottom: '20px'
                    }}>
                      <h4 style={{ color: '#172b4d', marginBottom: '12px' }}>1. Configure JQL Query</h4>
                      <p style={{ color: '#5e6c84', marginBottom: '0' }}>
                        Set up a custom JQL query to filter which requests appear in your portal footer.
                      </p>
                    </div>

                    <div style={{
                      background: '#fff',
                      padding: '20px',
                      borderRadius: '6px',
                      border: '1px solid #dfe1e6',
                      marginBottom: '20px'
                    }}>
                      <h4 style={{ color: '#172b4d', marginBottom: '12px' }}>2. Set Up Portal Buttons</h4>
                      <p style={{ color: '#5e6c84', marginBottom: '0' }}>
                        Configure action buttons that will appear above your WMPR requests table for quick access to common actions.
                      </p>
                    </div>

                    <div style={{
                      background: '#fff',
                      padding: '20px',
                      borderRadius: '6px',
                      border: '1px solid #dfe1e6'
                    }}>
                      <h4 style={{ color: '#172b4d', marginBottom: '12px' }}>3. Test Your Configuration</h4>
                      <p style={{ color: '#5e6c84', marginBottom: '0' }}>
                        Visit your Service Desk portal to see the WMPR requests section and verify your settings are working correctly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>
          </Tabs>

          {/* Summary Section */}
          <div style={{
            margin: '40px 32px 32px',
            padding: '24px',
            backgroundColor: '#f4f5f7',
            borderRadius: '8px',
            border: '1px solid #e1e5e9'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#172b4d'
            }}>
              Current Configuration Summary
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              <div>
                <p style={{ margin: '8px 0', color: '#5e6c84' }}>
                  <strong style={{ color: '#172b4d' }}>Project:</strong> {settings.projectKey}
                </p>
                <p style={{ margin: '8px 0', color: '#5e6c84' }}>
                  <strong style={{ color: '#172b4d' }}>Custom JQL:</strong> {settings.useCustomJql ? 'Enabled' : 'Disabled'}
                </p>
                <p style={{ margin: '8px 0', color: '#5e6c84' }}>
                  <strong style={{ color: '#172b4d' }}>Active Query:</strong>
                </p>
                <code style={{
                  display: 'block',
                  padding: '12px',
                  backgroundColor: '#fff',
                  border: '1px solid #dfe1e6',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginTop: '6px',
                  wordBreak: 'break-all'
                }}>
                  {settings.useCustomJql && settings.jql ? settings.jql : settings.defaultJql}
                </code>
              </div>

              <div>
                <p style={{ margin: '8px 0 16px 0', color: '#172b4d', fontWeight: '600' }}>
                  Configured Buttons: {getButtonsTableData().filter(b => b.isConfigured).length} of 5
                </p>
                {getButtonsTableData().map((button) => (
                    <div key={button.buttonNumber} style={{
                      margin: '6px 0',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: button.isConfigured ? '#36b37e' : '#dfe1e6',
                    color: 'white',
                    fontSize: '10px',
                    lineHeight: '16px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    {button.buttonNumber}
                  </span>
                      <span style={{ color: button.isConfigured ? '#172b4d' : '#8993a4' }}>
                    {button.isConfigured
                        ? `"${button.label}" → ${button.url.substring(0, 30)}${button.url.length > 30 ? '...' : ''}`
                        : 'Not configured'
                    }
                  </span>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default WMPRSettings;