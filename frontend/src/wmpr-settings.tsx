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
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: string;
}

const WMPRSettings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    projectKey: 'global',
    jql: '',
    useCustomJql: false,
    defaultJql: 'project = WMPR ORDER BY created DESC'
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
      const response = await fetch(`${getBaseUrl()}/rest/wmpr-requests/1.0/settings`, {
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
        projectKey: settings.projectKey,
        jql: data.jql,
        useCustomJql: data.useCustomJql
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
        throw new Error(`Failed to save settings: ${response.status}`);
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
      </div>
    </div>
  );
};

export default WMPRSettings; 