import React, { useEffect, useState } from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import Form, { Field, FormFooter, HelperMessage, ErrorMessage } from '@atlaskit/form';
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import { type SelectedType } from '@atlaskit/tabs/types';
import Select from '@atlaskit/select';
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

interface ConfluenceSpaceOption {
  value: string;
  label: string;
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
  const [savingConfluence, setSavingConfluence] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [confluenceSpaces, setConfluenceSpaces] = useState<ConfluenceSpaceOption[]>([]);
  const [loadingConfluenceSpaces, setLoadingConfluenceSpaces] = useState<boolean>(false);

  useEffect(() => {
    loadSettings();
    loadConfluenceSpaces();
  }, []);

  const loadSettings = async () => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/rest/wmpr-requests/1.0/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings({
          jql: data.jql || '',
          defaultJql: data.defaultJql || 'project = HELP ORDER BY created DESC',
          button1Label: data.button1Label || '',
          button1Url: data.button1Url || '',
          button2Label: data.button2Label || '',
          button2Url: data.button2Url || '',
          button3Label: data.button3Label || '',
          button3Url: data.button3Url || '',
          button4Label: data.button4Label || '',
          button4Url: data.button4Url || '',
          button5Label: data.button5Label || '',
          button5Url: data.button5Url || '',
          confluenceSpaces: data.confluenceSpaces || []
        });
      } else {
        console.error('Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConfluenceSpaces = async () => {
    try {
      setLoadingConfluenceSpaces(true);
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/rest/wmpr-requests/1.0/settings/confluence-spaces`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfluenceSpaces(data.spaces || []);
      } else {
        console.error('Failed to load Confluence spaces');
      }
    } catch (error) {
      console.error('Error loading Confluence spaces:', error);
    } finally {
      setLoadingConfluenceSpaces(false);
    }
  };

  const validateJql = async (jql: string) => {
    if (!jql.trim()) {
      setValidationResult({ valid: false, message: 'JQL cannot be empty' });
      return;
    }

    try {
      setValidating(true);
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/rest/wmpr-requests/1.0/settings/validate-jql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jql }),
      });

      const result = await response.json();
      setValidationResult(result);
    } catch (error) {
      console.error('Error validating JQL:', error);
      setValidationResult({ valid: false, message: 'Failed to validate JQL' });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      setSaving(true);
      setSaveMessage(null);

      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/rest/wmpr-requests/1.0/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jql: data.jql,
          confluenceSpaces: settings.confluenceSpaces
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSaveMessage({ type: 'success', text: result.message || 'Settings saved successfully' });
        await loadSettings();
      } else {
        const error = await response.json();
        setSaveMessage({ type: 'error', text: error.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleButtonSubmit = async (data: any) => {
    try {
      setSavingButtons(true);
      setSaveMessage(null);

      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/rest/wmpr-requests/1.0/settings/buttons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        setSaveMessage({ type: 'success', text: result.message || 'Button settings saved successfully' });
        await loadSettings();
      } else {
        const error = await response.json();
        setSaveMessage({ type: 'error', text: error.error || 'Failed to save button settings' });
      }
    } catch (error) {
      console.error('Error saving button settings:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save button settings' });
    } finally {
      setSavingButtons(false);
    }
  };

  const handleConfluenceSubmit = async (data: any) => {
    try {
      setSavingConfluence(true);
      setSaveMessage(null);

      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/rest/wmpr-requests/1.0/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jql: settings.jql,
          confluenceSpaces: data.confluenceSpaces
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSaveMessage({ type: 'success', text: result.message || 'Confluence settings saved successfully' });
        await loadSettings();
      } else {
        const error = await response.json();
        setSaveMessage({ type: 'error', text: error.error || 'Failed to save Confluence settings' });
      }
    } catch (error) {
      console.error('Error saving Confluence settings:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save Confluence settings' });
    } finally {
      setSavingConfluence(false);
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
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '24px',
  };

  const contentStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 450px',
    gap: '24px',
    alignItems: 'start'
  };

  const mainContentStyle: React.CSSProperties = {
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
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600', color: '#172b4d' }}>
            WMPR Requests Settings
          </h1>
          <p style={{ margin: '0', fontSize: '16px', color: '#6b778c', lineHeight: '1.5' }}>
            Configure JQL queries, portal buttons, and Confluence knowledge bases for WMPR request display.
          </p>
        </div>

        {saveMessage && (
            <div style={{ marginBottom: '16px' }}>
              <SectionMessage appearance={saveMessage.type}>
                <p>{saveMessage.text}</p>
              </SectionMessage>
            </div>
        )}

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
                <div style={{ padding: '12px', paddingLeft: '0px' }}>
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
                              defaultValue={settings.jql || settings.defaultJql}
                              label="JQL Query"
                              isRequired
                          >
                            {({ fieldProps, error }) => (
                                <div>
                                  <Textfield
                                      {...fieldProps}
                                      placeholder="Enter JQL query (e.g., project = HELP ORDER BY created DESC)"
                                      onChange={(e) => {
                                        const value = (e.target as HTMLInputElement).value;
                                        fieldProps.onChange(e);
                                        if (value.trim()) {
                                          validateJql(value);
                                        } else {
                                          setValidationResult(null);
                                        }
                                      }}
                                  />
                                  {error && <ErrorMessage>{error}</ErrorMessage>}
                                  {validationResult && (
                                      <div style={{ marginTop: '8px' }}>
                                        {validationResult.valid ? (
                                            <HelperMessage>
                                              ✓ {validationResult.message || 'JQL is valid'}
                                            </HelperMessage>
                                        ) : (
                                            <ErrorMessage>
                                              ✗ {validationResult.message || validationResult.errors || 'Invalid JQL'}
                                            </ErrorMessage>
                                        )}
                                      </div>
                                  )}
                                  {validating && (
                                      <div style={{ marginTop: '8px' }}>
                                        <Spinner size="small" />
                                        <span style={{ marginLeft: '8px', color: '#6b778c' }}>Validating JQL...</span>
                                      </div>
                                  )}
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
                <div style={{ padding: '12px', paddingLeft: '0px' }}>
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
                                          <Textfield
                                              {...fieldProps}
                                              placeholder="Button Label"
                                          />
                                      )}
                                    </Field>
                                    <Field
                                        name={`button${num}Url`}
                                        defaultValue={settings[`button${num}Url` as keyof SettingsData] as string}
                                    >
                                      {({ fieldProps }) => (
                                          <Textfield
                                              {...fieldProps}
                                              placeholder="Button URL"
                                          />
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
                <div style={{ padding: '12px', paddingLeft: '0px' }}>
                  <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#172b4d' }}>
                    cAIke Integration
                  </h2>

                  <SectionMessage appearance="information">
                    <p>
                      Configure AI-powered assistance for customers. Select Confluence knowledge bases to provide intelligent responses
                      to customer questions and return relevant documentation.
                    </p>
                  </SectionMessage>

                  <div style={{ marginTop: '20px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#172b4d' }}>
                      Confluence Space Keys
                    </h3>
                    <p style={{ margin: '0 0 16px 0', color: '#6b778c', fontSize: '14px' }}>
                      Select the Confluence spaces that will be used as knowledge bases for AI-powered customer assistance.
                      Only spaces you have access to will be displayed.
                    </p>

                    {loadingConfluenceSpaces ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                          <Spinner size="medium" />
                          <p style={{ marginTop: '12px', color: '#6b778c' }}>
                            Loading available Confluence spaces...
                          </p>
                        </div>
                    ) : (
                        <Form onSubmit={handleConfluenceSubmit}>
                            {({ formProps }) => (
                                <form {...formProps}>
                                  <Field
                                      name="confluenceSpaces"
                                      label="Select Confluence Spaces"
                                      defaultValue={settings.confluenceSpaces}
                                  >
                                    {({ fieldProps, error }) => (
                                        <div>
                                          <Select
                                              inputId="confluence-spaces-select"
                                              testId="confluence-spaces-select"
                                              options={confluenceSpaces}
                                              placeholder="Choose Confluence spaces"
                                              isMulti
                                              isSearchable
                                              isClearable
                                              value={Array.isArray(fieldProps.value) ? fieldProps.value.map((space: string) => confluenceSpaces.find(opt => opt.value === space) || { value: space, label: space }) : []}
                                              onChange={(newValue) => {
                                                const selectedValues = Array.isArray(newValue) ? newValue.map(item => item.value) : [];
                                                fieldProps.onChange(selectedValues);
                                              }}
                                          />
                                          {error && <ErrorMessage>{error}</ErrorMessage>}
                                          <HelperMessage>
                                            Selected spaces will be used as knowledge bases for AI responses in the customer portal.
                                          </HelperMessage>
                                        </div>
                                    )}
                                  </Field>

                                  <FormFooter>
                                    <ButtonGroup>
                                      <Button
                                          type="submit"
                                          appearance="primary"
                                          isDisabled={savingConfluence}
                                      >
                                        {savingConfluence ? 'Saving...' : 'Save Confluence Settings'}
                                      </Button>
                                      <Button
                                          onClick={loadSettings}
                                          isDisabled={savingConfluence}
                                      >
                                        Reset
                                      </Button>
                                    </ButtonGroup>
                                  </FormFooter>
                                </form>
                            )}
                        </Form>
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
                <strong>Status:</strong> {settings.confluenceSpaces.length > 0 ? 'Configured' : 'Not configured'}
              </div>
              <div style={{ fontSize: '12px', color: '#6b778c', marginTop: '4px' }}>
                <strong>Knowledge Bases:</strong> {settings.confluenceSpaces.length > 0 ? settings.confluenceSpaces.join(', ') : 'None selected'}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default WMPRSettings;
