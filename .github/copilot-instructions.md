# Copilot Instructions - Minecraft Bedrock Server Manager

## Project Overview

This is a full-stack web application for managing multiple Minecraft Bedrock Edition servers using Docker containers (`itzg/docker-minecraft-bedrock-server`). The application provides a modern web interface for server deployment, management, file operations, addon management, backups, and player administration.

## Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: Vanilla JavaScript + HTML + Tailwind CSS
- **Real-time Communication**: Socket.IO (WebSockets with HTTP polling fallback)
- **Docker Management**: Dockerode library
- **UI Components**: SweetAlert2 for modals and alerts
- **Process Management**: PM2 for production deployment
- **CSS Framework**: Tailwind CSS (build process required)

## Architecture

### Backend (server.js)

- Single monolithic Express server (~3000+ lines)
- Session-based authentication with password protection
- Docker container lifecycle management (create, start, stop, restart, delete)
- Real-time WebSocket broadcasting for multi-tab synchronization
- RESTful API endpoints for all operations
- File system operations with caching (30s TTL)
- Multer for file uploads

### Frontend (public/index.html)

- Single-page application (~3200+ lines)
- Socket.IO client for real-time updates
- Modal-based UI with tab navigation
- File manager with context menus and drag-drop
- Responsive design for mobile/desktop

### Key Components

- **Authentication**: Login system with rate limiting and session management
- **Server Management**: Create, import, configure, and control Docker containers
- **File Manager**: Advanced file operations (upload, download, edit, zip/unzip, rename, delete)
- **Addon Manager**: Handle .mcaddon, .mcpack, .mcworld, .mctemplate files with manifest parsing
- **Backup System**: World backup and restoration
- **Player Management**: Kick, ban, op, deop commands
- **Console Commands**: Execute Minecraft server commands via Docker exec

## Code Conventions

### General Guidelines

1. **File Organization**: Monolithic structure - main logic in `server.js` and `public/index.html`
2. **Error Handling**: Use try-catch blocks consistently; return JSON error responses
3. **Async/Await**: Prefer async/await over promises/callbacks
4. **Comments**: Add explanatory comments for complex logic, especially Docker operations

### Backend Patterns

```javascript
// Standard API endpoint pattern
app.post("/api/endpoint", requireAuth, async (req, res) => {
  try {
    // Validate inputs
    if (!requiredParam) {
      return res.status(400).json({ error: "Missing required parameter" });
    }

    // Perform operation
    const result = await someOperation();

    // Broadcast WebSocket update for real-time sync
    broadcastUpdate("event-name", data);

    // Return success response
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend Patterns

```javascript
// Standard fetch pattern with real-time UI update
async function performAction(serverId) {
  try {
    const response = await fetch("/api/endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverId }),
    });

    const result = await response.json();

    if (result.error) {
      Swal.fire("Error", result.error, "error");
      return;
    }

    // UI is updated via WebSocket, but can also update directly
    updateUI();
  } catch (error) {
    console.error("Error:", error);
    Swal.fire("Error", error.message, "error");
  }
}

