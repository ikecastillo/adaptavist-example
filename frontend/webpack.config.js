const path = require('path');
const WrmPlugin = require('atlassian-webresource-webpack-plugin');

const xmlOutPath = path.resolve(
    '..', 'backend', 'src', 'main', 'resources', 'META-INF', 'plugin-descriptors', 'wr-defs.xml'
)

module.exports = (_, { mode }) => {
    const watch = mode !== 'production'

    return {
        watch,
        resolve: {
            extensions: ['.tsx', '.ts', '.js', '.jsx']
        },
        module: {
            rules: [{
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: { loader: "babel-loader" }
            }]
        },
        entry: {
            'vendorApiExample': './src/vendors-api-example.tsx',
            'vendorApiSelectExample': './src/vendors-api-select-example.tsx',
            'wmprPortalFooter': './src/wmpr-portal-footer-integration.tsx'
        },
        plugins: [
            new WrmPlugin({
                watch,
                locationPrefix: 'frontend/',
                pluginKey: 'com.scriptrunnerhq.backend.vendor-api-example',
                xmlDescriptors: xmlOutPath,
                contextMap: {
                    'vendorApiExample': 'jira.general',
                    'vendorApiSelectExample': 'jira.general',
                    'wmprPortalFooter': 'servicedesk.portal'
                }
            }),
        ],
        output: {
            filename: 'bundled.[name].js',
            path: path.resolve("../backend/src/main/resources/frontend")
        }
    };
};