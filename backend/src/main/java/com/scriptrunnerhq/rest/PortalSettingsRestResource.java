package com.scriptrunnerhq.rest;

import com.atlassian.jira.bc.issue.search.SearchService;
import com.atlassian.jira.security.JiraAuthenticationContext;
import com.atlassian.jira.user.ApplicationUser;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.atlassian.plugin.spring.scanner.annotation.imports.JiraImport;
import com.atlassian.sal.api.pluginsettings.PluginSettings;
import com.atlassian.sal.api.pluginsettings.PluginSettingsFactory;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Path("/settings")
public class PortalSettingsRestResource {

    private static final Logger log = LoggerFactory.getLogger(PortalSettingsRestResource.class);
    private static final String JQL_SETTINGS_KEY = "portal.jql";
    private static final String BUTTON_SETTINGS_KEY = "portal.buttons";
    private static final String DEFAULT_JQL = "project = WMPR ORDER BY created DESC";

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
    public Response getSettings() {
        try {
            ApplicationUser user = authenticationContext.getLoggedInUser();
            if (user == null) {
                return Response.status(Response.Status.UNAUTHORIZED)
                        .entity("{\"error\":\"Authentication required\"}")
                        .build();
            }

            PluginSettings settings = pluginSettingsFactory.createGlobalSettings();
            
            Map<String, Object> response = new HashMap<>();
            
            // Get JQL setting with default value
            String jql = (String) settings.get(JQL_SETTINGS_KEY);
            response.put("jql", jql != null ? jql : DEFAULT_JQL);
            
            // Get button configurations
            String buttonsJson = (String) settings.get(BUTTON_SETTINGS_KEY);
            List<Map<String, String>> buttons;
            if (buttonsJson != null) {
                buttons = gson.fromJson(buttonsJson, new TypeToken<List<Map<String, String>>>(){}.getType());
            } else {
                buttons = new ArrayList<>();
            }
            response.put("buttons", buttons);
            
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
            
            String jql = (String) request.get("jql");
            @SuppressWarnings("unchecked")
            List<Map<String, String>> buttons = (List<Map<String, String>>) request.get("buttons");
            
            log.debug("Parsed settings - jql: {}, buttons: {}", jql, buttons);
            
            // Validate JQL if provided
            if (jql != null && !jql.trim().isEmpty()) {
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
            
            // Validate buttons if provided
            if (buttons != null) {
                for (Map<String, String> button : buttons) {
                    if (!button.containsKey("label") || !button.containsKey("url")) {
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("error", "Invalid button configuration. Each button must have 'label' and 'url'");
                        return Response.status(Response.Status.BAD_REQUEST)
                                .entity(gson.toJson(errorResponse))
                                .build();
                    }
                }
            }
            
            // Save settings
            try {
                PluginSettings settings = pluginSettingsFactory.createGlobalSettings();
                
                if (jql != null) {
                    settings.put(JQL_SETTINGS_KEY, jql.trim());
                    log.debug("Saved JQL: {}", jql);
                }
                
                if (buttons != null) {
                    settings.put(BUTTON_SETTINGS_KEY, gson.toJson(buttons));
                    log.debug("Saved buttons: {}", buttons);
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
            
            log.info("Settings saved successfully");
            
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