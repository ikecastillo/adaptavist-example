package com.scriptrunnerhq.rest;

import com.atlassian.jira.bc.issue.search.SearchService;
import com.atlassian.jira.issue.Issue;
import com.atlassian.jira.issue.search.SearchResults;
import com.atlassian.jira.security.JiraAuthenticationContext;
import com.atlassian.jira.user.ApplicationUser;
import com.atlassian.jira.web.bean.PagerFilter;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.atlassian.plugin.spring.scanner.annotation.imports.JiraImport;
// import com.atlassian.sal.api.pluginsettings.PluginSettings;
// import com.atlassian.sal.api.pluginsettings.PluginSettingsFactory;
import com.scriptrunnerhq.model.ServiceDeskRequest;
import com.google.gson.Gson;

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
public class WMPRRequestsRestResource {

    private static final String DEFAULT_JQL = "project = WMPR ORDER BY created DESC";
    // private static final String SETTINGS_KEY_PREFIX = "wmpr.settings.";

    @JiraImport
    private final SearchService searchService;
    
    @JiraImport
    private final JiraAuthenticationContext authenticationContext;
    
    // @ComponentImport
    // private final PluginSettingsFactory pluginSettingsFactory;
    
    private final Gson gson;

    @Inject
    public WMPRRequestsRestResource(
            SearchService searchService,
            JiraAuthenticationContext authenticationContext
            // PluginSettingsFactory pluginSettingsFactory
            ) {
        this.searchService = searchService;
        this.authenticationContext = authenticationContext;
        // this.pluginSettingsFactory = pluginSettingsFactory;
        this.gson = new Gson();
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getRecentWMPRRequests(@QueryParam("projectKey") String projectKey) {
        long startTime = System.currentTimeMillis();
        String requestId = "WMPR-" + startTime;
        
        // Enhanced logging for diagnostics
        System.out.println("[" + requestId + "] WMPR REST API called at: " + new Date());
        System.out.println("[" + requestId + "] Project key: " + projectKey);
        
        try {
            // Check authentication
            ApplicationUser user = authenticationContext.getLoggedInUser();
            System.out.println("[" + requestId + "] User: " + (user != null ? user.getName() : "null"));
            
            if (user == null) {
                System.out.println("[" + requestId + "] Authentication failed - no user");
                String errorResponse = "{\"error\":\"Authentication required\",\"requestId\":\"" + requestId + "\"}";
                return createOptimizedResponse(errorResponse, Response.Status.UNAUTHORIZED);
            }

            // Get configured JQL from plugin settings - COMMENTED OUT FOR MVP
            String jql = getConfiguredJql(projectKey);
            System.out.println("[" + requestId + "] Using JQL: " + jql);
            
            SearchService.ParseResult parseResult = searchService.parseQuery(user, jql);
            if (!parseResult.isValid()) {
                System.out.println("[" + requestId + "] Configured JQL invalid, trying fallback");
                // Fallback to a more generic JQL if configured one fails
                jql = "project = WMPR ORDER BY created DESC";
                parseResult = searchService.parseQuery(user, jql);
                System.out.println("[" + requestId + "] Fallback JQL: " + jql);
                
                if (!parseResult.isValid()) {
                    System.out.println("[" + requestId + "] Both JQL queries invalid");
                    String errorResponse = "{\"error\":\"Invalid JQL query\",\"requestId\":\"" + requestId + "\"}";
                    return createOptimizedResponse(errorResponse, Response.Status.BAD_REQUEST);
                }
            }

            // Execute search with limit of 10
            PagerFilter pagerFilter = new PagerFilter(0, 10);
            System.out.println("[" + requestId + "] Executing search with limit 10");
            
            SearchResults searchResults = searchService.search(user, parseResult.getQuery(), pagerFilter);
            List<Issue> issues = searchResults.getResults();
            
            System.out.println("[" + requestId + "] Found " + issues.size() + " issues");

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
                    System.err.println("[" + requestId + "] Error processing issue " + issue.getKey() + ": " + e.getMessage());
                }
            }

            // Create response with diagnostics
            Map<String, Object> response = new HashMap<>();
            response.put("data", requests);
            response.put("diagnostics", createDiagnostics(requestId, startTime, user, jql, issues.size()));

            String jsonResponse = gson.toJson(response);
            System.out.println("[" + requestId + "] Response size: " + jsonResponse.length() + " characters");
            System.out.println("[" + requestId + "] Request completed in " + (System.currentTimeMillis() - startTime) + "ms");
            
            return createOptimizedResponse(jsonResponse, Response.Status.OK);

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            System.err.println("[" + requestId + "] ERROR after " + duration + "ms: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch WMPR requests: " + e.getMessage());
            errorResponse.put("requestId", requestId);
            errorResponse.put("duration", duration);
            errorResponse.put("errorType", e.getClass().getSimpleName());
            
            return createOptimizedResponse(gson.toJson(errorResponse), Response.Status.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Gets the configured JQL for the specified project, or returns default if not configured
     * COMMENTED OUT FOR MVP - Using fixed JQL
     */
    private String getConfiguredJql(String projectKey) {
        // MVP: Use fixed JQL instead of dynamic settings
        return DEFAULT_JQL;
        
        /* COMMENTED OUT FOR MVP
        try {
            // If no project key provided, use default JQL which works across projects
            if (projectKey == null || projectKey.trim().isEmpty()) {
                System.out.println("No project key provided, using default JQL");
                return DEFAULT_JQL;
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
                System.out.println("Found custom JQL for project " + projectKey + ": " + configuredJql);
                return configuredJql;
            } else {
                System.out.println("Using default JQL for project " + projectKey);
                return DEFAULT_JQL;
            }
        } catch (Exception e) {
            System.err.println("Error loading JQL settings for project " + projectKey + ": " + e.getMessage());
            return DEFAULT_JQL;
        }
        */
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
        diagnostics.put("version", "1.0.0-optimized");
        return diagnostics;
    }
} 