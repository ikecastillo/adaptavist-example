package com.scriptrunnerhq.servlet;

import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.project.Project;
import com.atlassian.jira.project.ProjectManager;
import com.atlassian.jira.security.PermissionManager;
import com.atlassian.jira.security.Permissions;
import com.atlassian.jira.user.ApplicationUser;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.atlassian.sal.api.auth.LoginUriProvider;
import com.atlassian.sal.api.user.UserManager;
import com.atlassian.sal.api.user.UserProfile;
import com.atlassian.templaterenderer.TemplateRenderer;

import javax.inject.Inject;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;

public class WMPRSettingsServlet extends HttpServlet {

    @ComponentImport
    private final UserManager userManager;

    @ComponentImport
    private final LoginUriProvider loginUriProvider;

    @ComponentImport
    private final TemplateRenderer templateRenderer;

    @Inject
    public WMPRSettingsServlet(UserManager userManager, LoginUriProvider loginUriProvider, TemplateRenderer templateRenderer) {
        this.userManager = userManager;
        this.loginUriProvider = loginUriProvider;
        this.templateRenderer = templateRenderer;
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        UserProfile user = userManager.getRemoteUser(request);
        
        if (user == null) {
            redirectToLogin(request, response);
            return;
        }

        // Get project key from request parameter
        String projectKey = request.getParameter("projectKey");
        if (projectKey == null || projectKey.trim().isEmpty()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Project key is required");
            return;
        }

        // Get Jira components
        ProjectManager projectManager = ComponentAccessor.getProjectManager();
        PermissionManager permissionManager = ComponentAccessor.getPermissionManager();
        
        // Get project
        Project project = projectManager.getProjectByCurrentKey(projectKey);
        if (project == null) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "Project not found: " + projectKey);
            return;
        }

        // Get Jira user
        ApplicationUser jiraUser = ComponentAccessor.getUserManager().getUserByKey(user.getUserKey().getStringValue());
        if (jiraUser == null) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "User not found");
            return;
        }

        // Check if user has project admin permissions
        if (!permissionManager.hasPermission(Permissions.PROJECT_ADMIN, project, jiraUser)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access denied. Project administrator privileges required.");
            return;
        }

        response.setContentType("text/html;charset=utf-8");
        
        // Generate HTML directly like your working example
        String html = generateProjectSettingsHtml(projectKey, project.getName());
        response.getWriter().write(html);
    }

    private void redirectToLogin(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.sendRedirect(loginUriProvider.getLoginUri(getUri(request)).toASCIIString());
    }

    private URI getUri(HttpServletRequest request) {
        StringBuffer builder = request.getRequestURL();
        if (request.getQueryString() != null) {
            builder.append("?");
            builder.append(request.getQueryString());
        }
        return URI.create(builder.toString());
    }

    private String getBaseUrl(HttpServletRequest request) {
        return request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort() + request.getContextPath();
    }

    private String generateProjectSettingsHtml(String projectKey, String projectName) {
        return "<!DOCTYPE html>\n" +
            "<html>\n" +
            "<head>\n" +
            "    <title>WMPR Requests Settings - " + projectName + "</title>\n" +
            "    <meta name=\"decorator\" content=\"atl.admin\">\n" +
            "    <meta name=\"projectKey\" content=\"" + projectKey + "\">\n" +
            "    <meta name=\"projectName\" content=\"" + projectName + "\">\n" +
            "    <meta name=\"admin.active.section\" content=\"atl.jira.proj.config\">\n" +
            "    <meta name=\"admin.active.tab\" content=\"wmpr-settings-menu\">\n" +
            "    <meta charset=\"utf-8\">\n" +
            "</head>\n" +
            "<body>\n" +
            "    <div id=\"wmpr-settings-container\" class=\"project-config-content\">\n" +
            "        <header class=\"aui-page-header\">\n" +
            "            <div class=\"aui-page-header-inner\">\n" +
            "                <div class=\"aui-page-header-main\">\n" +
            "                    <h1>WMPR Requests Settings</h1>\n" +
            "                    <p class=\"aui-page-header-description\">\n" +
            "                        Configure the JQL query used to fetch WMPR requests for display in the Service Desk portal.\n" +
            "                    </p>\n" +
            "                </div>\n" +
            "            </div>\n" +
            "        </header>\n" +
            "        \n" +
            "        <!-- Loading state while React component initializes -->\n" +
            "        <div class=\"wmpr-loading-placeholder\">\n" +
            "            <div style=\"text-align: center; padding: 40px;\">\n" +
            "                <aui-spinner size=\"medium\"></aui-spinner>\n" +
            "                <p>Initializing WMPR Settings...</p>\n" +
            "            </div>\n" +
            "        </div>\n" +
            "    </div>\n" +
            "\n" +
            "    <script type=\"text/javascript\">\n" +
            "        (function() {\n" +
            "            // Set up proper context for React component\n" +
            "            window.projectKey = '" + projectKey + "';\n" +
            "            \n" +
            "            // Initialize WMPR Settings component\n" +
            "            function initializeWMPRSettings() {\n" +
            "                console.log('Initializing WMPR Settings for project:', window.projectKey);\n" +
            "                \n" +
            "                var container = document.getElementById('wmpr-settings-container');\n" +
            "                if (!container) {\n" +
            "                    console.log('Settings container not found, retrying...');\n" +
            "                    setTimeout(initializeWMPRSettings, 1000);\n" +
            "                    return;\n" +
            "                }\n" +
            "                \n" +
            "                if (typeof window.WMPRSettings !== 'undefined' && window.WMPRSettings.mount) {\n" +
            "                    console.log('Mounting WMPR Settings component');\n" +
            "                    window.WMPRSettings.mount();\n" +
            "                } else {\n" +
            "                    console.log('WMPRSettings not ready, retrying...');\n" +
            "                    setTimeout(initializeWMPRSettings, 1000);\n" +
            "                }\n" +
            "            }\n" +
            "            \n" +
            "            // Initialize when ready\n" +
            "            if (document.readyState === 'loading') {\n" +
            "                document.addEventListener('DOMContentLoaded', initializeWMPRSettings);\n" +
            "            } else {\n" +
            "                setTimeout(initializeWMPRSettings, 100);\n" +
            "            }\n" +
            "            \n" +
            "            // AJS ready\n" +
            "            if (typeof AJS !== 'undefined' && AJS.toInit) {\n" +
            "                AJS.toInit(initializeWMPRSettings);\n" +
            "            }\n" +
            "        })();\n" +
            "    </script>\n" +
            "</body>\n" +
            "</html>";
    }
} 