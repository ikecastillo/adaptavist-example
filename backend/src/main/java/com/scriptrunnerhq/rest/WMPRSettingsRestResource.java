package com.scriptrunnerhq.rest;

import com.atlassian.jira.bc.issue.search.SearchService;
import com.atlassian.jira.security.JiraAuthenticationContext;
import com.atlassian.jira.user.ApplicationUser;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.atlassian.plugin.spring.scanner.annotation.imports.JiraImport;
import com.atlassian.sal.api.pluginsettings.PluginSettings;
import com.atlassian.sal.api.pluginsettings.PluginSettingsFactory;
import com.google.gson.Gson;

import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;

@Path("/settings")
public class WMPRSettingsRestResource {

    private static final String SETTINGS_KEY_PREFIX = "wmpr.settings.";
    private static final String DEFAULT_JQL = "project = WMPR ORDER BY created DESC";

    @JiraImport
    private final SearchService searchService;
    
    @JiraImport
    private final JiraAuthenticationContext authenticationContext;
    
    @ComponentImport
    private final PluginSettingsFactory pluginSettingsFactory;
    
    private final Gson gson;

    @Inject
    public WMPRSettingsRestResource(
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
            
            if (projectKey != null && !projectKey.trim().isEmpty()) {
                // Get settings for specific project
                String jql = (String) settings.get(SETTINGS_KEY_PREFIX + projectKey + ".jql");
                Object useCustomObj = settings.get(SETTINGS_KEY_PREFIX + projectKey + ".useCustom");
                
                boolean useCustomJql = false;
                if (useCustomObj instanceof Boolean) {
                    useCustomJql = (Boolean) useCustomObj;
                } else if (useCustomObj instanceof String) {
                    useCustomJql = "true".equals(useCustomObj);
                }
                
                response.put("projectKey", projectKey);
                response.put("jql", jql != null ? jql : DEFAULT_JQL);
                response.put("useCustomJql", useCustomJql);
            } else {
                // Get global settings
                String globalJql = (String) settings.get(SETTINGS_KEY_PREFIX + "global.jql");
                Object useCustomObj = settings.get(SETTINGS_KEY_PREFIX + "global.useCustom");
                
                boolean useCustomJql = false;
                if (useCustomObj instanceof Boolean) {
                    useCustomJql = (Boolean) useCustomObj;
                } else if (useCustomObj instanceof String) {
                    useCustomJql = "true".equals(useCustomObj);
                }
                
                response.put("projectKey", "global");
                response.put("jql", globalJql != null ? globalJql : DEFAULT_JQL);
                response.put("useCustomJql", useCustomJql);
            }
            
            response.put("defaultJql", DEFAULT_JQL);
            
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

            // Parse the request
            Map<String, Object> request = gson.fromJson(requestBody, Map.class);
            String projectKey = (String) request.get("projectKey");
            String jql = (String) request.get("jql");
            Boolean useCustomJql = (Boolean) request.get("useCustomJql");
            
            if (projectKey == null || projectKey.trim().isEmpty()) {
                projectKey = "global";
            }
            
            // Validate JQL if provided
            if (useCustomJql != null && useCustomJql && jql != null && !jql.trim().isEmpty()) {
                SearchService.ParseResult parseResult = searchService.parseQuery(user, jql);
                if (!parseResult.isValid()) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Invalid JQL query");
                    errorResponse.put("details", parseResult.getErrors().toString());
                    return Response.status(Response.Status.BAD_REQUEST)
                            .entity(gson.toJson(errorResponse))
                            .build();
                }
            }
            
            // Save settings
            PluginSettings settings = pluginSettingsFactory.createGlobalSettings();
            String keyPrefix = SETTINGS_KEY_PREFIX + projectKey + ".";
            
            if (jql != null) {
                settings.put(keyPrefix + "jql", jql);
            }
            if (useCustomJql != null) {
                settings.put(keyPrefix + "useCustom", useCustomJql.toString());
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Settings saved successfully");
            response.put("projectKey", projectKey);
            
            return Response.ok(gson.toJson(response)).build();
            
        } catch (Exception e) {
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