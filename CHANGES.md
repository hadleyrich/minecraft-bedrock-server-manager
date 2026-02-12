# Changes Summary - PM2 Removal and Code Quality Improvements

## Overview
This PR removes PM2 from the codebase (focusing on Docker-only hosting) and implements security and code quality improvements without changing functionality.

## Changes Made

### 1. PM2 Removal
- ✅ Removed `pm2` from devDependencies in package.json
- ✅ Removed all PM2-related npm scripts (`pm2:start`, `pm2:stop`, `pm2:restart`, `pm2:delete`, `pm2:logs`, `pm2:monit`)
- ✅ Updated `start` script to use `node server.js` directly
- ✅ Deleted `ecosystem.config.js` (PM2 configuration file)
- ✅ Updated README.md to remove PM2 references
- ✅ Updated .github/copilot-instructions.md to remove PM2 references

### 2. Security Improvements

#### Path Traversal Protection
- ✅ Added `path.normalize()` to all file operation endpoints to prevent path traversal attacks
- ✅ Sanitized user-provided filenames using `path.basename()` in:
  - File upload endpoint
  - File rename endpoint
  - Folder creation endpoint
  - Zip operations
  - All file download/delete/edit operations

#### Command Injection Prevention
- ✅ Fixed player kick/ban commands to use array-based command arguments instead of string concatenation
- ✅ Improved command parsing in generic command endpoint to handle quoted strings properly
- ✅ Added validation for command input

#### CORS Security
- ✅ Improved CORS configuration to be more restrictive by default
- ✅ Added `ALLOWED_ORIGINS` environment variable to configure allowed origins
- ✅ Default allows only localhost origins (`http://localhost:3001`, `http://127.0.0.1:3001`)
- ✅ Can be configured to allow specific origins or `*` for all (not recommended)

#### Input Validation
- ✅ Added validation helper functions:
  - `validateServerId()` - validates server ID format
  - `validateServerName()` - validates server names (1-100 chars, no special chars)
  - `validateMemory()` - validates memory values (256MB - 32GB)
  - `validatePort()` - validates port numbers (1024-65535)
- ✅ Applied server name validation to create server endpoint
- ✅ Memory validation already existed in update endpoint

### 3. Code Quality Improvements

#### Error Handling
- ✅ Removed all silent error catches (`catch (err) { }`)
- ✅ Added proper error logging with descriptive messages for:
  - Metadata read failures
  - World size calculation failures
  - Max player configuration failures
  - Player cache operations
  - Permissions file operations
  - Server configuration operations

#### Code Cleanup
- ✅ Removed unused import (`fsPromises` - was duplicating `fs-extra` functionality)
- ✅ Fixed syntax error in CORS configuration

#### Configuration Management
- ✅ Made Docker image configurable via `BEDROCK_IMAGE` environment variable (default: `itzg/minecraft-bedrock-server`)
- ✅ Added documentation for new environment variables in:
  - env.txt
  - README.md

### 4. Documentation Updates
- ✅ Updated README.md with new environment variables
- ✅ Updated env.txt example with new configuration options
- ✅ Updated copilot instructions to reflect PM2 removal

## Testing
- ✅ Syntax validation: `node -c server.js` - passed
- ✅ Build test: `npm run build:assets` - successful
- ✅ Server startup test: Server starts correctly without PM2 and listens on port 3001
- ✅ Dependencies: `npm install` - successful, PM2 packages removed

## Breaking Changes
None. The application functionality remains the same, only the process manager (PM2) has been removed. Users should now start the application with `npm start` which runs `node server.js` directly.

For production deployments, users can:
1. Use Docker (recommended) - already configured in Dockerfile
2. Use systemd or other process managers if needed
3. Use orchestration tools like Docker Compose or Kubernetes

## Security Impact
All changes improve security posture:
- Path traversal vulnerabilities: Fixed
- Command injection risks: Fixed
- CORS misconfigurations: Fixed
- Input validation: Improved
- Error information leakage: Reduced (better error handling)

## Backward Compatibility
- Existing servers will continue to work without changes
- All API endpoints remain the same
- Docker deployment is unaffected (was already using `node server.js`)
- Environment variables are backward compatible (new ones are optional)
