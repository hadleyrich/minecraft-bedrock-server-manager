## Minecraft Bedrock Server Manager

Full-stack application to manage multiple Minecraft Bedrock servers using itzg/docker-minecraft-bedrock-server.

## How it works

The aplication will deploy a minecraft bedrock server using docker itzg/docker-minecraft-bedrock-server latest image, assign port, persistent volume. The aplication then act as UI to manage this container.

### Features

- ✅ Real-time WebSocket Updates
- ✅ Multiple server management
- ✅ Imprt current itzg container server
- ✅ Select server version (Latest, Latest Preview or custom)
- ✅ Start/Stop/Restart containers
- ✅ Server renaming
- ✅ Console command
- ✅ Allocate container memory/ram
- ✅ Advanced File Manager
  - Upload multiple files
  - Download files
  - Delete files/folders
  - Rename files/folders
  - Edit files inline (text editor)
  - Create new folders
  - Navigate folder structure
  - Context menu (right-click)
  - Zip/Unzip files and folders
  - Keyboard shortcuts
- ✅ Addon Management
  - Upload .mcaddon, .mcpack, .mcworld, .mctemplate files
  - Enable/disable addon
  - Automatic manifest parsing
  - View installed worlds
  - Switch between worlds
  - Delete worlds
- ✅ Backup & restore worlds
- ✅ Server configuration editor
- ✅ Player management (kick, ban, op, deop)
- ✅ Dynamic port allocation
- ✅ Docker network configuration
- ✅ Web-based UI
- ✅ Password-protected login
- ✅ Session-based authentication
- ✅ Mobile responsive design

### Addon Management Updates

**Combined Addon List System**

- Addons are now displayed as a unified list instead of separate behavior and resource pack tabs
- Each addon shows type indicators: `BP` (Behavior Pack), `RP` (Resource Pack), or `BP + RP` (both types)
- Enable/disable and delete operations work on both pack types simultaneously

### Docker Network Configuration

**Custom Network Support**

- Specify a Docker network for server containers via environment variable or per-server configuration
- Set `DOCKER_NETWORK=your-network-name` in `.env` to apply to all new servers by default
- Optionally specify a network when creating individual servers through the UI
- Useful for isolating servers or enabling communication between containers on the same network
- Existing servers continue using their configured network (or default if none)

**Macvlan/IPvlan Network Support**

- Full support for macvlan and ipvlan networks where containers get their own IP addresses
- When using macvlan/ipvlan networks:
  - Containers bypass port mapping and bind directly to the standard Minecraft port (19132/udp)
  - Each server gets its own IP address on your local network
  - Servers automatically appear as LAN games to Minecraft clients on the same network
  - Multiple servers can all use port 19132 since each has a unique IP
  - The UI displays the container's IP address instead of host:port mappings

**Example Use Cases:**

- **Bridge Network (default)**: Traditional port-mapped containers (19132, 19133, 19134...)
- **Macvlan Network**: Containers appear as separate devices on your LAN with their own IPs
- **Custom Bridge/Overlay**: Multiple servers sharing a custom network for inter-server communication
- **Isolation**: Separation of game servers from other Docker containers

**Creating a Macvlan Network:**

```bash
# Create a macvlan network (adjust subnet/gateway to match your network)
docker network create -d macvlan \
  --subnet=192.168.1.0/24 \
  --gateway=192.168.1.1 \
  -o parent=eth0 \
  minecraft-macvlan

# Then set in .env:
DOCKER_NETWORK=minecraft-macvlan
```

**Note:** Macvlan containers may not be reachable from the Docker host itself due to network isolation. Access them from other devices on your LAN.

### WebSocket Real-time Features

This application uses WebSocket for real-time updates, providing instant UI synchronization across multiple browser tabs without manual refresh.

- **Automatic Fallback**: If WebSocket connection fails, the app automatically falls back to HTTP polling (30-second intervals)
- **Cross-tab Sync**: Changes made in one browser tab instantly appear in all other open tabs

- **Network Requirements**: WebSocket uses the same port as the HTTP server (default: 3001)
- **Firewall**: Ensure port 3001 is open for both HTTP and WebSocket connections

---

### Linux Installation

#### Prerequisites

- Docker installed
- Node.js 18+

Download the source code

#### 1. **Install Dependencies**

```bash
# Install backend dependencies (includes WebSocket support)
npm install


```

#### 2. **Configure Environment**

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=3001
DATA_DIR=/opt/minecraft-servers #change this to your data directory

