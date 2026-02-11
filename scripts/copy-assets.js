#!/usr/bin/env node

/**
 * Copy required assets from node_modules to public directory
 * Consolidates what was previously split between setup-websocket.js and copy-assets npm script
 */

const fs = require('fs-extra');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

async function copyAssets() {
    try {
        console.log('📦 Copying assets to public directory...\n');

        // Copy index.html from src
        console.log('  ➜ Copying index.html...');
        await fs.copy(
            path.join(__dirname, '../src/index.html'),
            path.join(publicDir, 'index.html'),
            { overwrite: true }
        );
        console.log('     ✅ index.html copied');

        // Copy SweetAlert2 styles and assets
        console.log('  ➜ SweetAlert2 assets...');
        await fs.copy(
            path.join(__dirname, '../node_modules/sweetalert2/dist'),
            publicDir,
            { overwrite: true }
        );
        console.log('     ✅ SweetAlert2 copied');

        // Copy Socket.IO client library
        console.log('  ➜ Socket.IO client library...');
        const socketIOSourceDir = path.join(__dirname, '../node_modules/socket.io-client/dist');
        const socketIOTargetDir = path.join(publicDir, 'socket.io');

        await fs.ensureDir(socketIOTargetDir);
        await fs.copy(socketIOSourceDir, socketIOTargetDir, { overwrite: true });
        console.log('     ✅ Socket.IO client copied');

        console.log('\n✨ All assets copied successfully!');
    } catch (error) {
        console.error('❌ Failed to copy assets:', error.message);
        process.exit(1);
    }
}

copyAssets();
