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
import java.util.List;
import java.util.ArrayList;

@Path("/settings")
public class PortalSettingsRestResource {

    private static final Logger log = LoggerFactory.getLogger(PortalSettingsRestResource.class);
    private static final String JQL_SETTINGS_KEY = "portal.jql";
    private static final String BUTTON_SETTINGS_PREFIX = "portal.button.";
    private static final String CONFLUENCE_SPACES_KEY = "portal.confluence.spaces";
    private static final String DEFAULT_JQL = "project = HELP ORDER BY created DESC";

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
            
            // Get JQL setting with default
            String jql = (String) settings.get(JQL_SETTINGS_KEY);
            response.put("jql", jql != null && !jql.trim().isEmpty() ? jql : DEFAULT_JQL);
            response.put("defaultJql", DEFAULT_JQL);
            
            // Get button settings
            for (int i = 1; i <= 5; i++) {
                String buttonLabel = (String) settings.get(BUTTON_SETTINGS_PREFIX + i + ".label");
                String buttonUrl = (String) settings.get(BUTTON_SETTINGS_PREFIX + i + ".url");
                response.put("button" + i + "Label", buttonLabel != null ? buttonLabel : "");
                response.put("button" + i + "Url", buttonUrl != null ? buttonUrl : "");
            }
            
            // Get Confluence spaces setting
            String confluenceSpacesJson = (String) settings.get(CONFLUENCE_SPACES_KEY);
            if (confluenceSpacesJson != null && !confluenceSpacesJson.trim().isEmpty()) {
                try {
                    List<String> confluenceSpaces = gson.fromJson(confluenceSpacesJson, List.class);
                    response.put("confluenceSpaces", confluenceSpaces);
                } catch (Exception e) {
                    log.warn("Failed to parse confluence spaces JSON: {}", e.getMessage());
                    response.put("confluenceSpaces", new ArrayList<String>());
                }
            } else {
                response.put("confluenceSpaces", new ArrayList<String>());
            }
            
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
            List<String> confluenceSpaces = (List<String>) request.get("confluenceSpaces");
            
            log.debug("Parsed settings - jql: {}, confluenceSpaces: {}", jql, confluenceSpaces);
            
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
            
            // Save settings
            try {
                PluginSettings settings = pluginSettingsFactory.createGlobalSettings();
                
                if (jql != null) {
                    settings.put(JQL_SETTINGS_KEY, jql.trim());
                    log.debug("Saved JQL: {}", jql);
                }
                
                if (confluenceSpaces != null) {
                    String confluenceSpacesJson = gson.toJson(confluenceSpaces);
                    settings.put(CONFLUENCE_SPACES_KEY, confluenceSpacesJson);
                    log.debug("Saved Confluence spaces: {}", confluenceSpaces);
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
    @Path("/buttons")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response saveButtonSettings(String requestBody) {
        try {
            ApplicationUser user = authenticationContext.getLoggedInUser();
            if (user == null) {
                return Response.status(Response.Status.UNAUTHORIZED)
                        .entity("{\"error\":\"Authentication required\"}")
                        .build();
            }

            log.debug("Save button settings request body: {}", requestBody);
            
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
            
            // Save button settings
            try {
                PluginSettings settings = pluginSettingsFactory.createGlobalSettings();
                
                for (int i = 1; i <= 5; i++) {
                    String buttonLabel = (String) request.get("button" + i + "Label");
                    String buttonUrl = (String) request.get("button" + i + "Url");
                    
                    if (buttonLabel != null) {
                        settings.put(BUTTON_SETTINGS_PREFIX + i + ".label", buttonLabel.trim());
                    }
                    if (buttonUrl != null) {
                        settings.put(BUTTON_SETTINGS_PREFIX + i + ".url", buttonUrl.trim());
                    }
                }
                
                log.debug("Saved button settings");
            } catch (Exception e) {
                log.error("Failed to save button settings: {}", e.getMessage());
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Failed to save button settings: " + e.getMessage());
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity(gson.toJson(errorResponse))
                        .build();
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Button settings saved successfully");
            
            log.info("Button settings saved successfully");
            
            return Response.ok(gson.toJson(response)).build();
            
        } catch (Exception e) {
            log.error("Unexpected error in saveButtonSettings: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to save button settings: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(gson.toJson(errorResponse))
                    .build();
        }
    }

    @GET
    @Path("/confluence-spaces")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getConfluenceSpaces() {
        try {
            ApplicationUser user = authenticationContext.getLoggedInUser();
            if (user == null) {
                return Response.status(Response.Status.UNAUTHORIZED)
                        .entity("{\"error\":\"Authentication required\"}")
                        .build();
            }

            // For now, return mock data since we don't have Confluence API access
            // In a real implementation, this would call the Confluence API
            List<Map<String, String>> spaces = new ArrayList<>();
            
            // Mock spaces that the user would typically have access to
            spaces.add(createSpaceOption("HELP", "Help Documentation"));
            spaces.add(createSpaceOption("SUPPORT", "Support Knowledge Base"));
            spaces.add(createSpaceOption("TRAINING", "Training Materials"));
            spaces.add(createSpaceOption("PROCEDURES", "Standard Procedures"));
            spaces.add(createSpaceOption("FAQ", "Frequently Asked Questions"));
            spaces.add(createSpaceOption("GUIDES", "User Guides"));
            spaces.add(createSpaceOption("POLICIES", "Company Policies"));
            spaces.add(createSpaceOption("TROUBLESHOOTING", "Troubleshooting Guide"));
            
            Map<String, Object> response = new HashMap<>();
            response.put("spaces", spaces);
            
            return Response.ok(gson.toJson(response)).build();
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch Confluence spaces: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(gson.toJson(errorResponse))
                    .build();
        }
    }
    
    private Map<String, String> createSpaceOption(String key, String name) {
        Map<String, String> space = new HashMap<>();
        space.put("value", key);
        space.put("label", name + " (" + key + ")");
        return space;
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