# Docker Hub Webhook Proxy

A TypeScript-based Netlify Functions service that receives Docker Hub webhooks and forwards them as GitHub repository dispatch events to trigger automated deployment workflows.

## 🎯 Overview

This webhook proxy service acts as a bridge between Docker Hub and GitHub Actions, enabling automated deployments when new Docker images are pushed. It transforms Docker Hub webhook payloads into GitHub repository dispatch events, allowing your existing GitHub Actions workflows to respond to Docker image updates.

### Architecture Flow

```
Docker Hub → Netlify Function → GitHub Repository Dispatch → GitHub Actions
```

## 🚀 Features

- **Webhook Transformation**: Converts Docker Hub webhooks to GitHub repository dispatch format
- **Service Mapping**: Maps Docker Hub repositories to internal service names
- **Environment Detection**: Automatically detects staging vs production based on image tags
- **Comprehensive Logging**: Configurable logging with request/response tracking
- **Error Handling**: Robust error handling with meaningful error messages
- **Configuration Management**: Environment-based configuration with validation
- **Modular Architecture**: Clean, maintainable TypeScript modules

## 📋 Supported Repositories

The service currently supports the following Docker Hub repositories:

| Docker Hub Repository | Internal Service Name |
| --------------------- | --------------------- |
| `est-webapp`          | `webapp`              |
| `est-server`          | `server-core`         |
| `est-pricing-server`  | `server-pricing`      |
| `est-landing`         | `landing`             |

## 🏗️ Project Structure

```
webhook-proxy/
├── netlify/
│   └── functions/
│       └── docker-webhook/
│           ├── index.mts              # Main function handler
│           ├── types.ts               # Type definitions
│           ├── validator.ts           # Payload validation
│           ├── service-mapper.ts      # Repository mapping
│           ├── environment-detector.ts # Environment detection
│           ├── transformer.ts         # Payload transformation
│           ├── github.ts              # GitHub API client
│           └── config.ts              # Configuration management
├── netlify.toml                       # Netlify configuration
├── package.json                       # Node.js dependencies
├── go.mod                            # Go module (compatibility)
├── .gitignore                        # Git ignore rules
└── README.md                         # This documentation
```

## ⚙️ Environment Variables

Configure the following environment variables in your Netlify deployment:

### Required Variables

| Variable       | Description                                    | Example            |
| -------------- | ---------------------------------------------- | ------------------ |
| `GITHUB_TOKEN` | GitHub Personal Access Token with `repo` scope | `ghp_xxxxxxxxxxxx` |

### Optional Variables

| Variable                     | Description                                      | Default            |
| ---------------------------- | ------------------------------------------------ | ------------------ |
| `GITHUB_OWNER`               | GitHub repository owner                          | `Estatemanner`     |
| `GITHUB_REPO`                | Target GitHub repository name                    | `cadastral-deploy` |
| `LOG_LEVEL`                  | Logging level (`debug`, `info`, `warn`, `error`) | `info`             |
| `ENABLE_REQUEST_LOGGING`     | Enable detailed request logging                  | `false`            |
| `ENABLE_PERFORMANCE_LOGGING` | Enable performance metrics logging               | `true`             |
| `MAX_PAYLOAD_SIZE`           | Maximum webhook payload size in bytes            | `1048576` (1MB)    |
| `WEBHOOK_TIMEOUT_MS`         | Webhook processing timeout in milliseconds       | `30000` (30s)      |

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+
- Netlify CLI
- GitHub Personal Access Token
- Docker Hub webhook access

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/Estatemanner/webhook-proxy.git
   cd webhook-proxy
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the project root:

   ```bash
   GITHUB_TOKEN=your_github_token_here
   GITHUB_OWNER=Estatemanner
   GITHUB_REPO=cadastral-deploy
   LOG_LEVEL=debug
   ENABLE_REQUEST_LOGGING=true
   ```

4. **Start local development server**

   ```bash
   pnpm dev
   ```

5. **Test the webhook endpoint**
   ```bash
   curl -X POST http://localhost:8888/webhook/docker-hub \
     -H "Content-Type: application/json" \
     -d '{
       "repository": {
         "repo_name": "est-webapp",
         "full_name": "estatemanner/est-webapp",
         "owner": "estatemanner"
       },
       "push_data": {
         "tag": "v1.0.0",
         "pusher": "developer"
       }
     }'
   ```

### Production Deployment

1. **Connect to Netlify**

   - Link your repository to Netlify
   - Configure build settings:
     - Build command: `echo 'No build required for TypeScript functions'`
     - Functions directory: `netlify/functions`

2. **Set environment variables**
   In your Netlify dashboard, configure the required environment variables listed above.

3. **Deploy**

   ```bash
   pnpm deploy
   ```

4. **Configure Docker Hub webhooks**
   - Go to your Docker Hub repository settings
   - Add webhook URL: `https://your-netlify-site.netlify.app/webhook/docker-hub`
   - Set content type to `application/json`

## 📡 API Documentation

