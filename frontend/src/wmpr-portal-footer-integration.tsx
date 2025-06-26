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
        // Look for the specific Service Desk portal footer section created by our Velocity template
        let footerSection = document.getElementById('wmpr-portal-footer-section');
        
        // If not found, look for alternative Service Desk portal footer locations
        if (!footerSection) {
            const alternatives = [
                '#wmpr-portal-footer-section',
                '.servicedesk-portal-footer',
                '[data-section="servicedesk.portal.footer"]',
                '.sd-portal-footer',
                '.servicedesk-footer'
            ];
            
            for (const selector of alternatives) {
                footerSection = document.querySelector(selector);
                if (footerSection) {
                    console.log(`Found Service Desk footer using selector: ${selector}`);
                    break;
                }
            }
        }
        
        // If still not found, create a container in any available footer area
        if (!footerSection) {
            const possibleParents = [
                document.querySelector('.aui-page-panel-content'),
                document.querySelector('.page-content'),
                document.querySelector('main'),
                document.querySelector('#content'),
                document.body
            ];
            
            for (const parent of possibleParents) {
                if (parent) {
                    footerSection = document.createElement('div');
                    footerSection.id = 'wmpr-portal-footer-section';
                    footerSection.className = 'wmpr-portal-footer-wrapper';
                    parent.appendChild(footerSection);
                    console.log('Created WMPR footer container in:', parent.className || parent.tagName);
                    break;
                }
            }
        }
        
        if (footerSection) {
            // Check if our container already exists
            let wmprContainer = footerSection.querySelector('#wmpr-portal-footer-container');
            
            if (!wmprContainer) {
                // Create a container for our React component
                wmprContainer = document.createElement('div');
                wmprContainer.id = 'wmpr-portal-footer-container';
                wmprContainer.className = 'wmpr-portal-footer-wrapper';
                
                // Replace any loading placeholder
                const loadingPlaceholder = footerSection.querySelector('.wmpr-loading-placeholder');
                if (loadingPlaceholder) {
                    footerSection.replaceChild(wmprContainer, loadingPlaceholder);
                } else {
                    footerSection.appendChild(wmprContainer);
                }
            }
            
            // Render the React component using the legacy API
            ReactDOM.render(React.createElement(WMPRPortalFooter), wmprContainer);
            
            (window as any).WMPRPortalFooter.mounted = true;
            console.log('WMPR Portal Footer component mounted successfully in Service Desk portal');
        } else {
            console.log('Could not find or create suitable container for WMPR Portal Footer');
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
    
    // Service Desk specific events
    window.addEventListener('load', () => {
        setTimeout(mountWMPRPortalFooter, 500);
    });
} 