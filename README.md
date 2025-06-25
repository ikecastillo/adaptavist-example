# Jira Data Center Plugin - Custom Field Examples

This plugin provides working examples of custom fields for Jira Data Center using React and Atlaskit components.

## Features

### Original Features
- **SR Vendors API Example**: Custom field with vendors API integration
- **SR Vendors API Select Example**: Custom field with select dropdown for vendors

### New WMPR Requests Features ✨

#### 1. REST API Endpoints
- **GET** `/rest/wmpr-requests/1.0/recent` - Fetch recent WMPR requests
- **GET** `/rest/wmpr-requests/1.0/settings` - Get JQL configuration settings  
- **POST** `/rest/wmpr-requests/1.0/settings` - Save JQL configuration settings
- **POST** `/rest/wmpr-requests/1.0/settings/validate-jql` - Validate JQL queries

#### 2. Service Desk Portal Footer Table
- Displays recent WMPR requests in the Service Desk portal footer
- Beautiful responsive table using Atlaskit DynamicTable
- Status indicators with color-coded lozenges
- Clickable issue links that open in new tabs
- Loading states and error handling
- Automatically refreshes based on configured JQL

#### 3. Admin Settings Page
- **Location**: Administration → User Interface → WMPR Requests
- **Features**:
  - Configure custom JQL queries for WMPR requests display
  - Real-time JQL validation with error feedback
  - Toggle between default and custom JQL
  - Modern Atlaskit form components
  - Save/Reset functionality
  - Configuration preview

## Building the Plugin

### Prerequisites
- Java 8 or higher
- Maven 3.6+
- Node.js 14+ and npm
- Atlassian SDK

### Build Steps

1. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Build frontend assets**:
   ```bash
   npm run build
   ```

3. **Package the plugin**:
   ```bash
   cd ../backend
   atlas-package
   ```

## Installation

1. Build the plugin using the steps above
2. Upload the generated JAR file (`backend/target/*.jar`) to your Jira instance
3. Enable the plugin in the Plugin Manager

## Configuration

### Setting up WMPR Requests

1. **Access Settings**: Go to Administration → User Interface → WMPR Requests
2. **Configure JQL**: 
   - Check "Use Custom JQL" to enable custom queries
   - Enter your JQL (e.g., `project = WMPR ORDER BY created DESC`)
   - The system will validate your JQL in real-time
3. **Save Settings**: Click "Save Settings" to apply your configuration

### Default Configuration
- **Default JQL**: `project = WMPR ORDER BY created DESC`
- **Table Location**: Service Desk portal footer
- **Display Limit**: 10 most recent issues

## Technical Details

### Architecture
- **Backend**: Java REST resources with JAX-RS
- **Frontend**: React 16.14 with TypeScript
- **UI Components**: Atlaskit design system
- **Build System**: Webpack 5 with Babel
- **Settings Storage**: Jira Plugin Settings API

### REST API Examples

**Get recent requests**:
```bash
curl -X GET "http://your-jira/rest/wmpr-requests/1.0/recent" \
  -H "Accept: application/json"
```

**Save settings**:
```bash
curl -X POST "http://your-jira/rest/wmpr-requests/1.0/settings" \
  -H "Content-Type: application/json" \
  -d '{"jql":"project = WMPR ORDER BY updated DESC","useCustomJql":true}'
```

### File Structure
```
├── backend/
│   ├── src/main/java/com/scriptrunnerhq/
│   │   ├── rest/
│   │   │   ├── WMPRRequestsRestResource.java
│   │   │   └── WMPRSettingsRestResource.java
│   │   ├── servlet/
│   │   │   └── WMPRSettingsServlet.java
│   │   └── model/
│   │       └── ServiceDeskRequest.java
│   └── src/main/resources/
│       ├── templates/
│       │   ├── wmpr-settings.vm
│       │   └── wmpr-portal-footer.vm
│       └── css/
│           └── wmpr-portal-footer.css
└── frontend/
    └── src/
        ├── wmpr-portal-footer.tsx
        ├── wmpr-portal-footer-integration.tsx
        ├── wmpr-settings.tsx
        └── wmpr-settings-integration.tsx
```

## Troubleshooting

### Common Issues

1. **React Error #299**: Fixed by using proper React 16 API (`ReactDOM.render`)
2. **CSS Loading Errors**: Fixed by adding CSS loaders to webpack config
3. **JQL Validation Fails**: Ensure JQL syntax is correct and user has proper permissions
4. **Table Not Displaying**: Check Service Desk portal footer visibility and plugin enablement

### Debug Information
- REST API responses include diagnostic information
- Check browser console for component mounting logs
- Verify plugin is enabled in Administration → Plugin Manager

## Development

### Hot Reloading
```bash
cd frontend
npm run start  # For React development
```

### Adding New Features
1. Create REST endpoints in `backend/src/main/java/com/scriptrunnerhq/rest/`
2. Add React components in `frontend/src/`
3. Update `webpack.config.js` entry points
4. Configure in `atlassian-plugin.xml`

## License

This project is licensed under the terms specified in the LICENSE file.
