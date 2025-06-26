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
        if (!permissionManager.hasPermission(Permissions.ADMINISTER, project, jiraUser)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access denied. Project administrator privileges required.");
            return;
        }

        response.setContentType("text/html;charset=utf-8");
        
        Map<String, Object> context = new HashMap<>();
        context.put("user", user);
        context.put("baseUrl", getBaseUrl(request));
        context.put("project", project);
        context.put("projectKey", projectKey);
        context.put("req", request);
        
        templateRenderer.render("/templates/wmpr-settings.vm", context, response.getWriter());
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
} 