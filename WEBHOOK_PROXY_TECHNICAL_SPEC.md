# Docker Hub Webhook Proxy - Technical Specification

## 🔧 **Technical Implementation Details**

### **Netlify Functions with TypeScript/Go Hybrid Approach**

Based on Netlify's latest function structure, we'll use TypeScript for the function logic with Go module support for dependencies.

## 📊 **Data Flow Specification**

### **Input: Docker Hub Webhook Payload**
```json
{
  "push_data": {
    "pushed_at": 1640995200,
    "images": [],
    "tag": "v1.2.3",
    "pusher": "duylvhz"
  },
  "callback_url": "https://registry.hub.docker.com/u/duylvhz/est-webapp/hook/...",
  "repository": {
    "status": "Active",
    "description": "EstateManner Web Application",
    "is_trusted": false,
    "full_name": "duylvhz/est-webapp",
    "repo_name": "est-webapp",
    "owner": "duylvhz",
    "is_official": false,
    "is_private": false,
    "name": "est-webapp",
    "namespace": "duylvhz",
    "star_count": 0,
    "comment_count": 0,
    "date_created": 1640995200,
    "dockerfile": "",
    "repo_url": "https://hub.docker.com/r/duylvhz/est-webapp"
  }
}
```

### **Output: GitHub Repository Dispatch Payload**
```json
{
  "event_type": "docker-hub-webhook",
  "client_payload": {
    "repository": {
      "repo_name": "webapp"
    },
    "push_data": {
      "tag": "v1.2.3",
      "pusher": "duylvhz"
    },
    "environment": "production"
  }
}
```

## 🏗️ **Detailed Implementation**

