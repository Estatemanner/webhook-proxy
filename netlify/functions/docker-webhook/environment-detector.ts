/**
 * Environment detection utilities based on Docker image tags
 *
 * Supported patterns:
 * - v1.2.3 (semantic version) → production
 * - v1.2.3-stg (semantic version with -stg suffix) → staging
 * - v1.2.3-dev (semantic version with -dev suffix) → staging
 */

// Production pattern: semantic version (v1.2.3)
const PRODUCTION_PATTERN = /^v\d+\.\d+\.\d+$/;

// Staging patterns: semantic version with -stg or -uat suffix
const STAGING_STG_PATTERN = /^v\d+\.\d+\.\d+-stg$/;
const STAGING_DEV_PATTERN = /^v\d+\.\d+\.\d+-dev$/;

export type Environment = "production" | "staging";

/**
 * Detects environment based on Docker image tag
 */
export function detectEnvironment(tag: string): Environment {
  if (!tag || typeof tag !== "string") {
    console.warn(`Invalid tag provided: ${tag}, defaulting to staging`);
    return "staging";
  }

  const trimmedTag = tag.trim();

  // Check for production pattern: v1.2.3
  if (PRODUCTION_PATTERN.test(trimmedTag)) {
    return "production";
  }

  // Check for staging patterns: v1.2.3-stg or v1.2.3-dev
  if (
    STAGING_STG_PATTERN.test(trimmedTag) ||
    STAGING_DEV_PATTERN.test(trimmedTag)
  ) {
    return "staging";
  }

  // Default to staging for unknown patterns
  console.warn(
    `Unknown tag pattern: ${tag}, defaulting to staging. Expected: v1.2.3 (production), v1.2.3-stg or v1.2.3-dev (staging)`
  );
  return "staging";
}

/**
 * Checks if a tag indicates production environment
 */
export function isProductionTag(tag: string): boolean {
  return detectEnvironment(tag) === "production";
}

/**
 * Checks if a tag indicates staging environment
 */
export function isStagingTag(tag: string): boolean {
  return detectEnvironment(tag) === "staging";
}

/**
 * Gets the production tag pattern (for documentation/testing)
 */
export function getProductionPattern(): RegExp {
  return PRODUCTION_PATTERN;
}

/**
 * Gets the staging tag patterns (for documentation/testing)
 */
export function getStagingPatterns(): RegExp[] {
  return [STAGING_STG_PATTERN, STAGING_DEV_PATTERN];
}

/**
 * Gets example tags for each environment
 */
export function getExampleTags(): { production: string[]; staging: string[] } {
  return {
    production: ["v1.0.0", "v2.1.3", "v10.5.2"],
    staging: [
      "v1.0.0-stg",
      "v2.1.3-stg",
      "v10.5.2-stg",
      "v1.0.0-dev",
      "v2.1.3-dev",
      "v10.5.2-dev",
    ],
  };
}
