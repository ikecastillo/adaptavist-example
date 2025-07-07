import React, { useEffect, useState } from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import Form, { Field, FormFooter, HelperMessage, ErrorMessage } from '@atlaskit/form';
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import { type SelectedType } from '@atlaskit/tabs/types';
import { getBaseUrl } from './utils/projectKey';

interface SettingsData {
  jql: string;
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
  confluenceSpaces: string[];
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: string;
}

interface ConfluencePage {
  id: string;
  title: string;
  url: string;
  space: string;
}

const WMPRSettings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    jql: '',
    defaultJql: 'project = HELP ORDER BY created DESC',
    button1Label: '',
    button1Url: '',
    button2Label: '',
    button2Url: '',
    button3Label: '',
    button3Url: '',
    button4Label: '',
    button4Url: '',
    button5Label: '',
    button5Url: '',
    confluenceSpaces: []
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savingButtons, setSavingButtons] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [aiQuery, setAiQuery] = useState<string>('');
  const [aiResults, setAiResults] = useState<{ response: string; pages: ConfluencePage[] } | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const url = `${getBaseUrl()}/rest/portal-requests/1.0/settings`;

      console.log('Loading settings from:', url);

      const response = await fetch(url, {
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
        jql: data.jql
      };

      console.log('Saving JQL settings:', payload);

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
      setSaveMessage({ type: 'success', text: result.message || 'JQL settings saved successfully!' });

      // Update local state
      setSettings(prev => ({ ...prev, jql: data.jql }));
    } catch (error) {
      console.error('Error saving JQL settings:', error);
      setSaveMessage({
        type: 'error',
        text: `Error saving JQL settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleButtonSubmit = async (data: any) => {
    try {
      setSavingButtons(true);
      setSaveMessage(null);

      const payload = {
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

      console.log('Saving button settings:', payload);

      const response = await fetch(`${getBaseUrl()}/rest/portal-requests/1.0/settings/buttons`, {
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
        throw new Error(`Failed to save button settings: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      setSaveMessage({ type: 'success', text: result.message || 'Button settings saved successfully!' });

      // Update local state
      setSettings(prev => ({ ...prev, ...payload }));
    } catch (error) {
      console.error('Error saving button settings:', error);
      setSaveMessage({
        type: 'error',
        text: `Error saving button settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setSavingButtons(false);
    }
  };

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return;

    try {
      setAiLoading(true);
      setAiResults(null);

      // Simulate AI response with Confluence pages
      setTimeout(() => {
        const mockResponse = {
          response: `Based on your question "${aiQuery}", here are some relevant resources and recommendations for handling this type of request. The most common approach is to follow our standard escalation procedures and ensure proper documentation.`,
          pages: [
            {
              id: '1',
              title: 'Service Desk Escalation Procedures',
              url: 'https://confluence.example.com/display/HELP/Escalation+Procedures',
              space: 'HELP'
            },
            {
              id: '2',
              title: 'Request Handling Best Practices',
              url: 'https://confluence.example.com/display/HELP/Request+Handling+Best+Practices',
              space: 'HELP'
            },
            {
              id: '3',
              title: 'Customer Portal Configuration Guide',
              url: 'https://confluence.example.com/display/HELP/Customer+Portal+Configuration',
              space: 'HELP'
            }
          ]
        };
        setAiResults(mockResponse);
        setAiLoading(false);
      }, 2000);

    } catch (error) {
      console.error('Error querying AI:', error);
      setAiLoading(false);
    }
  };

  const handleTabChange = (index: SelectedType) => {
    setSelectedTab(index);
    setSaveMessage(null);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Spinner size="large" />
        <p style={{ marginTop: '16px', color: '#6b778c' }}>Loading settings...</p>
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '24px',
    textAlign: 'center'
  };

  const contentStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
    gap: '24px',
    alignItems: 'start'
  };

  const mainContentStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #dfe1e6',
    borderRadius: '8px',
    overflow: 'hidden'
  };

  const sidebarStyle: React.CSSProperties = {
    background: '#f8f9fa',
    border: '1px solid #dfe1e6',
    borderRadius: '8px',
    padding: '20px',
    position: 'sticky',
    top: '24px'
  };

  const getConfiguredButtonsCount = () => {
    let count = 0;
    for (let i = 1; i <= 5; i++) {
      const label = settings[`button${i}Label` as keyof SettingsData] as string;
      const url = settings[`button${i}Url` as keyof SettingsData] as string;
      if (label && url) count++;
    }
    return count;
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#172b4d',
          marginBottom: '8px'
        }}>
          Portal Settings
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b778c',
          marginBottom: '0'
        }}>
          Configure JQL queries, portal buttons, and AI integration for the customer portal
        </p>

        {saveMessage && (
          <div style={{ marginTop: '16px' }}>
            <SectionMessage
              appearance={saveMessage.type === 'success' ? 'success' : 'error'}
              title={saveMessage.type === 'success' ? 'Success' : 'Error'}
            >
              <p>{saveMessage.text}</p>
            </SectionMessage>
          </div>
        )}
      </div>

      <div style={contentStyle}>
        <div style={mainContentStyle}>
          <Tabs onChange={handleTabChange} selected={selectedTab} id="portal-settings-tabs">
            <TabList>
              <Tab>JQL Configuration</Tab>
              <Tab>Portal Buttons</Tab>
              <Tab>cAIke Integration</Tab>
            </TabList>

            {/* JQL Configuration Tab */}
            <TabPanel>
              <div style={{ padding: '24px' }}>
                <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#172b4d' }}>
                  JQL Query Configuration
                </h2>

                <SectionMessage appearance="information">
                  <p>
                    Configure the JQL query used to display requests in the customer portal.
                    The default query shows recent HELP project requests.
                  </p>
                </SectionMessage>

                <Form onSubmit={handleSubmit}>
                  {({ formProps }) => (
                    <form {...formProps}>
                      <Field
                        name="jql"
                        defaultValue={settings.jql}
                        validate={(value) => {
                          if (!value || value.trim() === '') {
                            return 'JQL query is required';
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
                              JQL Query *
                            </label>
                            <Textfield
                              {...fieldProps}
                              placeholder="e.g., project = HELP ORDER BY created DESC"
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
                              Examples: 
                              <code style={{ background: '#f4f5f7', padding: '2px 4px', borderRadius: '3px', margin: '0 4px' }}>
                                project = HELP ORDER BY created DESC
                              </code>
                              <code style={{ background: '#f4f5f7', padding: '2px 4px', borderRadius: '3px', margin: '0 4px' }}>
                                assignee = currentUser() AND status != Done
                              </code>
                            </HelperMessage>
                          </div>
                        )}
                      </Field>

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
            </TabPanel>

            {/* Portal Buttons Tab */}
            <TabPanel>
              <div style={{ padding: '24px' }}>
                <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#172b4d' }}>
                  Portal Buttons Configuration
                </h2>

                <SectionMessage appearance="information">
                  <p>
                    Configure up to 5 action buttons that will appear above the requests table in the customer portal.
                    Only buttons with both label and URL configured will be displayed.
                  </p>
                </SectionMessage>

                <Form onSubmit={handleButtonSubmit}>
                  {({ formProps }) => (
                    <form {...formProps}>
                      <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <div key={num} style={{
                            padding: '20px',
                            border: '1px solid #dfe1e6',
                            borderRadius: '6px',
                            backgroundColor: '#fafbfc'
                          }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#172b4d' }}>
                              Button {num}
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <Field
                                name={`button${num}Label`}
                                defaultValue={settings[`button${num}Label` as keyof SettingsData] as string}
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
                          </div>
                        ))}
                      </div>

                      <FormFooter>
                        <ButtonGroup>
                          <Button
                            type="submit"
                            appearance="primary"
                            isDisabled={savingButtons}
                          >
                            {savingButtons ? 'Saving...' : 'Save Button Settings'}
                          </Button>
                          <Button
                            onClick={loadSettings}
                            isDisabled={savingButtons}
                          >
                            Reset
                          </Button>
                        </ButtonGroup>
                      </FormFooter>
                    </form>
                  )}
                </Form>
              </div>
            </TabPanel>

            {/* cAIke Integration Tab */}
            <TabPanel>
              <div style={{ padding: '24px' }}>
                <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#172b4d' }}>
                  cAIke Integration
                </h2>

                <SectionMessage appearance="information">
                  <p>
                    Configure AI-powered assistance for customers. Add Confluence knowledge bases to provide intelligent responses
                    to customer questions and return relevant documentation.
                  </p>
                </SectionMessage>

                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#172b4d' }}>
                    Test AI Integration
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                         <Textfield
                       placeholder="Ask a question about request handling..."
                       value={aiQuery}
                       onChange={(e) => setAiQuery((e.target as HTMLInputElement).value)}
                       style={{ flex: 1 }}
                     />
                    <Button
                      appearance="primary"
                      onClick={handleAiQuery}
                      isDisabled={!aiQuery.trim() || aiLoading}
                    >
                      {aiLoading ? 'Searching...' : 'Ask AI'}
                    </Button>
                  </div>

                  {aiLoading && (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <Spinner size="medium" />
                      <p style={{ marginTop: '12px', color: '#6b778c' }}>
                        Searching knowledge base and generating response...
                      </p>
                    </div>
                  )}

                  {aiResults && (
                    <div style={{ marginTop: '20px' }}>
                      <div style={{
                        background: '#f4f5f7',
                        border: '1px solid #dfe1e6',
                        borderRadius: '6px',
                        padding: '16px',
                        marginBottom: '16px'
                      }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#172b4d' }}>
                          AI Response:
                        </h4>
                        <p style={{ margin: '0', color: '#172b4d', lineHeight: '1.5' }}>
                          {aiResults.response}
                        </p>
                      </div>

                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#172b4d' }}>
                        Relevant Confluence Pages:
                      </h4>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {aiResults.pages.map((page, index) => (
                          <div key={page.id} style={{
                            padding: '12px',
                            border: '1px solid #dfe1e6',
                            borderRadius: '4px',
                            backgroundColor: '#ffffff'
                          }}>
                            <div style={{ fontWeight: '600', color: '#172b4d', marginBottom: '4px' }}>
                              {page.title}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b778c' }}>
                              Space: {page.space} • 
                              <a href={page.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0052cc', marginLeft: '4px' }}>
                                View Page
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabPanel>
          </Tabs>
        </div>

        {/* Configuration Summary Sidebar */}
        <div style={sidebarStyle}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#172b4d' }}>
            Configuration Summary
          </h3>
          
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#5e6c84' }}>
              JQL Configuration
            </h4>
            <div style={{ fontSize: '12px', color: '#6b778c', marginBottom: '8px' }}>
              <strong>Active Query:</strong>
            </div>
            <code style={{
              display: 'block',
              padding: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #dfe1e6',
              borderRadius: '4px',
              fontSize: '11px',
              wordBreak: 'break-all',
              lineHeight: '1.4'
            }}>
              {settings.jql || settings.defaultJql}
            </code>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#5e6c84' }}>
              Portal Buttons
            </h4>
            <div style={{ fontSize: '12px', color: '#6b778c', marginBottom: '8px' }}>
              <strong>Configured:</strong> {getConfiguredButtonsCount()} of 5
            </div>
            {getConfiguredButtonsCount() > 0 && (
              <div style={{ display: 'grid', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map((num) => {
                  const label = settings[`button${num}Label` as keyof SettingsData] as string;
                  const url = settings[`button${num}Url` as keyof SettingsData] as string;
                  if (label && url) {
                    return (
                      <div key={num} style={{
                        padding: '6px 8px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #dfe1e6',
                        borderRadius: '3px',
                        fontSize: '11px'
                      }}>
                        <div style={{ fontWeight: '600', color: '#172b4d' }}>{label}</div>
                        <div style={{ color: '#6b778c', wordBreak: 'break-all' }}>
                          {url.length > 30 ? `${url.substring(0, 30)}...` : url}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#5e6c84' }}>
              cAIke Integration
            </h4>
            <div style={{ fontSize: '12px', color: '#6b778c' }}>
              <strong>Status:</strong> Ready for testing
            </div>
            <div style={{ fontSize: '12px', color: '#6b778c', marginTop: '4px' }}>
              <strong>Knowledge Bases:</strong> HELP Space
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WMPRSettings;