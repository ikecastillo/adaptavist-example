import React from 'react';
import ReactDOM from 'react-dom';
import WMPRPortalFooter from './wmpr-portal-footer';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Function to initialize the WMPR portal footer
    function initWMPRPortalFooter() {
        // Look for the service desk portal footer section
        const footerSection = document.querySelector('#servicedesk-portal-footer, .servicedesk-portal-footer, [data-section="servicedesk.portal.footer"]');
        
        if (footerSection) {
            // Create a container for our React component
            const wmprContainer = document.createElement('div');
            wmprContainer.id = 'wmpr-portal-footer-container';
            wmprContainer.className = 'wmpr-portal-footer-wrapper';
            
            // Append to the footer section
            footerSection.appendChild(wmprContainer);
            
            // Render the React component
            ReactDOM.render(<WMPRPortalFooter />, wmprContainer);
            
            console.log('WMPR Portal Footer component initialized');
        } else {
            // Retry after a short delay if footer section not found
            setTimeout(initWMPRPortalFooter, 1000);
        }
    }

    // Try to initialize immediately
    initWMPRPortalFooter();
});

// Also try to initialize when the page changes (for SPA-like behavior)
if (typeof window !== 'undefined') {
    // Listen for page changes in Jira/Service Desk
    window.addEventListener('popstate', function() {
        setTimeout(() => {
            const existingContainer = document.getElementById('wmpr-portal-footer-container');
            if (!existingContainer) {
                document.dispatchEvent(new Event('DOMContentLoaded'));
            }
        }, 500);
    });
} 