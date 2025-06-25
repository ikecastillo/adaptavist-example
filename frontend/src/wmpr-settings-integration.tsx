import React from 'react';
import ReactDOM from 'react-dom';
import WMPRSettings from './wmpr-settings';

// Create a unique namespace to avoid conflicts
(window as any).WMPRSettings = (window as any).WMPRSettings || {};

// Function to safely mount the settings component
function mountWMPRSettings() {
    // Check if already mounted
    if ((window as any).WMPRSettings.mounted) {
        return;
    }

    try {
        // Look for the settings container
        const settingsContainer = document.getElementById('wmpr-settings-container');
        
        if (settingsContainer) {
            // Render the React component using the legacy API
            ReactDOM.render(React.createElement(WMPRSettings), settingsContainer);
            
            (window as any).WMPRSettings.mounted = true;
            console.log('WMPR Settings component initialized successfully');
        } else {
            console.log('Could not find wmpr-settings-container');
        }
    } catch (error) {
        console.error('Error mounting WMPR Settings:', error);
    }
}

// Function to unmount the component
function unmountWMPRSettings() {
    const container = document.getElementById('wmpr-settings-container');
    if (container) {
        ReactDOM.unmountComponentAtNode(container);
    }
    (window as any).WMPRSettings.mounted = false;
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWMPRSettings);
} else {
    // DOM is already ready
    setTimeout(mountWMPRSettings, 100);
}

// Store the mount function globally for manual triggering
if (typeof window !== 'undefined') {
    (window as any).WMPRSettings.mount = mountWMPRSettings;
    (window as any).WMPRSettings.unmount = unmountWMPRSettings;
} 