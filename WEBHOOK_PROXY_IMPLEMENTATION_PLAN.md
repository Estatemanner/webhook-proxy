# Docker Hub Webhook Proxy - Comprehensive Implementation Plan

## 🎯 **Project Overview**

**Goal:** Create a Golang-based Netlify Functions webhook proxy that receives Docker Hub webhooks and forwards them as GitHub repository dispatch events to trigger existing GitHub Actions workflows.

**Repository:** `Estatemanner/webhook-proxy` (new repository)

## 📋 **Technical Analysis**

### **Architecture Flow**
```
Docker Hub → Netlify Function (Go) → GitHub Repository Dispatch → GitHub Actions
```

### **Technology Stack**
- **Language:** Golang
- **Platform:** Netlify Functions (Serverless)
- **Input:** Docker Hub webhook payload (JSON)
- **Output:** GitHub repository dispatch API calls
- **Authentication:** GitHub Personal Access Token

### **Key Components**
1. **HTTP Handler** - Receive and validate webhooks
2. **Payload Transformer** - Convert Docker Hub → GitHub format
3. **Service Mapper** - Map Docker repos to service names
4. **Environment Detector** - Determine staging vs production
5. **GitHub API Client** - Send repository dispatch events
6. **Error Handler** - Structured error responses and logging

## 🏗️ **Project Structure**

```
webhook-proxy/
├── netlify/
│   └── functions/
│       └── docker-webhook/
│           ├── index.mts                 # Main function handler
│           ├── types.ts                  # Type definitions
│           ├── transformer.ts            # Payload transformation
│           ├── github.ts                 # GitHub API client
│           └── config.ts                 # Configuration management
├── go.mod                                # Go module definition
├── go.sum                                # Go dependencies
├── netlify.toml                          # Netlify configuration
├── .gitignore                            # Git ignore rules
├── README.md                             # Documentation
└── tests/
    ├── unit/                             # Unit tests
    ├── integration/                      # Integration tests
    └── fixtures/                         # Test data
```

## 🔧 **Implementation Plan**

### **Phase 1: Project Setup (Day 1)**

#### **1.1 Repository Creation**
- [ ] Create new repository `Estatemanner/webhook-proxy`
- [ ] Initialize with Go module
- [ ] Set up basic project structure
- [ ] Configure `.gitignore` for Go and Netlify

#### **1.2 Netlify Configuration**
- [ ] Create `netlify.toml` configuration
- [ ] Set up function directory structure
- [ ] Configure build settings for Go functions

#### **1.3 Development Environment**
- [ ] Set up local development environment
- [ ] Install Netlify CLI
- [ ] Configure environment variables for testing

### **Phase 2: Core Implementation (Days 2-3)**

#### **2.1 Type Definitions**
```typescript
// types.ts
interface DockerHubPayload {
  repository: {
    repo_name: string;
    full_name: string;
    owner: string;
  };
  push_data: {
    tag: string;
    pusher: string;
    pushed_at: number;
  };
}

interface GitHubDispatchPayload {
  event_type: string;
  client_payload: {
    repository: {
      repo_name: string;
    };
    push_data: {
      tag: string;
      pusher: string;
    };
  };
}
```

#### **2.2 Main Function Handler**
```typescript
// index.mts
import type { Context, Config } from "@netlify/functions";
import { transformPayload } from "./transformer";
import { sendToGitHub } from "./github";
import { validatePayload } from "./validator";

export default async (req: Request, context: Context) => {
  try {
    // Validate HTTP method
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Parse and validate payload
    const dockerPayload = await req.json();
    const validationResult = validatePayload(dockerPayload);
    
    if (!validationResult.valid) {
      return new Response(
        JSON.stringify({ error: validationResult.error }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Transform payload
    const githubPayload = transformPayload(dockerPayload);
    
    // Send to GitHub
    const result = await sendToGitHub(githubPayload);
    
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const config: Config = {
  path: "/webhook/docker-hub"
};
```

