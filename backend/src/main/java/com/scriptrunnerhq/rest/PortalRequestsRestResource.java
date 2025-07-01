package com.scriptrunnerhq.rest;

import com.atlassian.jira.bc.issue.search.SearchService;
import com.atlassian.jira.issue.Issue;
import com.atlassian.jira.issue.search.SearchResults;
import com.atlassian.jira.security.JiraAuthenticationContext;
import com.atlassian.jira.user.ApplicationUser;
import com.atlassian.jira.web.bean.PagerFilter;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.atlassian.plugin.spring.scanner.annotation.imports.JiraImport;
import com.atlassian.sal.api.pluginsettings.PluginSettings;
import com.atlassian.sal.api.pluginsettings.PluginSettingsFactory;
import com.scriptrunnerhq.model.ServiceDeskRequest;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.CacheControl;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.*;

@Path("/recent")
public class PortalRequestsRestResource {

    private static final Logger log = LoggerFactory.getLogger(PortalRequestsRestResource.class);
    private static final String DEFAULT_JQL_TEMPLATE = "project = %s ORDER BY created DESC";
    private static final String SETTINGS_KEY_PREFIX = "portal.settings.";

    @JiraImport
    private final SearchService searchService;
    
    @JiraImport
    private final JiraAuthenticationContext authenticationContext;
    
    @ComponentImport
    private final PluginSettingsFactory pluginSettingsFactory;
    
    private final Gson gson;

