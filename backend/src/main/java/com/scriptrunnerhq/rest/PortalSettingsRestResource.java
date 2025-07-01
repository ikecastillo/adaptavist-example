package com.scriptrunnerhq.rest;

import com.atlassian.jira.bc.issue.search.SearchService;
import com.atlassian.jira.security.JiraAuthenticationContext;
import com.atlassian.jira.user.ApplicationUser;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.atlassian.plugin.spring.scanner.annotation.imports.JiraImport;
import com.atlassian.sal.api.pluginsettings.PluginSettings;
import com.atlassian.sal.api.pluginsettings.PluginSettingsFactory;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;

@Path("/settings")
public class PortalSettingsRestResource {

    private static final Logger log = LoggerFactory.getLogger(PortalSettingsRestResource.class);
    private static final String SETTINGS_KEY_PREFIX = "portal.settings.";
    private static final String DEFAULT_JQL_TEMPLATE = "project = %s ORDER BY created DESC";

    @JiraImport
    private final SearchService searchService;
    
    @JiraImport
    private final JiraAuthenticationContext authenticationContext;
    
    @ComponentImport
    private final PluginSettingsFactory pluginSettingsFactory;
    
    private final Gson gson;

    @Inject
    public PortalSettingsRestResource(
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
    public Response getSettings(@QueryParam("projectKey") String projectKey) {
        try {
            ApplicationUser user = authenticationContext.getLoggedInUser();
            if (user == null) {
                return Response.status(Response.Status.UNAUTHORIZED)
                        .entity("{\"error\":\"Authentication required\"}")
                        .build();
            }

            PluginSettings settings = pluginSettingsFactory.createGlobalSettings();
            
            Map<String, Object> response = new HashMap<>();
            
            String settingsProjectKey = projectKey;
            if (settingsProjectKey == null || settingsProjectKey.trim().isEmpty()) {
                settingsProjectKey = "global";
            }
            
            // Get JQL settings
            String jql = (String) settings.get(SETTINGS_KEY_PREFIX + settingsProjectKey + ".jql");
            Object useCustomObj = settings.get(SETTINGS_KEY_PREFIX + settingsProjectKey + ".useCustom");
            
            boolean useCustomJql = false;
            if (useCustomObj instanceof Boolean) {
                useCustomJql = (Boolean) useCustomObj;
            } else if (useCustomObj instanceof String) {
                useCustomJql = "true".equals(useCustomObj);
            }
            
            response.put("projectKey", settingsProjectKey);
            String defaultProjectKey = (settingsProjectKey != null && !settingsProjectKey.equals("global")) ? settingsProjectKey : "DEMO";
            String defaultJql = String.format(DEFAULT_JQL_TEMPLATE, defaultProjectKey);
            response.put("jql", jql != null ? jql : defaultJql);
            response.put("useCustomJql", useCustomJql);
            
            // Get button settings
            for (int i = 1; i <= 5; i++) {
                String buttonLabel = (String) settings.get(SETTINGS_KEY_PREFIX + settingsProjectKey + ".button" + i + "Label");
                String buttonUrl = (String) settings.get(SETTINGS_KEY_PREFIX + settingsProjectKey + ".button" + i + "Url");
                response.put("button" + i + "Label", buttonLabel != null ? buttonLabel : "");
                response.put("button" + i + "Url", buttonUrl != null ? buttonUrl : "");
            }
            
            response.put("defaultJql", defaultJql);
            
            return Response.ok(gson.toJson(response)).build();
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to load settings: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(gson.toJson(errorResponse))
                    .build();
        }
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response saveSettings(String requestBody) {
        try {
            ApplicationUser user = authenticationContext.getLoggedInUser();
            if (user == null) {
                return Response.status(Response.Status.UNAUTHORIZED)
                        .entity("{\"error\":\"Authentication required\"}")
                        .build();
            }

            log.debug("Save settings request body: {}", requestBody);
            
            // Parse the request
            Map<String, Object> request;
            try {
                request = gson.fromJson(requestBody, Map.class);
            } catch (Exception e) {
                log.error("Failed to parse JSON request: {}", e.getMessage());
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Invalid JSON format: " + e.getMessage());
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(gson.toJson(errorResponse))
                        .build();
            }
            
            String projectKey = (String) request.get("projectKey");
            String jql = (String) request.get("jql");
            Boolean useCustomJql = (Boolean) request.get("useCustomJql");
            
            // Extract button settings
            String[] buttonLabels = new String[5];
            String[] buttonUrls = new String[5];
            for (int i = 0; i < 5; i++) {
                buttonLabels[i] = (String) request.get("button" + (i + 1) + "Label");
                buttonUrls[i] = (String) request.get("button" + (i + 1) + "Url");
            }
            
            log.debug("Parsed settings - projectKey: {}, jql: {}, useCustomJql: {}", 
                new Object[]{projectKey, jql, useCustomJql});
            
            if (projectKey == null || projectKey.trim().isEmpty()) {
                projectKey = "global";
            }
            
            // Validate JQL if provided
            if (useCustomJql != null && useCustomJql && jql != null && !jql.trim().isEmpty()) {
                try {
                    SearchService.ParseResult parseResult = searchService.parseQuery(user, jql);
                    if (!parseResult.isValid()) {
                        log.warn("JQL validation failed: {}", parseResult.getErrors());
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("error", "Invalid JQL query");
                        errorResponse.put("details", parseResult.getErrors().toString());
                        return Response.status(Response.Status.BAD_REQUEST)
                                .entity(gson.toJson(errorResponse))
                                .build();
                    }
                } catch (Exception e) {
                    log.error("JQL validation error: {}", e.getMessage());
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "JQL validation failed: " + e.getMessage());
                    return Response.status(Response.Status.BAD_REQUEST)
                            .entity(gson.toJson(errorResponse))
                            .build();
                }
            }
            
            // Save settings
            try {
                PluginSettings settings = pluginSettingsFactory.createGlobalSettings();
                String keyPrefix = SETTINGS_KEY_PREFIX + projectKey + ".";
                
                if (jql != null) {
                    settings.put(keyPrefix + "jql", jql);
                    log.debug("Saved JQL for {}: {}", projectKey, jql);
                }
                if (useCustomJql != null) {
                    settings.put(keyPrefix + "useCustom", useCustomJql.toString());
                    log.debug("Saved useCustom for {}: {}", projectKey, useCustomJql);
                }
                
                // Save button settings
                for (int i = 0; i < 5; i++) {
                    String buttonLabel = buttonLabels[i];
                    String buttonUrl = buttonUrls[i];
                    
                    settings.put(keyPrefix + "button" + (i + 1) + "Label", buttonLabel != null ? buttonLabel : "");
                    settings.put(keyPrefix + "button" + (i + 1) + "Url", buttonUrl != null ? buttonUrl : "");
                    
                    log.debug("Saved button{} for project {} - Label: {}, URL: {}", 
                        new Object[]{(i + 1), projectKey, buttonLabel, buttonUrl});
                }
            } catch (Exception e) {
                log.error("Failed to save settings: {}", e.getMessage());
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Failed to save settings: " + e.getMessage());
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity(gson.toJson(errorResponse))
                        .build();
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Settings saved successfully");
            response.put("projectKey", projectKey);
            
            log.info("Settings saved successfully for project: {}", projectKey);
            
            return Response.ok(gson.toJson(response)).build();
            
        } catch (Exception e) {
            log.error("Unexpected error in saveSettings: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to save settings: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(gson.toJson(errorResponse))
                    .build();
        }
    }

    @POST
    @Path("/validate-jql")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response validateJql(String requestBody) {
        try {
            ApplicationUser user = authenticationContext.getLoggedInUser();
            if (user == null) {
                return Response.status(Response.Status.UNAUTHORIZED)
                        .entity("{\"error\":\"Authentication required\"}")
                        .build();
            }

            Map<String, Object> request = gson.fromJson(requestBody, Map.class);
            String jql = (String) request.get("jql");
            
            if (jql == null || jql.trim().isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("valid", false);
                errorResponse.put("error", "JQL cannot be empty");
                return Response.ok(gson.toJson(errorResponse)).build();
            }
            
            SearchService.ParseResult parseResult = searchService.parseQuery(user, jql);
            
            Map<String, Object> response = new HashMap<>();
            response.put("valid", parseResult.isValid());
            
            if (!parseResult.isValid()) {
                response.put("errors", parseResult.getErrors().toString());
            } else {
                response.put("message", "JQL is valid");
            }
            
            return Response.ok(gson.toJson(response)).build();
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("valid", false);
            errorResponse.put("error", "Failed to validate JQL: " + e.getMessage());
            return Response.ok(gson.toJson(errorResponse)).build();
        }
    }
} 