// Socket.IO listener pattern
socket.on("update-event", (data) => {
  updateUIFunction(data);
});
```

## Critical System Details

### Docker Container Management

- **Image**: `itzg/minecraft-bedrock-server:latest`
- **Network**: Bridge mode
- **Volumes**: Bind mount from DATA_DIR (default: `/opt/minecraft-servers/{serverId}`)
- **Port Allocation**: Dynamic assignment, tracked in metadata.json
- **Environment Variables**: Set via Docker API (EULA, VERSION, SERVER_NAME, etc.)

### Directory Structure

```
DATA_DIR/
├── {serverId}/              # Each server gets unique directory
│   ├── worlds/              # Minecraft worlds
│   ├── behavior_packs/      # Behavior pack addons
│   ├── resource_packs/      # Resource pack addons
│   ├── server.properties    # Server configuration
│   ├── metadata.json        # Manager metadata (name, port, version, memory)
│   └── backups/             # World backups
```

### Authentication Flow

1. User accesses app → redirected to `/login` if not authenticated
2. POST `/api/login` with password → creates session
3. `requireAuth` middleware checks session on protected routes
4. Rate limiting: 5 attempts, 5-minute lockout

### WebSocket Events

Key events to broadcast when data changes:

- `servers-updated`: Server list or status changed
- `server-logs`: New log lines from container
- `file-list-updated`: Files changed in file manager
- `addon-list-updated`: Addons installed/removed/toggled

### Caching Strategy

- **serverCache**: Server inspection data (30s TTL)
- **fileCache**: File reads and JSON parsing (30s TTL)
- Invalidate on write operations: `invalidateFileCache(filePath)`

## Common Development Tasks

### Adding New API Endpoint

1. Add route in `server.js` with `requireAuth` middleware
2. Implement business logic with error handling
3. Broadcast WebSocket event if data changes
4. Add frontend function to call endpoint
5. Add Socket.IO listener if real-time updates needed

### Adding New Server Feature

1. Check if Docker env variable needed → add to container creation
2. Update metadata.json schema if storing new data
3. Add UI controls in appropriate tab
4. Implement backend API endpoint
5. Test with multiple browser tabs for WebSocket sync

### Modifying File Manager

- Update both `loadFiles()` backend endpoint and frontend rendering
- Ensure context menu actions are wired correctly
- Test upload/download/delete/rename operations
- Verify zip/unzip functionality

### Working with Addons

- Parse manifest.json for pack info (name, description, version, UUID)
- Handle both combined packs (.mcaddon) and individual packs (.mcpack)
- Update `world_behavior_packs.json` and `world_resource_packs.json`
- Refresh server container after changes

## Environment Variables (.env)

```bash
PORT=3001                          # HTTP/WebSocket server port
DATA_DIR=/opt/minecraft-servers    # Base directory for server data
LOGIN_PASSWORD=your_password       # Admin password
MAX_LOGIN_ATTEMPTS=5               # Rate limit attempts
LOGIN_LOCKOUT_MINUTES=5            # Lockout duration
```

## Build & Deployment

### Development

```bash
npm run dev              # Nodemon with hot reload (backend only)
npm run build:css        # Watch mode for Tailwind CSS
```

### Production

```bash
npm run build:css:prod   # Minified CSS
npm run copy-assets      # Copy SweetAlert2 assets
npm start                # PM2 cluster mode
```

### WebSocket Setup

```bash
npm run setup            # Installs socket.io and downloads client library
```

## Testing Guidelines

### Manual Testing Checklist

- [ ] Create/import/delete server
- [ ] Start/stop/restart containers
- [ ] Upload files and edit configurations
- [ ] Install/enable/disable addons
- [ ] Execute console commands
- [ ] Create/restore backups
- [ ] Test in multiple browser tabs (WebSocket sync)
- [ ] Test WebSocket fallback (block WebSocket in browser DevTools)
- [ ] Test mobile responsive layout

### Docker Testing

- Verify container starts with correct env vars
- Check port bindings and networking
- Ensure volumes are mounted correctly
- Test container logs streaming

## Performance Considerations

1. **Caching**: Use existing cache mechanisms (`serverCache`, `fileCache`) for frequently accessed data
2. **Debouncing**: Use debounce for WebSocket broadcasts of rapid events
3. **File Operations**: Use streams for large file operations (backups, uploads)
4. **Pagination**: Consider pagination if file lists or logs grow very large
5. **Docker API**: Minimize inspect() calls; use cached data when possible

## Security Notes

1. **Authentication**: Always use `requireAuth` middleware on protected endpoints
2. **Path Traversal**: Validate all file paths; ensure they're within server directory
3. **Docker Socket**: Only expose to trusted users (app has full Docker access)
4. **Input Validation**: Sanitize user inputs, especially for shell commands
5. **Session Security**: Sessions stored in memory; cleared on server restart

## Common Pitfalls

1. **Port Conflicts**: Check port availability before assigning to new server
2. **Docker Socket Permission**: Ensure user running app has Docker access
3. **File Permissions**: DATA_DIR must be writable by app user
4. **WebSocket CORS**: Ensure CORS configured correctly for WebSocket origin
5. **Large Files**: Upload limits set by Multer; adjust for large world files
6. **Container Names**: Must be unique; use server ID for uniqueness

## Debugging Tips

1. **Server Logs**: Check PM2 logs with `npm run pm2:logs`
2. **Docker Logs**: Stream container logs via `/api/servers/:id/logs`
3. **WebSocket**: Use browser DevTools Network tab to monitor WebSocket frames
4. **Cache Issues**: Clear cache with `serverCache.clear()` or `fileCache.clear()`
5. **File Operations**: Check actual filesystem with `ls -la DATA_DIR`

## AI Agent Guidance

When working on this repository:

1. **Understand the Monolithic Structure**: Most code is in two large files; search carefully before adding
2. **Preserve Real-time Sync**: Always broadcast WebSocket events when data changes
3. **Test with Multiple Tabs**: This is a key feature; verify changes appear in all tabs
4. **Docker-First Approach**: All server operations go through Docker API, not direct file manipulation
5. **Maintain Backward Compatibility**: Existing servers use metadata.json; preserve schema
6. **Follow Existing Patterns**: Match the code style and patterns already in use
7. **Consider Performance**: Use caching, avoid N+1 queries, stream large files
8. **Error User-Friendly Messages**: Use SweetAlert2 for all user-facing errors/confirmations
9. **Mobile Responsive**: Test UI changes on mobile viewport sizes
10. **Documentation**: Update README.md if adding significant features

## Key Files Reference

- **server.js** (3090 lines): All backend logic, API routes, Docker management
- **public/index.html** (3218 lines): Entire frontend SPA
- **public/styles.css**: Tailwind input file (builds to output.css)
- **package.json**: Dependencies and npm scripts
- **ecosystem.config.js**: PM2 configuration
- **setup-websocket.js**: WebSocket setup utility
- **Dockerfile**: Container definition for the manager itself
- **.env**: Environment configuration (not in repo, see env.txt)

## Related Documentation

- [itzg/docker-minecraft-bedrock-server](https://github.com/itzg/docker-minecraft-bedrock-server)
- [Dockerode API](https://github.com/apocas/dockerode)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Minecraft Bedrock Addon Documentation](https://learn.microsoft.com/en-us/minecraft/creator/)

---

**Last Updated**: February 2026
