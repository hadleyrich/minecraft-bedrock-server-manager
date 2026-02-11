#!/usr/bin/env node

/**
 * Recreate Bedrock Server containers from existing data directories
 * This script matches the logic in server.js for network and port configuration
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const Docker = require('dockerode');

// Configuration
const DATA_DIR = process.env.DATA_DIR || '/opt/minecraft-servers';
const BEDROCK_IMAGE = 'itzg/minecraft-bedrock-server';
const DOCKER_NETWORK = process.env.DOCKER_NETWORK || null;
const ENABLE_SSH = process.env.ENABLE_SSH === 'true' || process.env.ENABLE_SSH === 'TRUE' || process.env.ENABLE_SSH === '1';

// Docker configuration - match server.js exactly
let dockerConfig;
if (process.env.DOCKER_HOST) {
    const dockerHost = process.env.DOCKER_HOST;
    if (dockerHost.startsWith('tcp://')) {
        const url = new URL(dockerHost);
        dockerConfig = { host: url.hostname, port: parseInt(url.port) };
    } else if (dockerHost.startsWith('unix://')) {
        dockerConfig = { socketPath: dockerHost.replace('unix://', '') };
    } else {
        dockerConfig = { socketPath: dockerHost };
    }
} else {
    dockerConfig = process.platform === 'win32'
        ? { host: 'localhost', port: 2375 }
        : { socketPath: '/var/run/docker.sock' };
}

const docker = new Docker(dockerConfig);

// Helper: Check if network mode requires port mapping
const requiresPortMapping = (metadata) => {
    const networkMode = metadata.network || DOCKER_NETWORK;
    if (!networkMode) return true;

    const noPortMappingModes = ['macvlan', 'ipvlan'];
    return !noPortMappingModes.some(mode => networkMode.toLowerCase().includes(mode));
};

// Helper: Build container environment variables
function buildContainerEnv(metadata) {
    const env = [
        'EULA=TRUE',
        'VERSION=' + (metadata.version || 'LATEST'),
        'SERVER_NAME=' + (metadata.name || 'Bedrock Server')
    ];

    if (ENABLE_SSH) {
        env.push('ENABLE_SSH=TRUE');
    }

    return env;
}

// Helper: Apply network configuration
const applyNetworkConfig = (containerConfig, metadata) => {
    if (metadata.network || DOCKER_NETWORK) {
        if (!containerConfig.HostConfig) {
            containerConfig.HostConfig = {};
        }
        containerConfig.HostConfig.NetworkMode = metadata.network || DOCKER_NETWORK;
    }
};

// Helper: Apply port configuration (matching server.js logic)
const applyPortConfig = (containerConfig, metadata) => {
    if (!requiresPortMapping(metadata)) {
        // For macvlan/ipvlan, expose the port but don't bind to host
        containerConfig.ExposedPorts = { '19132/udp': {} };
        return null;
    }

    // Standard port mapping for bridge/host networks
    if (!containerConfig.HostConfig) {
        containerConfig.HostConfig = {};
    }
    containerConfig.HostConfig.PortBindings = {
        '19132/udp': [{ HostPort: '19132' }]
    };
    return 19132;
};

// Helper: Get host data path
const getHostDataPath = async () => {
    try {
        console.log('Searching for container with /app/minecraft-data mount...');
        const containers = await docker.listContainers({ all: true });
        console.log(`Found ${containers.length} containers`);

        let minecraftMount = null;

        for (const c of containers) {
            if (!c.Mounts) continue;

            const mount = c.Mounts.find(m => m.Destination === '/app/minecraft-data');
            if (mount) {
                minecraftMount = mount;
                break;
            }
        }

        if (!minecraftMount) {
            console.log('No existing mount found, using DATA_DIR:', DATA_DIR);
            return DATA_DIR;
        }

        console.log('Using mount source:', minecraftMount.Source);
        return minecraftMount.Source;
    } catch (err) {
        console.error('Failed to get host data path:', err.message);
        return DATA_DIR;
    }
};

// Main function
async function recreateServers() {
    try {
        console.log('\n🔄 Bedrock Server Container Recreator\n');
        console.log(`Data directory: ${DATA_DIR}`);
        console.log(`Docker network: ${DOCKER_NETWORK || 'default (bridge)'}`);
        console.log(`SSH enabled: ${ENABLE_SSH}\n`);

        // Ensure data directory exists
        if (!await fs.pathExists(DATA_DIR)) {
            console.error(`❌ Data directory not found: ${DATA_DIR}`);
            process.exit(1);
        }

        // Get host data path for container binds
        const hostDataPath = await getHostDataPath();

        // Scan for server directories
        const items = await fs.readdir(DATA_DIR);
        const serverDirs = items.filter(item => item.startsWith('bedrock-'));

        if (serverDirs.length === 0) {
            console.log('⚠️  No server directories found matching pattern "bedrock-*"');
            process.exit(0);
        }

        console.log(`📂 Found ${serverDirs.length} server directory(ies)\n`);

        let successCount = 0;
        let failureCount = 0;

        for (const serverId of serverDirs) {
            const serverPath = path.join(DATA_DIR, serverId);
            const metadataPath = path.join(serverPath, 'metadata.json');

            try {
                // Check if directory has metadata
                if (!await fs.pathExists(metadataPath)) {
                    console.log(`⚠️  Skipping ${serverId} - no metadata.json found`);
                    continue;
                }

                // Read metadata
                const metadata = await fs.readJson(metadataPath);
                const hostServerPath = path.join(hostDataPath, serverId);

                console.log(`\n📦 Processing: ${serverId}`);
                console.log(`   Name: ${metadata.name || 'Bedrock Server'}`);
                console.log(`   Version: ${metadata.version || 'LATEST'}`);
                console.log(`   Network: ${metadata.network || 'bridge (default)'}`);
                console.log(`   Memory: ${formatBytes(metadata.memory || 2147483648)}`);

                // Check if container already exists
                try {
                    const containers = await docker.listContainers({ all: true });
                    const existing = containers.find(c => c.Labels?.['server-id'] === serverId);

                    if (existing) {
                        console.log(`   ⚠️  Container already exists (${existing.Id.substring(0, 12)})`);
                        continue;
                    }
                } catch (err) {
                    console.error(`   Error checking for existing container: ${err.message}`);
                }

                // Build container config (matching server.js)
                const containerConfig = {
                    Image: BEDROCK_IMAGE,
                    name: serverId,
                    Labels: {
                        'server-id': serverId,
                        'server-name': metadata.name || 'Bedrock Server'
                    },
                    Env: buildContainerEnv(metadata),
                    HostConfig: {
                        Binds: [`${hostServerPath}:/data`],
                        RestartPolicy: {
                            Name: 'unless-stopped'
                        },
                        Memory: metadata.memory || 2147483648
                    }
                };

                // Apply network configuration
                applyNetworkConfig(containerConfig, metadata);

                // Apply port configuration
                const portResult = applyPortConfig(containerConfig, metadata);

                if (portResult) {
                    console.log(`   Port: ${portResult}/udp`);
                } else {
                    console.log(`   Port: No mapping (custom network)`);
                }

                // Check if image is available
                try {
                    await docker.getImage(BEDROCK_IMAGE).inspect();
                } catch (err) {
                    console.log(`   ⏳ Pulling Docker image ${BEDROCK_IMAGE}...`);
                    await docker.pull(BEDROCK_IMAGE);
                }

                // Create and start container
                const container = await docker.createContainer(containerConfig);
                await container.start();

                const containerInfo = await container.inspect();
                const hasCustomNetwork = metadata.network || DOCKER_NETWORK;

                console.log(`   ✓ Container created: ${containerInfo.Id.substring(0, 12)}`);
                if (hasCustomNetwork) {
                    console.log(`   ✓ Network type: ${containerConfig.HostConfig.NetworkMode}`);
                }
                console.log(`   ✓ Status: ${containerInfo.State.Status}`);

                successCount++;

            } catch (err) {
                console.error(`   ❌ Error: ${err.message}`);
                failureCount++;
            }
        }

        // Summary
        console.log(`\n${'='.repeat(50)}`);
        console.log(`✓ Successfully recreated: ${successCount}`);
        if (failureCount > 0) {
            console.log(`❌ Failed: ${failureCount}`);
        }
        console.log(`${'='.repeat(50)}\n`);

        if (failureCount === 0 && successCount > 0) {
            console.log('🎮 All servers recreated! They should appear in the manager shortly.\n');
        }

    } catch (err) {
        console.error('Fatal error:', err.message);
        process.exit(1);
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Run with error handling
recreateServers().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
