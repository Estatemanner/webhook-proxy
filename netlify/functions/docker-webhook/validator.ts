import type { DockerHubPayload, ValidationResult } from "./types";

// Service mapping configuration for validation
const SUPPORTED_REPOSITORIES = [
  "duylvhz/est-webapp",
  "duylvhz/est-server",
  "duylvhz/est-pricing-server",
  "duylvhz/est-landing",
];

/**
 * Validates Docker Hub webhook payload structure and required fields
 */
export function validateDockerPayload(payload: any): ValidationResult {
  const errors: string[] = [];

  // Check repository information
  if (!payload.repository?.repo_name) {
    errors.push("Missing repository.repo_name");
  }

  if (!payload.repository?.owner) {
    errors.push("Missing repository.owner");
  }

  // Check push data
  if (!payload.push_data?.tag) {
    errors.push("Missing push_data.tag");
  }

  if (!payload.push_data?.pusher) {
    errors.push("Missing push_data.pusher");
  }

  // Check if repository is supported
  if (
    payload.repository?.repo_name &&
    !SUPPORTED_REPOSITORIES.includes(payload.repository.repo_name)
  ) {
    errors.push(
      `Unsupported repository: ${
        payload.repository.repo_name
      }. Supported: ${SUPPORTED_REPOSITORIES.join(", ")}`
    );
  }

  // Validate tag format (basic validation)
  if (payload.push_data?.tag && typeof payload.push_data.tag !== "string") {
    errors.push("push_data.tag must be a string");
  }

  // Validate pusher format
  if (
    payload.push_data?.pusher &&
    typeof payload.push_data.pusher !== "string"
  ) {
    errors.push("push_data.pusher must be a string");
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Type guard to check if payload is a valid DockerHubPayload
 */
export function isValidDockerHubPayload(
  payload: any
): payload is DockerHubPayload {
  const validation = validateDockerPayload(payload);
  return validation.valid;
}
