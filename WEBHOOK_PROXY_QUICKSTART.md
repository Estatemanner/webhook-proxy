# Docker Hub Webhook Proxy - Quick Start Guide

## 🚀 **Quick Setup (30 minutes)**

### **Step 1: Create Repository**
```bash
# Create new repository in Estatemanner org
gh repo create Estatemanner/webhook-proxy --public --description "Docker Hub to GitHub webhook proxy"

# Clone repository
git clone https://github.com/Estatemanner/webhook-proxy.git
cd webhook-proxy
```

### **Step 2: Project Setup**
```bash
# Initialize package.json
npm init -y

# Install dependencies
npm install @netlify/functions
npm install -D typescript @types/node jest @types/jest

# Create directory structure
mkdir -p netlify/functions/docker-webhook
mkdir -p tests
```

### **Step 3: Create Core Files**

#### **netlify.toml**
```toml
[build]
  command = "echo 'No build required'"
  functions = "netlify/functions"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[dev]
  functions = "netlify/functions"
  port = 8888
```

#### **package.json** (update scripts)
```json
{
  "scripts": {
    "dev": "netlify dev",
    "test": "jest",
    "deploy": "netlify deploy --prod"
  }
}
```

#### **.gitignore**
```
node_modules/
.netlify/
.env
.env.local
dist/
*.log
```

### **Step 4: Implement Function**

Copy the complete function code from `WEBHOOK_PROXY_TECHNICAL_SPEC.md` into:
```
netlify/functions/docker-webhook/index.mts
```

### **Step 5: Local Testing**

#### **Install Netlify CLI**
```bash
npm install -g netlify-cli
```

#### **Start Development Server**
```bash
netlify dev
```

#### **Test Webhook Endpoint**
```bash
# Test with sample Docker Hub payload
curl -X POST http://localhost:8888/webhook/docker-hub \
  -H "Content-Type: application/json" \
  -d '{
    "repository": {
      "repo_name": "est-webapp",
      "full_name": "duylvhz/est-webapp",
      "owner": "duylvhz"
    },
    "push_data": {
      "tag": "v1.2.3",
      "pusher": "duylvhz"
    }
  }'
```

### **Step 6: Deploy to Netlify**

#### **Connect to Netlify**
```bash
# Login to Netlify
netlify login

# Link repository to Netlify site
netlify init
```

#### **Configure Environment Variables**
```bash
# Set environment variables in Netlify
netlify env:set GITHUB_TOKEN "your_github_token_here"
netlify env:set GITHUB_OWNER "Estatemanner"
netlify env:set GITHUB_REPO "cadastral-deploy"
```

#### **Deploy**
```bash
netlify deploy --prod
```

### **Step 7: Configure Docker Hub Webhooks**

For each Docker repository, set webhook URL to:
```
https://your-site-name.netlify.app/webhook/docker-hub
```

**Docker Repositories to Configure:**
- `duylvhz/est-webapp`
- `duylvhz/est-server`
- `duylvhz/est-pricing-server`
- `duylvhz/est-landing`

## 🧪 **Testing Checklist**

### **Local Testing**
- [ ] Function starts without errors
- [ ] Webhook endpoint responds to POST requests
- [ ] Payload validation works correctly
- [ ] Service mapping functions properly
- [ ] Environment detection works (v1.2.3 → production, latest → staging)
- [ ] Error handling returns proper status codes

### **Integration Testing**
- [ ] GitHub repository dispatch is sent successfully
- [ ] Existing GitHub Actions workflows are triggered
- [ ] Manual approval process works
- [ ] Deployment to Docker Swarm completes

### **Production Testing**
- [ ] Docker Hub webhooks trigger the proxy
- [ ] All supported repositories work correctly
- [ ] Error logging provides useful information
- [ ] Performance is acceptable (< 2 seconds)

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Function Not Found (404)**
```bash
# Check function path and naming
ls -la netlify/functions/docker-webhook/
# Should contain: index.mts

# Check netlify.toml configuration
cat netlify.toml
```

#### **GitHub API Errors (500)**
```bash
# Verify environment variables
netlify env:list

# Test GitHub token manually
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/Estatemanner/cadastral-deploy
```

#### **Payload Validation Errors (400)**
```bash
# Check Docker Hub payload format
# Ensure required fields are present:
# - repository.repo_name
# - push_data.tag
# - push_data.pusher
```

### **Debug Commands**
```bash
# View function logs
netlify functions:list
netlify functions:invoke docker-webhook --payload='{"test": true}'

# Check deployment status
netlify status

# View site logs
netlify logs
```

## 📊 **Monitoring**

### **Function Logs**
Access logs in Netlify dashboard:
1. Go to your site dashboard
2. Click "Functions" tab
3. Click on "docker-webhook" function
4. View logs and invocation history

### **GitHub Actions**
Monitor triggered workflows:
1. Go to https://github.com/Estatemanner/cadastral-deploy/actions
2. Look for "Docker Hub Webhook Handler" workflows
3. Verify payload processing and deployment triggers

## 🎯 **Success Verification**

### **End-to-End Test**
1. **Push Docker Image**:
   ```bash
   docker tag your-image duylvhz/est-webapp:test-v1.0.0
   docker push duylvhz/est-webapp:test-v1.0.0
   ```

2. **Verify Webhook Proxy**:
   - Check Netlify function logs
   - Confirm successful GitHub API call

3. **Verify GitHub Actions**:
   - Check "Docker Hub Webhook Handler" workflow
   - Verify "Deploy EstateManner App Services" is triggered
   - Confirm manual approval request is created

4. **Complete Deployment**:
   - Approve deployment in GitHub Issues
   - Verify Docker Swarm deployment completes

## 📋 **Next Steps**

After successful setup:
- [ ] Update Docker Hub webhook URLs for all repositories
- [ ] Test with both staging and production deployments
- [ ] Monitor function performance and error rates
- [ ] Set up alerting for webhook failures
- [ ] Document any custom configurations or modifications

## 🔗 **Useful Links**

- **Netlify Functions Documentation**: https://docs.netlify.com/functions/overview/
- **GitHub Repository Dispatch API**: https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event
- **Docker Hub Webhooks**: https://docs.docker.com/docker-hub/webhooks/
- **Your Webhook Proxy Site**: https://your-site-name.netlify.app
- **GitHub Actions**: https://github.com/Estatemanner/cadastral-deploy/actions

Your Docker Hub webhook proxy is now ready to automate your deployment pipeline! 🎉