### Webhook Endpoint

**URL:** `POST /webhook/docker-hub`

**Content-Type:** `application/json`

### Request Format

```json
{
  "repository": {
    "repo_name": "est-webapp",
    "full_name": "estatemanner/est-webapp",
    "owner": "estatemanner"
  },
  "push_data": {
    "tag": "v1.0.0",
    "pusher": "developer",
    "pushed_at": 1640995200
  },
  "callback_url": "https://registry.hub.docker.com/u/estatemanner/est-webapp/hook/callback/"
}
```

### Response Format

#### Success Response (200)

```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "service": "webapp",
  "environment": "production",
  "processing_time_ms": 245
}
```

#### Error Responses

**400 Bad Request - Invalid Payload**

```json
{
  "error": "Invalid payload",
  "details": ["Missing repository.repo_name", "Missing push_data.tag"]
}
```

**405 Method Not Allowed**

```json
{
  "error": "Method not allowed",
  "allowed": ["POST"]
}
```

**500 Internal Server Error**

```json
{
  "error": "Internal server error",
  "message": "GitHub API error: 401 - Bad credentials",
  "processing_time_ms": 123
}
```

## 🎯 Environment Detection

The service automatically detects the deployment environment based on Docker image tags using specific patterns:

### Production Environment

Tags that indicate production deployment:

- **Semantic versions**: `v1.2.3`, `v2.0.1`, `v10.5.2`
- Pattern: `v{major}.{minor}.{patch}`

### Staging Environment

Tags that indicate staging deployment:

- **Semantic versions with `-stg` suffix**: `v1.2.3-stg`, `v2.0.1-stg`, `v10.5.2-stg`
- **Semantic versions with `-uat` suffix**: `v1.2.3-uat`, `v2.0.1-uat`, `v10.5.2-uat`
- Patterns: `v{major}.{minor}.{patch}-stg` or `v{major}.{minor}.{patch}-uat`

**Default:** Any tag that doesn't match these exact patterns defaults to `staging` environment.

### Examples

| Tag          | Environment       | Valid |
| ------------ | ----------------- | ----- |
| `v1.0.0`     | production        | ✅    |
| `v2.1.3-stg` | staging           | ✅    |
| `v2.1.3-uat` | staging           | ✅    |
| `v10.5.2`    | production        | ✅    |
| `v1.0.0-stg` | staging           | ✅    |
| `v1.0.0-uat` | staging           | ✅    |
| `latest`     | staging (default) | ⚠️    |
| `v1.0`       | staging (default) | ⚠️    |
| `staging`    | staging (default) | ⚠️    |

## 🔧 Troubleshooting

### Common Issues

#### 1. "GitHub API error: 401 - Bad credentials"

- **Cause:** Invalid or missing GitHub token
- **Solution:**
  - Verify `GITHUB_TOKEN` environment variable is set
  - Ensure token has `repo` scope permissions
  - Check token hasn't expired

#### 2. "Unsupported repository: repository-name"

- **Cause:** Docker Hub repository not in supported list
- **Solution:** Add repository mapping in `service-mapper.ts`

#### 3. "Configuration validation failed"

- **Cause:** Missing or invalid environment variables
- **Solution:** Check all required environment variables are properly set

#### 4. Webhook not triggering GitHub Actions

- **Cause:** Repository dispatch event not reaching GitHub
- **Solution:**
  - Verify GitHub repository and owner names
  - Check GitHub Actions workflow listens for `docker-hub-webhook` event
  - Enable debug logging to see dispatch payload

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Set environment variable
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true
```

This will log:

- Configuration details (without sensitive data)
- Incoming webhook payloads
- Transformation results
- GitHub API requests/responses

### GitHub Actions Integration

Your GitHub Actions workflow should listen for the repository dispatch event:

```yaml
name: Deploy on Docker Hub Update
on:
  repository_dispatch:
    types: [docker-hub-webhook]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Get deployment info
        run: |
          echo "Service: ${{ github.event.client_payload.repository.repo_name }}"
          echo "Environment: ${{ github.event.client_payload.environment }}"
          echo "Tag: ${{ github.event.client_payload.push_data.tag }}"
          echo "Pusher: ${{ github.event.client_payload.push_data.pusher }}"
```

## 📊 Monitoring

### Netlify Function Logs

Monitor webhook processing in Netlify dashboard:

- Go to Functions tab
- Select `docker-webhook` function
- View real-time logs and metrics

### Performance Metrics

When `ENABLE_PERFORMANCE_LOGGING=true`:

- Processing time for each webhook
- Success/failure rates
- GitHub API response times

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes following the modular architecture
4. Test locally with `pnpm dev`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [cadastral-deploy](https://github.com/Estatemanner/cadastral-deploy) - Target deployment repository
- [Docker Hub Webhooks Documentation](https://docs.docker.com/docker-hub/webhooks/)
- [GitHub Repository Dispatch API](https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event)

---

**Maintained by:** EstateManner Team
**Last Updated:** 2024-12-21