# Docker Configuration (Optional)
# Specify a Docker network for containers to use
# Leave commented to use Docker's default bridge network
#DOCKER_NETWORK=minecraft-network

# Authentication
LOGIN_PASSWORD=your_secure_password_here
MAX_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=5
```

#### 3. **Create Data Directory**

```bash
# Create directory for server data
sudo mkdir -p /opt/minecraft-servers #change this to your data directory
sudo chown $USER:$USER /opt/minecraft-servers #change this to your data directory
```

#### 4. **Start the Application**

```bash
# Start the app (run on PM2)
npm start
```

**Access the application at: `http://localhost:3001`**

---

### Docker Deployment

#### Prerequisites

- Docker installed
- Docker Compose installed

#### Docker Desktop Configuration

1. Open Docker Desktop
2. Go to Settings → General
3. Enable "Expose daemon on tcp://localhost:2375 without TLS"
4. Restart Docker Desktop

#### Docker Images

This project provides Docker images through multiple registries:

- **Docker Hub**: https://hub.docker.com/r/mugh/bdsmanagerforitzg
- **GitHub Container Registry (GHCR)**: `ghcr.io/hadleyrich/minecraft-bedrock-server-manager:latest`

The GHCR images are automatically built and published via GitHub Actions on every push to the main branch and for tagged releases.

**Available Tags:**
- `latest` - Latest build from the main/master branch
- `v1.0.0` - Semantic version tags (when releases are created)
- `main`, `master` - Branch-specific tags

**Multi-platform Support:**
Both Docker Hub and GHCR images support multiple architectures:
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64/aarch64)

#### Docker Compose Example

**Using Docker Hub:**

```yaml
services:
  server-manager:
    image: mugh/bdsmanagerforitzg:latest
    ports:
      - "3001:3001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - minecraft-data:/app/minecraft-data
    environment:
      - PORT=3001
      - LOGIN_PASSWORD=minecraft123
      - MAX_LOGIN_ATTEMPTS=5
      - LOGIN_LOCKOUT_MINUTES=5
      #- DOCKER_HOST=tcp://host.docker.internal:2375 #for system with restricted direct mounting to /var/run/docker.sock (windows or NAS)
    networks:
      - minecraft-network

volumes:
  minecraft-data:

networks:
  minecraft-network:
    driver: bridge
```

**Using GitHub Container Registry (GHCR):**

```yaml
services:
  server-manager:
    image: ghcr.io/hadleyrich/minecraft-bedrock-server-manager:latest
    ports:
      - "3001:3001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - minecraft-data:/app/minecraft-data
    environment:
      - PORT=3001
      - LOGIN_PASSWORD=minecraft123
      - MAX_LOGIN_ATTEMPTS=5
      - LOGIN_LOCKOUT_MINUTES=5
      #- DOCKER_HOST=tcp://host.docker.internal:2375 #for system with restricted direct mounting to /var/run/docker.sock (windows or NAS)
    networks:
      - minecraft-network

volumes:
  minecraft-data:

networks:
  minecraft-network:
    driver: bridge
```

#### Access the application

The application will be available at `http://localhost:3001`
Default login password: `minecraft123` (change in environtment variables)

#### Environment Variables

You can customize the deployment by editing the `docker-compose.yml` file:

- `LOGIN_PASSWORD`: Set your desired password
- `PORT`: Change the port if needed (default: 3001)
- `MAX_LOGIN_ATTEMPTS`: Maximum failed login attempt
- `LOGIN_LOCKOUT_MINUTES`: duration of lockout in case or reaching MAX_LOGIN_ATTEMPTS

#### Volumes

- `minecraft-data`: Persistent storage for Minecraft server data
- `/var/run/docker.sock`: Allows the app to manage Docker containers

---

## [SUPPORT ME](https://sociabuzz.com/mughniy/donate)

## Screenshot

![enter image description here](https://github.com/mugh/minecraftbedrockservermanager/blob/main/Screenshot/sc1.png?raw=true)
![enter image description here](https://github.com/mugh/minecraftbedrockservermanager/blob/main/Screenshot/sc2.png?raw=true)
![enter image description here](https://github.com/mugh/minecraftbedrockservermanager/blob/main/Screenshot/sc3.png?raw=true)
![enter image description here](https://github.com/mugh/minecraftbedrockservermanager/blob/main/Screenshot/sc4.png?raw=true)
