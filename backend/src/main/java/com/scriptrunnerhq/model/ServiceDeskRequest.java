package com.scriptrunnerhq.model;

import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement
public class ServiceDeskRequest {
    private String key;
    private String summary;
    private String reporter;
    private String created;
    private String status;
    private String statusCategory;

    public ServiceDeskRequest() {
        // Default constructor for JAXB
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getReporter() {
        return reporter;
    }

    public void setReporter(String reporter) {
        this.reporter = reporter;
    }

    public String getCreated() {
        return created;
    }

    public void setCreated(String created) {
        this.created = created;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getStatusCategory() {
        return statusCategory;
    }

    public void setStatusCategory(String statusCategory) {
        this.statusCategory = statusCategory;
    }
} 