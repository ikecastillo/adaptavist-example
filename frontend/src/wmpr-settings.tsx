import React, { useEffect, useState, ChangeEvent } from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import Form, { Field, FormFooter, HelperMessage, ErrorMessage } from '@atlaskit/form';
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import { getBaseUrl } from './utils/projectKey';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import EmptyState from '@atlaskit/empty-state';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import AddIcon from '@atlaskit/icon/glyph/add';
import TextField from '@atlaskit/textfield';
import { Grid, GridColumn } from '@atlaskit/page';

interface ButtonConfig {
  label: string;
  url: string;
}

interface SettingsData {
  jql: string;
  buttons: ButtonConfig[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const WMPRSettings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    jql: '',
    buttons: []
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedTab, setSelectedTab] = useState<number>(0);

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

  const handleSubmit = async (data: any) => {
    try {
      setSaving(true);
      setSaveMessage(null);

      const payload = {
        jql: data.jql,
        buttons: settings.buttons
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

  const handleAddButton = () => {
    setSettings(prev => ({
      ...prev,
      buttons: [...prev.buttons, { label: '', url: '' }]
    }));
  };

  const handleRemoveButton = (index: number) => {
    setSettings(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  const handleButtonChange = (index: number, field: keyof ButtonConfig, value: string) => {
    setSettings(prev => ({
      ...prev,
      buttons: prev.buttons.map((button, i) => 
        i === index ? { ...button, [field]: value } : button
      )
    }));
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Spinner size="large" />
        <p style={{ marginTop: '16px', color: '#6b778c' }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {saveMessage && (
        <div style={{ marginBottom: '24px' }}>
          <SectionMessage
            appearance={saveMessage.type === 'success' ? 'success' : 'error'}
            title={saveMessage.type === 'success' ? 'Success' : 'Error'}
          >
            <p>{saveMessage.text}</p>
          </SectionMessage>
        </div>
      )}

      <Tabs
        selected={selectedTab}
        onChange={index => setSelectedTab(index)}
        id="settings-tabs"
      >
        <TabList>
          <Tab>JQL Configuration</Tab>
          <Tab>Portal Buttons</Tab>
          <Tab>cAIke Integration</Tab>
        </TabList>

        <TabPanel>
          <Grid layout="fluid">
            <GridColumn medium={8}>
              <div style={{
                background: '#ffffff',
                border: '1px solid #dfe1e6',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <Form onSubmit={handleSubmit}>
                  {({ formProps }) => (
                    <form {...formProps}>
                      <Field
                        name="jql"
                        defaultValue={settings.jql}
                        label="JQL Query"
                        validate={(value) => {
                          if (!value || value.trim() === '') {
                            return 'JQL query is required';
                          }
                          return undefined;
                        }}
                      >
                        {({ fieldProps, error }) => (
                          <div style={{ marginBottom: '16px' }}>
                            <Textfield
                              {...fieldProps}
                              placeholder="Enter JQL query"
                            />
                            {error && <ErrorMessage>{error}</ErrorMessage>}
                            <HelperMessage>
                              Default query: project = WMPR ORDER BY created DESC
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
            </GridColumn>

            <GridColumn medium={4}>
              <div style={{
                background: '#ffffff',
                border: '1px solid #dfe1e6',
                borderRadius: '8px',
                padding: '24px'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Current Configuration</h3>
                <div style={{ marginBottom: '16px' }}>
                  <strong>JQL Query:</strong>
                  <pre style={{ 
                    background: '#f4f5f7',
                    padding: '8px',
                    borderRadius: '4px',
                    overflowX: 'auto',
                    margin: '8px 0'
                  }}>
                    {settings.jql || 'Default query will be used'}
                  </pre>
                </div>
                <div>
                  <strong>Active Buttons:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    {settings.buttons.length > 0 ? (
                      settings.buttons.map((button, index) => (
                        <li key={index}>{button.label}</li>
                      ))
                    ) : (
                      <li>No custom buttons configured</li>
                    )}
                  </ul>
                </div>
              </div>
            </GridColumn>
          </Grid>
        </TabPanel>

        <TabPanel>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dfe1e6',
            borderRadius: '8px',
            padding: '24px'
          }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Portal Action Buttons</h3>
              <Button
                appearance="primary"
                iconBefore={<AddIcon label="" />}
                onClick={handleAddButton}
                isDisabled={settings.buttons.length >= 5}
              >
                Add Button
              </Button>
            </div>

            {settings.buttons.length === 0 ? (
              <EmptyState
                header="No Buttons Configured"
                description="Add custom action buttons that will appear above the requests table in the portal."
                primaryAction={
                  <Button
                    appearance="primary"
                    onClick={handleAddButton}
                  >
                    Add First Button
                  </Button>
                }
              />
            ) : (
              <div>
                {settings.buttons.map((button, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '16px',
                    padding: '16px',
                    border: '1px solid #dfe1e6',
                    borderRadius: '4px'
                  }}>
                    <TextField
                      value={button.label}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleButtonChange(index, 'label', e.target.value)}
                      placeholder="Button Label"
                      style={{ flex: 1 }}
                    />
                    <TextField
                      value={button.url}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleButtonChange(index, 'url', e.target.value)}
                      placeholder="Button URL"
                      style={{ flex: 2 }}
                    />
                    <Button
                      appearance="subtle"
                      iconBefore={<TrashIcon label="Remove" />}
                      onClick={() => handleRemoveButton(index)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dfe1e6',
            borderRadius: '8px',
            padding: '24px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>cAIke Integration Settings</h3>
            <SectionMessage
              appearance="warning"
              title="Configure AI-Powered Support"
            >
              <p>Connect your Confluence knowledge bases to enable AI-powered responses for customer inquiries.</p>
            </SectionMessage>

            <div style={{ marginTop: '24px' }}>
              <Field
                label="Confluence Space Keys"
                name="confluenceSpaces"
                defaultValue=""
              >
                {({ fieldProps }) => (
                  <Textfield
                    {...fieldProps}
                    placeholder="Enter comma-separated Confluence space keys (e.g., SUPPORT,KB,DOCS)"
                  />
                )}
              </Field>
              <HelperMessage>
                Add the space keys of Confluence spaces containing your support documentation.
              </HelperMessage>
            </div>

            <div style={{ marginTop: '24px' }}>
              <Field
                label="AI Response Template"
                name="aiTemplate"
                defaultValue=""
              >
                {({ fieldProps }) => (
                  <Textfield
                    {...fieldProps}
                    placeholder="Enter a template for AI responses"
                    rows={3}
                  />
                )}
              </Field>
              <HelperMessage>
                Customize how the AI presents information from your knowledge base.
              </HelperMessage>
            </div>

            <FormFooter>
              <Button appearance="primary" isDisabled>
                Save Integration Settings
              </Button>
              <HelperMessage>
                Coming soon: AI-powered customer support integration
              </HelperMessage>
            </FormFooter>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default WMPRSettings;