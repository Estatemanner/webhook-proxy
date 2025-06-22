import type { DockerHubPayload, GitHubDispatchPayload } from "./types";
import { mapRepositoryToService } from "./service-mapper";
import { detectEnvironment } from "./environment-detector";

/**
 * Transforms Docker Hub webhook payload to GitHub repository dispatch format
 */
export function transformPayload(
  dockerPayload: DockerHubPayload
): GitHubDispatchPayload {
  try {
    // Map repository to service name
    const serviceName = mapRepositoryToService(
      dockerPayload.repository.repo_name
    );

    // Detect environment from tag
    const environment = detectEnvironment(dockerPayload.push_data.tag);

    // Create GitHub dispatch payload
    const githubPayload: GitHubDispatchPayload = {
      event_type: "docker-hub-webhook",
      client_payload: {
        repository: {
          repo_name: dockerPayload.repository.repo_name,
        },
        push_data: {
          tag: dockerPayload.push_data.tag,
          pusher: dockerPayload.push_data.pusher,
        },
        environment: environment,
      },
    };

    // Log transformation details
    console.log("Payload transformation completed:", {
      original_repo: dockerPayload.repository.repo_name,
      mapped_service: serviceName,
      tag: dockerPayload.push_data.tag,
      detected_environment: environment,
      pusher: dockerPayload.push_data.pusher,
    });

    return githubPayload;
  } catch (error) {
    console.error("Payload transformation failed:", error);
    throw new Error(
      `Failed to transform payload: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Creates a GitHub repository dispatch payload with custom event type
 */
export function createCustomDispatchPayload(
  serviceName: string,
  tag: string,
  pusher: string,
  environment: "production" | "staging",
  eventType: string = "docker-hub-webhook"
): GitHubDispatchPayload {
  return {
    event_type: eventType,
    client_payload: {
      repository: {
        repo_name: serviceName,
      },
      push_data: {
        tag: tag,
        pusher: pusher,
      },
      environment: environment,
    },
  };
}

/**
 * Validates that a Docker Hub payload can be transformed
 */
export function canTransformPayload(dockerPayload: DockerHubPayload): boolean {
  try {
    mapRepositoryToService(dockerPayload.repository.repo_name);
    detectEnvironment(dockerPayload.push_data.tag);
    return true;
  } catch (error) {
    console.warn("Payload cannot be transformed:", error);
    return false;
  }
}