#### **2.3 Payload Transformation Logic**
```typescript
// transformer.ts
export function transformPayload(dockerPayload: DockerHubPayload): GitHubDispatchPayload {
  const serviceName = mapRepositoryToService(dockerPayload.repository.repo_name);
  const environment = detectEnvironment(dockerPayload.push_data.tag);
  
  return {
    event_type: 'docker-hub-webhook',
    client_payload: {
      repository: {
        repo_name: serviceName
      },
      push_data: {
        tag: dockerPayload.push_data.tag,
        pusher: dockerPayload.push_data.pusher
      },
      environment: environment
    }
  };
}

function mapRepositoryToService(repoName: string): string {
  const serviceMap: Record<string, string> = {
    'est-webapp': 'webapp',
    'est-server': 'server-core', 
    'est-pricing-server': 'server-pricing',
    'est-landing': 'landing'
  };
  
  return serviceMap[repoName] || 'unknown';
}

function detectEnvironment(tag: string): string {
  // Semantic version pattern (v1.2.3) = production
  const semanticVersionPattern = /^v\d+\.\d+\.\d+$/;
  return semanticVersionPattern.test(tag) ? 'production' : 'staging';
}
```

### **Phase 3: GitHub Integration (Day 4)**

#### **3.1 GitHub API Client**
```typescript
// github.ts
export async function sendToGitHub(payload: GitHubDispatchPayload): Promise<boolean> {
  const githubToken = Netlify.env.get('GITHUB_TOKEN');
  const repoOwner = 'Estatemanner';
  const repoName = 'cadastral-deploy';
  
  if (!githubToken) {
    throw new Error('GitHub token not configured');
  }

  const response = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'EstateManner-Webhook-Proxy/1.0'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
  }

  return true;
}
```

### **Phase 4: Configuration & Environment (Day 5)**

#### **4.1 Environment Variables**
```typescript
// config.ts
export interface Config {
  githubToken: string;
  githubRepo: string;
  githubOwner: string;
  logLevel: string;
}

export function getConfig(): Config {
  return {
    githubToken: Netlify.env.get('GITHUB_TOKEN') || '',
    githubRepo: Netlify.env.get('GITHUB_REPO') || 'cadastral-deploy',
    githubOwner: Netlify.env.get('GITHUB_OWNER') || 'Estatemanner',
    logLevel: Netlify.env.get('LOG_LEVEL') || 'info'
  };
}
```

#### **4.2 Netlify Configuration**
```toml
# netlify.toml
[build]
  command = "go mod tidy"
  functions = "netlify/functions"

[functions]
  directory = "netlify/functions"

[[headers]]
  for = "/webhook/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

## 🧪 **Testing Strategy**

### **Unit Tests**
- Payload validation functions
- Service mapping logic
- Environment detection logic
- Error handling scenarios

### **Integration Tests**
- End-to-end webhook processing
- GitHub API integration
- Error response handling

### **Local Testing**
```bash
# Start local development server
netlify dev

# Test webhook endpoint
curl -X POST http://localhost:8888/webhook/docker-hub \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

## 🚀 **Deployment Plan**

### **Environment Variables (Netlify)**
- `GITHUB_TOKEN` - GitHub Personal Access Token
- `GITHUB_REPO` - Target repository name
- `GITHUB_OWNER` - Repository owner
- `LOG_LEVEL` - Logging level (info, debug, error)

### **Deployment Steps**
1. Connect repository to Netlify
2. Configure build settings
3. Set environment variables
4. Deploy to production
5. Update Docker Hub webhook URLs

## 📚 **Documentation Requirements**

### **README.md**
- Project overview and purpose
- Setup and deployment instructions
- Environment variable configuration
- API documentation
- Troubleshooting guide

### **API Documentation**
- Webhook endpoint specification
- Request/response formats
- Error codes and messages
- Example payloads

## 🔍 **Monitoring & Maintenance**

### **Logging Strategy**
- Structured JSON logging
- Request/response logging
- Error tracking and alerting
- Performance metrics

### **Error Handling**
- Graceful error responses
- Retry logic for GitHub API
- Validation error messages
- Rate limiting protection

## ⏱️ **Timeline Summary**

- **Day 1:** Project setup and repository creation
- **Day 2-3:** Core implementation (handlers, transformation, validation)
- **Day 4:** GitHub API integration and testing
- **Day 5:** Configuration, deployment, and documentation
- **Day 6:** Testing, debugging, and final deployment

## 🎯 **Success Criteria**

- [ ] Webhook proxy receives Docker Hub webhooks successfully
- [ ] Payload transformation works correctly for all services
- [ ] GitHub repository dispatch events trigger existing workflows
- [ ] Error handling provides meaningful feedback
- [ ] Documentation is complete and accurate
- [ ] All tests pass in local and deployed environments

This implementation plan provides a comprehensive roadmap for building your Docker Hub webhook proxy service with Golang and Netlify Functions!
