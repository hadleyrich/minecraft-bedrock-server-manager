#!/bin/sh
set -e

# Setup docker socket access if socket exists and running as root
if [ "$(id -u)" -eq 0 ]; then
    echo "[entrypoint] Running as root (UID 0) - setting up Docker socket access..."
    
    if [ -S /var/run/docker.sock ]; then
        DOCKER_GID=$(stat -c %g /var/run/docker.sock 2>/dev/null || stat -f%g /var/run/docker.sock 2>/dev/null || echo "0")
        echo "[entrypoint] Docker socket detected with GID: $DOCKER_GID"
        
        if [ "$DOCKER_GID" != "0" ]; then
            # Check if a group with this GID already exists
            if ! getent group "$DOCKER_GID" > /dev/null; then
                # Check if 'docker' group exists
                if getent group docker > /dev/null; then
                    echo "[entrypoint] Removing existing 'docker' group..."
                    # Delete the existing docker group and recreate with correct GID
                    delgroup docker || true
                fi
                # Create docker group with the socket's GID
                echo "[entrypoint] Creating 'docker' group with GID $DOCKER_GID..."
                addgroup -g "$DOCKER_GID" docker
            else
                # Group exists, rename it to 'docker' if it's not already
                EXISTING_GROUP=$(getent group "$DOCKER_GID" | cut -d: -f1)
                echo "[entrypoint] Group with GID $DOCKER_GID already exists: $EXISTING_GROUP"
                if [ "$EXISTING_GROUP" != "docker" ]; then
                    echo "[entrypoint] Renaming group $EXISTING_GROUP to 'docker'..."
                    delgroup "$EXISTING_GROUP" || true
                    addgroup -g "$DOCKER_GID" docker
                fi
            fi
            
            # Add node user to the docker group
            echo "[entrypoint] Adding 'node' user to 'docker' group..."
            addgroup node docker
        else
            echo "[entrypoint] Warning: Could not determine Docker socket GID"
        fi
    else
        echo "[entrypoint] Docker socket not found at /var/run/docker.sock"
    fi
    
    # Switch to node user for running the application
    echo "[entrypoint] Dropping privileges and switching to 'node' user..."
    exec su-exec node "$@"
else
    CURRENT_USER=$(id -un)
    echo "[entrypoint] Already running as non-root user: $CURRENT_USER (UID $(id -u))"
    exec "$@"
fi