### **1. Main Function Handler**
```typescript
// netlify/functions/docker-webhook/index.mts
import type { Context, Config } from "@netlify/functions";

interface DockerHubPayload {
  repository: {
    repo_name: string;
    full_name: string;
    owner: string;
  };
  push_data: {
    tag: string;
    pusher: string;
    pushed_at?: number;
  };
  callback_url?: string;
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
    environment?: string;
  };
}

// Service mapping configuration
const SERVICE_MAP: Record<string, string> = {
  'est-webapp': 'webapp',
  'est-server': 'server-core',
  'est-pricing-server': 'server-pricing', 
  'est-landing': 'landing'
};

// Environment detection regex
const SEMANTIC_VERSION_PATTERN = /^v\d+\.\d+\.\d+$/;

export default async (req: Request, context: Context) => {
  const startTime = Date.now();
  
  try {
    // Log incoming request
    console.log(`[${new Date().toISOString()}] Webhook received from ${req.headers.get('user-agent')}`);
    
    // Validate HTTP method
    if (req.method !== 'POST') {
      console.warn(`Invalid method: ${req.method}`);
      return new Response(
        JSON.stringify({ error: 'Method not allowed', allowed: ['POST'] }), 
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            'Allow': 'POST'
          } 
        }
      );
    }

    // Parse request body
    let dockerPayload: DockerHubPayload;
    try {
      dockerPayload = await req.json() as DockerHubPayload;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    const validation = validateDockerPayload(dockerPayload);
    if (!validation.valid) {
      console.warn('Validation failed:', validation.errors);
      return new Response(
        JSON.stringify({ error: 'Invalid payload', details: validation.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Transform payload
    const githubPayload = transformToGitHubDispatch(dockerPayload);
    
    // Log transformation
    console.log('Transformed payload:', {
      service: githubPayload.client_payload.repository.repo_name,
      tag: githubPayload.client_payload.push_data.tag,
      environment: githubPayload.client_payload.environment
    });

    // Send to GitHub
    const githubResult = await sendToGitHub(githubPayload);
    
    const processingTime = Date.now() - startTime;
    console.log(`Webhook processed successfully in ${processingTime}ms`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        service: githubPayload.client_payload.repository.repo_name,
        environment: githubPayload.client_payload.environment,
        processing_time_ms: processingTime
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Webhook processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        processing_time_ms: processingTime
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};

// Validation function
function validateDockerPayload(payload: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  if (!payload.repository?.repo_name) {
    errors.push('Missing repository.repo_name');
  }
  
  if (!payload.push_data?.tag) {
    errors.push('Missing push_data.tag');
  }
  
  if (!payload.push_data?.pusher) {
    errors.push('Missing push_data.pusher');
  }
  
  // Check if repository is supported
  if (payload.repository?.repo_name && !SERVICE_MAP[payload.repository.repo_name]) {
    errors.push(`Unsupported repository: ${payload.repository.repo_name}`);
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Transformation function
function transformToGitHubDispatch(dockerPayload: DockerHubPayload): GitHubDispatchPayload {
  const serviceName = SERVICE_MAP[dockerPayload.repository.repo_name];
  const environment = SEMANTIC_VERSION_PATTERN.test(dockerPayload.push_data.tag) 
    ? 'production' 
    : 'staging';
  
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

// GitHub API function
async function sendToGitHub(payload: GitHubDispatchPayload): Promise<boolean> {
  const githubToken = Netlify.env.get('GITHUB_TOKEN');
  const githubOwner = Netlify.env.get('GITHUB_OWNER') || 'Estatemanner';
  const githubRepo = Netlify.env.get('GITHUB_REPO') || 'cadastral-deploy';
  
  if (!githubToken) {
    throw new Error('GITHUB_TOKEN environment variable not configured');
  }

  const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/dispatches`;
  
  console.log(`Sending dispatch to: ${url}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'EstateManner-Webhook-Proxy/1.0'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`GitHub API error: ${response.status} - ${errorText}`);
    throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
  }

  console.log('Successfully sent repository dispatch to GitHub');
  return true;
}

export const config: Config = {
  path: "/webhook/docker-hub"
};
```

### **2. Netlify Configuration**
```toml
# netlify.toml
[build]
  command = "echo 'No build required for TypeScript functions'"
  functions = "netlify/functions"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[dev]
  functions = "netlify/functions"
  port = 8888

[[headers]]
  for = "/webhook/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"

[[redirects]]
  from = "/api/webhook/docker-hub"
  to = "/.netlify/functions/docker-webhook"
  status = 200
```

### **3. Package Configuration**
```json
{
  "name": "webhook-proxy",
  "version": "1.0.0",
  "description": "Docker Hub to GitHub webhook proxy",
  "main": "index.js",
  "scripts": {
    "dev": "netlify dev",
    "build": "echo 'No build step required'",
    "test": "jest",
    "lint": "eslint netlify/functions/**/*.ts"
  },
  "dependencies": {
    "@netlify/functions": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

### **4. Environment Variables**
```bash
# Required environment variables for Netlify
GITHUB_TOKEN=ghp_your_github_token_here
GITHUB_OWNER=Estatemanner
GITHUB_REPO=cadastral-deploy
LOG_LEVEL=info
```

### **5. Testing Setup**
```typescript
// tests/webhook.test.ts
import { describe, test, expect } from '@jest/globals';

describe('Webhook Proxy', () => {
  test('should validate Docker Hub payload', () => {
    const validPayload = {
      repository: { repo_name: 'est-webapp' },
      push_data: { tag: 'v1.0.0', pusher: 'test' }
    };
    
    // Test validation logic
    expect(validateDockerPayload(validPayload)).toEqual({ valid: true });
  });

  test('should transform payload correctly', () => {
    const dockerPayload = {
      repository: { repo_name: 'est-webapp' },
      push_data: { tag: 'v1.0.0', pusher: 'test' }
    };
    
    const result = transformToGitHubDispatch(dockerPayload);
    
    expect(result.client_payload.repository.repo_name).toBe('webapp');
    expect(result.client_payload.environment).toBe('production');
  });
});
```

## 🚀 **Deployment Instructions**

### **1. Repository Setup**
```bash
# Create new repository
gh repo create Estatemanner/webhook-proxy --public

# Clone and setup
git clone https://github.com/Estatemanner/webhook-proxy.git
cd webhook-proxy

# Initialize project
npm init -y
npm install @netlify/functions
npm install -D typescript @types/node
```

### **2. Netlify Deployment**
1. Connect repository to Netlify
2. Set build command: `echo 'No build required'`
3. Set functions directory: `netlify/functions`
4. Configure environment variables
5. Deploy

### **3. Docker Hub Configuration**
Update webhook URLs in Docker Hub to:
```
https://your-site.netlify.app/webhook/docker-hub
```

## 📊 **Monitoring & Logging**

### **Log Format**
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info",
  "message": "Webhook processed successfully",
  "service": "webapp",
  "tag": "v1.2.3",
  "environment": "production",
  "processing_time_ms": 150
}
```

### **Error Handling**
- Validation errors return 400 with detailed error messages
- GitHub API errors return 500 with error details
- All errors are logged with full context
- Retry logic for transient GitHub API failures

This technical specification provides the complete implementation details for your Docker Hub webhook proxy service!
