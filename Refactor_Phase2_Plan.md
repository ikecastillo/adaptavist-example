# Phase 2 Refactor & Feature Roadmap

This document captures the **next-phase refactor plan** for removing WMPR-specific hard-coding, cleaning up console output, and expanding the settings UI so the add-on can replace the Refined for JSM *Data-Center* macro.

---

## 1️⃣  Make the add-on Project-Aware

### 1.1 High-level goal
Today the codebase targets a **single Service Desk project (`WMPR`)**. We will shift to a *project-aware* model so the same artefacts can be reused in any project without recompilation.

### 1.2 Detection strategy (Frontend)

| Source | How to read it | Fallback |
|--------|----------------|---------|
| `AJS.Meta.get('project-key')` | Works on most Jira DC pages. | – |
| URL pattern | `window.location.pathname.match(/\/projects\/([A-Z][A-Z0-9]+)|service[d]?esk\/customer\/portal\/(\d+)/)` → lookup project key / portal → REST `/rest/api/2/servicedesk/{id}` | – |
| Global JS object | If your site injects `window.projectKey` (e.g. via soy/vm template). | – |
| Manual select | If detection fails show a *one-time modal* asking the admin to choose a project; persist in SAL PluginSettings. | `global` settings bucket |

After detection, **store the key in React context** so every component (footer, settings, analytics) can access it.

```ts
// utils/projectKey.ts
export const detectProjectKey = (): string | null => {
  const meta = (window as any).AJS?.Meta?.get('project-key');
  if (meta) return meta;
  const m = window.location.pathname.match(/\/projects\/([A-Z][A-Z0-9]+)/);
  if (m) return m[1];
  // … more heuristics …
  return null;
};
```

### 1.3 Backend contract changes

* **REST** `/rest/wmpr-requests/1.0/recent?projectKey=ABC` – keep param but rename to `/recent` under neutral namespace (e.g. `/rest/portal-footer/1.0/recent`).
* If `projectKey` is omitted, obtain it server-side via
  * `jiraHelper.getProject()` inside a servlet; or
  * parse the *Referer* header; or
  * fall back to `global` settings bucket.
* Replace constants:
  * `DEFAULT_JQL` ⇒ `project = %s ORDER BY created DESC`
  * fallback JQL uses detected key instead of `WMPR`.

### 1.4 Plugin settings schema
```jsonc
{
  "<projectKey>": {
    "useCustomJql": true,
    "jql": "project = <projectKey> AND statusCategory != Done ORDER BY created DESC",
    "buttons": [
      { "label": "Create Request", "url": "/servicedesk/customer/portal/<portalId>/<requestType>" }
    ]
  },
  "global": { …defaults… }
}
```

### 1.5 Refactor checklist
1. **Rename packages & classes**: `WMPRRequestsRestResource` → `PortalRequestsRestResource`, etc.
2. Replace all literal `WMPR` strings with `${projectKey}` interpolation.
3. Expose utility `ProjectContext.getCurrentKey()` in backend and frontend.
4. Update unit tests & post-function examples.

---

## 2️⃣  Remove ad-hoc `console.log` statements

| Layer | Current | Replacement |
|-------|---------|-------------|
| Backend Java | `System.out.println` | `log.debug` / SLF4J (auto-visible in *atlassian-jira.log* when DEBUG is on) |
| Frontend React | `console.log` | 1. Use a tiny logger (`loglevel`, `debug`) <br/>2. Strip in production build via Babel `transform-remove-console` or Terser `drop_console:true`.|

Implementation tips:
* Create `logger.ts` that proxies to `console.*` only when `process.env.NODE_ENV !== 'production'`.
* Enable SLF4J `@Slf4j` in Java classes to streamline logging.

---

## 3️⃣  Populate empty Settings tabs
Your aim is to **supplant Refined** by offering rich project-level configuration. Below are concrete feature ideas per tab.

### 3.1 📊 Reports & Analytics
* **KPIs dashboard** – total requests, open vs closed, SLA compliance, mean time to resolution.
* **Interactive filters** – by date range, request type, status.
* **Trend charts** – line/area charts for volume; heatmap for peak hours.
* **Button click analytics** – measure usage of portal shortcuts; surface top actions.
* **Export** – CSV & PDF export, plus scheduled email reports.

### 3.2 ⚙️ Advanced Settings
* **Cache control** – TTL for REST responses; toggle server-side caching.
* **Permission mapping** – restrict visibility by group/role.
* **Custom field mapping** – choose which Jira fields are shown in footer table.
* **Theming hooks** – custom CSS/LESS or Atlaskit theme tokens.
* **Rate limiting** – throttle expensive queries in high-load environments.
* **Webhooks** – push events to external systems when a request is created or transitions.
* **Import/Export configuration** – JSON blob download & upload so admins can migrate settings.

### 3.3 📚 Help & Documentation
* **Inline walkthrough** – step-by-step wizard triggered on first visit.
* **Tooltip overlays** – Atlaskit Tooltip on every input explaining purpose.
* **Contextual links** – jump to Atlassian docs, company KB, or demo video.
* **Self-check diagnostics** – run connectivity and permission checks and display results.

---

## 4️⃣  Miscellaneous Roadmap Items
1. **Internationalisation (i18n)** – extract UI strings to properties files.
2. **Accessibility** – audit with Axe, ensure WCAG 2.1 AA compliance.
3. **E2E tests** – Cypress tests for footer rendering and settings save flow.
4. **Performance** – lazy-load React chunks only when settings dialog is opened.
5. **CI/CD** – move to Atlassian Forge or automated AMPS build pipeline.

---

## 5️⃣  Next Steps
1. **Create `project-context` utility** in both JVM and TS code.
2. **Rename artefacts** from `wmpr-*` to generic names.
3. **Apply logger changes** and run Maven + Webpack build with `NODE_ENV=production` to verify that console statements are stripped.
4. Increment version → `2.0.0-alpha`.

> With these changes the plugin will adapt to any Service Desk project, ship cleaner logs, and offer a richer admin UI—laying the groundwork to fully retire Refined on your JSM DC instance. 