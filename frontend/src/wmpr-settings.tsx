import React, { useEffect, useState } from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import Form, { Field, FormFooter, HelperMessage, ErrorMessage } from '@atlaskit/form';
import Checkbox from '@atlaskit/checkbox';
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';

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

  useEffect(() => {
    loadSettings();
  }, []);

  const getBaseUrl = () => {
    const baseUrl = (window as any).location.origin;
    const contextPath = (window as any).AJS?.contextPath() || '';
    return `${baseUrl}${contextPath}`;
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Include projectKey parameter in the API call
      const url = new URL(`${getBaseUrl()}/rest/wmpr-requests/1.0/settings`);
      if (projectKey && projectKey !== 'global') {
        url.searchParams.append('projectKey', projectKey);
      }
      
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
      const response = await fetch(`${getBaseUrl()}/rest/wmpr-requests/1.0/settings/validate-jql`, {
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

      const response = await fetch(`${getBaseUrl()}/rest/wmpr-requests/1.0/settings`, {
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

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Spinner size="large" />
        <p style={{ marginTop: '16px' }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ marginBottom: '24px', color: '#172b4d' }}>WMPR Requests Settings</h1>
      
      <SectionMessage appearance="info">
        <p>
          Configure the JQL query used to fetch WMPR requests for display in the Service Desk portal footer.
          Leave "Use Custom JQL" unchecked to use the default query.
        </p>
      </SectionMessage>

      {saveMessage && (
        <SectionMessage appearance={saveMessage.type === 'success' ? 'confirmation' : 'error'}>
          <p>{saveMessage.text}</p>
        </SectionMessage>
      )}

      <Form onSubmit={handleSubmit}>
        {({ formProps }) => (
          <form {...formProps}>
            <Field
              name="useCustomJql"
              defaultValue={settings.useCustomJql}
            >
              {({ fieldProps }) => (
                <Checkbox
                  {...fieldProps}
                  label="Use Custom JQL"
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
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    JQL Query
                  </label>
                  <Textfield
                    {...fieldProps}
                    placeholder={settings.defaultJql}
                    onBlur={(e) => {
                      fieldProps.onBlur(e);
                      if (e.target.value && e.target.value.trim() !== '') {
                        validateJql(e.target.value);
                      } else {
                        setValidationResult(null);
                      }
                    }}
                  />
                  {error && <ErrorMessage>{error}</ErrorMessage>}
                  
                  {validating && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center' }}>
                      <Spinner size="small" />
                      <span style={{ marginLeft: '8px', color: '#5e6c84' }}>Validating JQL...</span>
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
                    Default JQL: <code>{settings.defaultJql}</code>
                  </HelperMessage>
                </div>
              )}
            </Field>

            <div style={{ marginTop: '32px' }}>
              <h3 style={{ marginBottom: '16px', color: '#172b4d' }}>Service Desk Footer Buttons</h3>
              <SectionMessage appearance="info">
                <p>
                  Configure up to 5 buttons to display above the WMPR requests table. 
                  Only buttons with both label and URL filled will be shown.
                </p>
              </SectionMessage>
              
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} style={{ 
                  marginTop: '16px', 
                  padding: '16px', 
                  border: '1px solid #dfe1e6', 
                  borderRadius: '3px',
                  backgroundColor: '#fafbfc'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#172b4d' }}>
                    Button {num}
                  </h4>
                  
                  <Field
                    name={`button${num}Label`}
                    defaultValue={settings[`button${num}Label` as keyof SettingsData] as string}
                  >
                    {({ fieldProps }) => (
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          Button Label
                        </label>
                        <Textfield
                          {...fieldProps}
                          placeholder={`Button ${num} Label`}
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
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          Button URL
                        </label>
                        <Textfield
                          {...fieldProps}
                          placeholder={`https://example.com`}
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
                  isLoading={saving}
                >
                  Save Settings
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

      <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#f4f5f7', borderRadius: '3px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>Current Configuration</h3>
        <p style={{ margin: '4px 0' }}><strong>Project:</strong> {settings.projectKey}</p>
        <p style={{ margin: '4px 0' }}><strong>Use Custom JQL:</strong> {settings.useCustomJql ? 'Yes' : 'No'}</p>
        <p style={{ margin: '4px 0' }}><strong>Active JQL:</strong></p>
        <code style={{ 
          display: 'block', 
          padding: '8px', 
          backgroundColor: '#fff', 
          border: '1px solid #dfe1e6', 
          borderRadius: '3px',
          fontSize: '12px',
          marginTop: '4px'
        }}>
          {settings.useCustomJql && settings.jql ? settings.jql : settings.defaultJql}
        </code>
        
        <h4 style={{ margin: '16px 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Configured Buttons:</h4>
        {[1, 2, 3, 4, 5].map((num) => {
          const label = settings[`button${num}Label` as keyof SettingsData] as string;
          const url = settings[`button${num}Url` as keyof SettingsData] as string;
          return (
            <div key={num} style={{ margin: '4px 0', fontSize: '12px' }}>
              <strong>Button {num}:</strong> {
                label && url 
                  ? `"${label}" → ${url}` 
                  : <span style={{ color: '#6B778C' }}>Not configured</span>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WMPRSettings; 