    @Inject
    public PortalRequestsRestResource(
            SearchService searchService,
            JiraAuthenticationContext authenticationContext,
            PluginSettingsFactory pluginSettingsFactory) {
        this.searchService = searchService;
        this.authenticationContext = authenticationContext;
        this.pluginSettingsFactory = pluginSettingsFactory;
        this.gson = new Gson();
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getRecentRequests(@QueryParam("projectKey") String projectKey) {
        long startTime = System.currentTimeMillis();
        String requestId = "PORTAL-" + startTime;
        
        // Enhanced logging for diagnostics
        log.debug("[{}] Portal REST API called at: {}", requestId, new Date());
        log.debug("[{}] Project key: {}", requestId, projectKey);
        
        try {
            // Check authentication
            ApplicationUser user = authenticationContext.getLoggedInUser();
            log.debug("[{}] User: {}", requestId, (user != null ? user.getName() : "null"));
            
            if (user == null) {
                log.warn("[{}] Authentication failed - no user", requestId);
                String errorResponse = "{\"error\":\"Authentication required\",\"requestId\":\"" + requestId + "\"}";
                return createOptimizedResponse(errorResponse, Response.Status.UNAUTHORIZED);
            }

            // Get configured JQL from plugin settings
            String jql = getConfiguredJql(projectKey);
            log.debug("[{}] Using JQL: {}", requestId, jql);
            
            SearchService.ParseResult parseResult = searchService.parseQuery(user, jql);
            if (!parseResult.isValid()) {
                log.warn("[{}] Configured JQL invalid, trying fallback", requestId);
                // Fallback to a more generic JQL if configured one fails
                String fallbackProjectKey = (projectKey != null && !projectKey.equals("global")) ? projectKey : "DEMO";
                jql = String.format(DEFAULT_JQL_TEMPLATE, fallbackProjectKey);
                parseResult = searchService.parseQuery(user, jql);
                log.debug("[{}] Fallback JQL: {}", requestId, jql);
                
                if (!parseResult.isValid()) {
                    log.error("[{}] Both JQL queries invalid", requestId);
                    String errorResponse = "{\"error\":\"Invalid JQL query\",\"requestId\":\"" + requestId + "\"}";
                    return createOptimizedResponse(errorResponse, Response.Status.BAD_REQUEST);
                }
            }

            // Execute search with limit of 10
            PagerFilter pagerFilter = new PagerFilter(0, 10);
            log.debug("[{}] Executing search with limit 10", requestId);
            
            SearchResults searchResults = searchService.search(user, parseResult.getQuery(), pagerFilter);
            List<Issue> issues = searchResults.getResults();
            
            log.debug("[{}] Found {} issues", requestId, issues.size());

            List<ServiceDeskRequest> requests = new ArrayList<>();
            for (int i = 0; i < issues.size(); i++) {
                Issue issue = issues.get(i);
                try {
                    ServiceDeskRequest request = new ServiceDeskRequest();
                    request.setKey(issue.getKey());
                    request.setSummary(issue.getSummary());
                    request.setReporter(issue.getReporter() != null ? issue.getReporter().getDisplayName() : "Unknown");
                    request.setCreated(issue.getCreated() != null ? issue.getCreated().toString() : "");
                    request.setStatus(issue.getStatus() != null ? issue.getStatus().getName() : "Unknown");
                    request.setStatusCategory(issue.getStatus() != null && issue.getStatus().getStatusCategory() != null 
                        ? issue.getStatus().getStatusCategory().getKey() : "unknown");
                    
                    requests.add(request);
                } catch (Exception e) {
                    log.warn("[{}] Error processing issue {}: {}", new Object[]{requestId, issue.getKey(), e.getMessage()});
                }
            }

            // Create response with diagnostics
            Map<String, Object> response = new HashMap<>();
            response.put("data", requests);
            response.put("diagnostics", createDiagnostics(requestId, startTime, user, jql, issues.size()));

            String jsonResponse = gson.toJson(response);
            log.debug("[{}] Response size: {} characters", requestId, jsonResponse.length());
            log.debug("[{}] Request completed in {}ms", requestId, (System.currentTimeMillis() - startTime));
            
            return createOptimizedResponse(jsonResponse, Response.Status.OK);

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("ERROR after {}ms: {}", duration, e.getMessage());
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch portal requests: " + e.getMessage());
            errorResponse.put("requestId", requestId);
            errorResponse.put("duration", duration);
            errorResponse.put("errorType", e.getClass().getSimpleName());
            
            return createOptimizedResponse(gson.toJson(errorResponse), Response.Status.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Gets the configured JQL for the specified project, or returns default if not configured
     */
    private String getConfiguredJql(String projectKey) {
        try {
            // If no project key provided, use global settings or default JQL
            if (projectKey == null || projectKey.trim().isEmpty()) {
                projectKey = "global";
            }
            
            PluginSettings settings = pluginSettingsFactory.createGlobalSettings();
            String configuredJql = (String) settings.get(SETTINGS_KEY_PREFIX + projectKey + ".jql");
            Object useCustomJqlObj = settings.get(SETTINGS_KEY_PREFIX + projectKey + ".useCustom");
            
            // Handle both Boolean and String values for useCustom setting
            boolean useCustomJql = false;
            if (useCustomJqlObj instanceof Boolean) {
                useCustomJql = (Boolean) useCustomJqlObj;
            } else if (useCustomJqlObj instanceof String) {
                useCustomJql = "true".equals(useCustomJqlObj);
            }
            
            if (useCustomJql && configuredJql != null && !configuredJql.trim().isEmpty()) {
                log.debug("Found custom JQL for project {}: {}", projectKey, configuredJql);
                return configuredJql;
            } else {
                log.debug("Using default JQL for project {}", projectKey);
                String defaultProjectKey = (projectKey != null && !projectKey.equals("global")) ? projectKey : "DEMO";
                return String.format(DEFAULT_JQL_TEMPLATE, defaultProjectKey);
            }
        } catch (Exception e) {
            log.error("Error loading JQL settings for project: {}", e.getMessage());
            String defaultProjectKey = (projectKey != null && !projectKey.equals("global")) ? projectKey : "DEMO";
            return String.format(DEFAULT_JQL_TEMPLATE, defaultProjectKey);
        }
    }
    
    /**
     * Creates an optimized HTTP response to avoid chunked encoding issues in load balancer environments
     */
    private Response createOptimizedResponse(String jsonContent, Response.Status status) {
        // Calculate content length to avoid chunked encoding
        byte[] contentBytes = jsonContent.getBytes();
        int contentLength = contentBytes.length;
        
        // Create cache control for better performance
        CacheControl cacheControl = new CacheControl();
        cacheControl.setMaxAge(30); // 30 seconds cache
        cacheControl.setNoCache(false);
        cacheControl.setMustRevalidate(false);
        
        return Response.status(status)
                .entity(jsonContent)
                .type(MediaType.APPLICATION_JSON)
                .cacheControl(cacheControl)
                // Explicitly set content length to prevent chunked encoding
                .header("Content-Length", String.valueOf(contentLength))
                // CORS headers for load balancer environments
                .header("Access-Control-Allow-Origin", "*")
                .header("Access-Control-Allow-Methods", "GET, OPTIONS")
                .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
                // Compression hints for load balancers
                .header("X-Content-Type-Options", "nosniff")
                .header("X-Frame-Options", "SAMEORIGIN")
                // Prevent proxy caching issues
                .header("Pragma", "no-cache")
                .header("Expires", "0")
                .build();
    }
    
    private Map<String, Object> createDiagnostics(String requestId, long startTime, ApplicationUser user, String jql, int resultCount) {
        Map<String, Object> diagnostics = new HashMap<>();
        diagnostics.put("requestId", requestId);
        diagnostics.put("timestamp", new Date().toString());
        diagnostics.put("duration", System.currentTimeMillis() - startTime);
        diagnostics.put("user", user.getName());
        diagnostics.put("jql", jql);
        diagnostics.put("resultCount", resultCount);
        diagnostics.put("version", "1.0.0-dynamic");
        return diagnostics;
    }
} 