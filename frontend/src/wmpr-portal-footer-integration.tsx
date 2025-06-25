import React from 'react';
import ReactDOM from 'react-dom';
import WMPRPortalFooter from './wmpr-portal-footer';

// Create a unique namespace to avoid conflicts
(window as any).WMPRPortalFooter = (window as any).WMPRPortalFooter || {};

// Function to safely mount the component
function mountWMPRPortalFooter() {
    // Check if already mounted
    if ((window as any).WMPRPortalFooter.mounted) {
        return;
    }

    try {
        // Look for the service desk portal footer section or create a container
        let footerSection = document.querySelector('#servicedesk-portal-footer, .servicedesk-portal-footer, [data-section="servicedesk.portal.footer"]');
        
        // If no footer section found, create one in the main content area
        if (!footerSection) {
            const mainContent = document.querySelector('.aui-page-panel-content, .page-content, main, #content');
            if (mainContent) {
                footerSection = document.createElement('div');
                footerSection.id = 'servicedesk-portal-footer';
                footerSection.setAttribute('data-section', 'servicedesk.portal.footer');
                mainContent.appendChild(footerSection);
            }
        }
        
        if (footerSection) {
            // Check if our container already exists
            let wmprContainer = document.getElementById('wmpr-portal-footer-container');
            
            if (!wmprContainer) {
                // Create a container for our React component
                wmprContainer = document.createElement('div');
                wmprContainer.id = 'wmpr-portal-footer-container';
                wmprContainer.className = 'wmpr-portal-footer-wrapper';
                
                // Append to the footer section
                footerSection.appendChild(wmprContainer);
            }
            
            // Render the React component using the legacy API
            ReactDOM.render(React.createElement(WMPRPortalFooter), wmprContainer);
            
            (window as any).WMPRPortalFooter.mounted = true;
            console.log('WMPR Portal Footer component initialized successfully');
        } else {
            console.log('Could not find suitable container for WMPR Portal Footer');
        }
    } catch (error) {
        console.error('Error mounting WMPR Portal Footer:', error);
    }
}

// Function to unmount the component
function unmountWMPRPortalFooter() {
    const container = document.getElementById('wmpr-portal-footer-container');
    if (container) {
        ReactDOM.unmountComponentAtNode(container);
        container.remove();
    }
    (window as any).WMPRPortalFooter.mounted = false;
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWMPRPortalFooter);
} else {
    // DOM is already ready
    setTimeout(mountWMPRPortalFooter, 100);
}

// Handle page navigation in SPA environments
if (typeof window !== 'undefined') {
    // Store the mount function globally for manual triggering
    (window as any).WMPRPortalFooter.mount = mountWMPRPortalFooter;
    (window as any).WMPRPortalFooter.unmount = unmountWMPRPortalFooter;
    
    // Listen for various navigation events
    window.addEventListener('popstate', () => {
        setTimeout(mountWMPRPortalFooter, 500);
    });
    
    // Listen for hash changes
    window.addEventListener('hashchange', () => {
        setTimeout(mountWMPRPortalFooter, 500);
    });
} 