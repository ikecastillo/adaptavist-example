import React, { useEffect, useState } from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import Form, { Field, FormFooter, HelperMessage, ErrorMessage } from '@atlaskit/form';
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import { getBaseUrl } from './utils/projectKey';

interface SettingsData {
  jql: string;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: string;
}

const WMPRSettings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    jql: ''
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

      console.log('Saving settings:', payload);

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

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Spinner size="large" />
        <p style={{ marginTop: '16px', color: '#6b778c' }}>Loading settings...</p>
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '32px'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '16px',
    background: '#0052cc',
    color: '#ffffff',
    padding: '16px 24px',
    borderRadius: '8px 8px 0 0',
    margin: '-24px -24px 24px -24px'
  };

  return (
    <div style={containerStyle}>
      <div style={sectionStyle}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#172b4d',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          Portal Settings
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b778c',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          Configure the JQL query used to display requests in the customer portal
        </p>

        {saveMessage && (
          <SectionMessage
            appearance={saveMessage.type === 'success' ? 'success' : 'error'}
            title={saveMessage.type === 'success' ? 'Success' : 'Error'}
          >
            <p>{saveMessage.text}</p>
          </SectionMessage>
        )}

        <div style={{
          background: '#ffffff',
          border: '1px solid #dfe1e6',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={sectionTitleStyle}>
            JQL Query Configuration
          </h2>

          <SectionMessage appearance="information">
            <p>
              Enter a JQL query to control which requests appear in the customer portal.
              The query will be executed when customers view the portal.
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
                      {saving ? 'Saving...' : 'Save Settings'}
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
    </div>
  );
};

export default WMPRSettings;