/**
 * Configuration management for webhook proxy
 */

export interface Config {
  github: {
    token: string;
    owner: string;
    repo: string;
  };
  logging: {
    level: LogLevel;
    enableRequestLogging: boolean;
    enablePerformanceLogging: boolean;
  };
  webhook: {
    maxPayloadSize: number;
    timeoutMs: number;
  };
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Gets the complete application configuration
 */
export function getConfig(): Config {
  return {
    github: {
      token: Netlify.env.get('GITHUB_TOKEN') || '',
      owner: Netlify.env.get('GITHUB_OWNER') || 'Estatemanner',
      repo: Netlify.env.get('GITHUB_REPO') || 'cadastral-deploy'
    },
    logging: {
      level: (Netlify.env.get('LOG_LEVEL') as LogLevel) || 'info',
      enableRequestLogging: Netlify.env.get('ENABLE_REQUEST_LOGGING') === 'true',
      enablePerformanceLogging: Netlify.env.get('ENABLE_PERFORMANCE_LOGGING') !== 'false' // default true
    },
    webhook: {
      maxPayloadSize: parseInt(Netlify.env.get('MAX_PAYLOAD_SIZE') || '1048576'), // 1MB default
      timeoutMs: parseInt(Netlify.env.get('WEBHOOK_TIMEOUT_MS') || '30000') // 30s default
    }
  };
}

/**
 * Validates the configuration
 */
export function validateConfig(config?: Config): { valid: boolean; errors: string[] } {
  const cfg = config || getConfig();
  const errors: string[] = [];
  
  // GitHub configuration validation
  if (!cfg.github.token) {
    errors.push('GitHub token is required (GITHUB_TOKEN)');
  }
  
  if (!cfg.github.owner) {
    errors.push('GitHub owner is required (GITHUB_OWNER)');
  }
  
  if (!cfg.github.repo) {
    errors.push('GitHub repository is required (GITHUB_REPO)');
  }
  
  // Logging configuration validation
  const validLogLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(cfg.logging.level)) {
    errors.push(`Invalid log level: ${cfg.logging.level}. Valid levels: ${validLogLevels.join(', ')}`);
  }
  
  // Webhook configuration validation
  if (cfg.webhook.maxPayloadSize <= 0) {
    errors.push('Max payload size must be greater than 0');
  }
  
  if (cfg.webhook.timeoutMs <= 0) {
    errors.push('Webhook timeout must be greater than 0');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Gets GitHub-specific configuration
 */
export function getGitHubConfig(): Config['github'] {
  return getConfig().github;
}

/**
 * Gets logging configuration
 */
export function getLoggingConfig(): Config['logging'] {
  return getConfig().logging;
}

/**
 * Gets webhook configuration
 */
export function getWebhookConfig(): Config['webhook'] {
  return getConfig().webhook;
}

/**
 * Checks if debug logging is enabled
 */
export function isDebugEnabled(): boolean {
  return getLoggingConfig().level === 'debug';
}

/**
 * Checks if request logging is enabled
 */
export function isRequestLoggingEnabled(): boolean {
  return getLoggingConfig().enableRequestLogging;
}

/**
 * Checks if performance logging is enabled
 */
export function isPerformanceLoggingEnabled(): boolean {
  return getLoggingConfig().enablePerformanceLogging;
}

/**
 * Gets environment-specific settings
 */
export function getEnvironmentInfo() {
  return {
    nodeEnv: Netlify.env.get('NODE_ENV') || 'development',
    netlifyContext: Netlify.env.get('CONTEXT') || 'dev',
    deployId: Netlify.env.get('DEPLOY_ID') || 'local',
    siteId: Netlify.env.get('SITE_ID') || 'local',
    buildId: Netlify.env.get('BUILD_ID') || 'local'
  };
}

/**
 * Logs the current configuration (without sensitive data)
 */
export function logConfiguration(): void {
  const config = getConfig();
  const envInfo = getEnvironmentInfo();
  
  console.log('Webhook Proxy Configuration:', {
    github: {
      owner: config.github.owner,
      repo: config.github.repo,
      tokenConfigured: !!config.github.token
    },
    logging: config.logging,
    webhook: config.webhook,
    environment: envInfo
  });
}
