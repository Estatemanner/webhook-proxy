import type { GitHubDispatchPayload } from './types';

/**
 * GitHub API client for sending repository dispatch events
 */

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

/**
 * Sends a repository dispatch event to GitHub
 */
export async function sendToGitHub(
  payload: GitHubDispatchPayload,
  config?: Partial<GitHubConfig>
): Promise<boolean> {
  const githubConfig = getGitHubConfig(config);
  
  if (!githubConfig.token) {
    throw new Error('GITHUB_TOKEN environment variable not configured');
  }

  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/dispatches`;
  
  console.log(`Sending repository dispatch to: ${url}`);
  console.log('Dispatch payload:', {
    event_type: payload.event_type,
    service: payload.client_payload.repository.repo_name,
    environment: payload.client_payload.environment,
    tag: payload.client_payload.push_data.tag
  });
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubConfig.token}`,
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
    
  } catch (error) {
    console.error('Failed to send repository dispatch:', error);
    throw error;
  }
}

/**
 * Gets GitHub configuration from environment variables
 */
function getGitHubConfig(overrides?: Partial<GitHubConfig>): GitHubConfig {
  return {
    token: overrides?.token || Netlify.env.get('GITHUB_TOKEN') || '',
    owner: overrides?.owner || Netlify.env.get('GITHUB_OWNER') || 'Estatemanner',
    repo: overrides?.repo || Netlify.env.get('GITHUB_REPO') || 'cadastral-deploy'
  };
}

/**
 * Validates GitHub configuration
 */
export function validateGitHubConfig(config?: Partial<GitHubConfig>): { valid: boolean; errors: string[] } {
  const githubConfig = getGitHubConfig(config);
  const errors: string[] = [];
  
  if (!githubConfig.token) {
    errors.push('GitHub token is required (GITHUB_TOKEN environment variable)');
  }
  
  if (!githubConfig.owner) {
    errors.push('GitHub owner is required (GITHUB_OWNER environment variable)');
  }
  
  if (!githubConfig.repo) {
    errors.push('GitHub repository is required (GITHUB_REPO environment variable)');
  }
  
  // Basic token format validation (should start with 'ghp_' for personal access tokens)
  if (githubConfig.token && !githubConfig.token.match(/^(ghp_|gho_|ghu_|ghs_|ghr_)/)) {
    console.warn('GitHub token format may be invalid. Expected format: ghp_...');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Tests GitHub API connectivity
 */
export async function testGitHubConnection(config?: Partial<GitHubConfig>): Promise<boolean> {
  const githubConfig = getGitHubConfig(config);
  
  if (!githubConfig.token) {
    throw new Error('GitHub token is required for connection test');
  }
  
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${githubConfig.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EstateManner-Webhook-Proxy/1.0'
      }
    });
    
    if (response.ok) {
      console.log('GitHub API connection test successful');
      return true;
    } else {
      console.error(`GitHub API connection test failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('GitHub API connection test error:', error);
    return false;
  }
}
