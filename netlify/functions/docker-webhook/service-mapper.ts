/**
 * Service mapping configuration and utilities
 * Maps Docker Hub repository names to internal service names
 */

// Repository to service name mapping
const SERVICE_MAP: Record<string, string> = {
  "estatemanner/est-webapp": "webapp",
  "estatemanner/est-landing": "landing",
  "estatemanner/est-server": "server",
  "estatemanner/est-pricing-server": "pricing",
  "estatemanner/est-mdp-collector": "mdp-collector",
  "estatemanner/est-mdp-collector-fe": "mdp-collector-fe",
};

/**
 * Maps a Docker Hub repository name to internal service name
 */
export function mapRepositoryToService(repoName: string): string {
  const serviceName = SERVICE_MAP[repoName];

  if (!serviceName) {
    throw new Error(
      `Unknown repository: ${repoName}. Supported repositories: ${Object.keys(
        SERVICE_MAP
      ).join(", ")}`
    );
  }

  return serviceName;
}

/**
 * Gets all supported repository names
 */
export function getSupportedRepositories(): string[] {
  return Object.keys(SERVICE_MAP);
}

/**
 * Gets all mapped service names
 */
export function getMappedServices(): string[] {
  return Object.values(SERVICE_MAP);
}

/**
 * Checks if a repository is supported
 */
export function isRepositorySupported(repoName: string): boolean {
  return repoName in SERVICE_MAP;
}

/**
 * Gets the complete service mapping configuration
 */
export function getServiceMap(): Record<string, string> {
  return { ...SERVICE_MAP }; // Return a copy to prevent mutations
}
