// Type definitions for Docker Hub webhook proxy

export interface DockerHubPayload {
  repository: {
    repo_name: string;
    owner: string;
  };
  push_data: {
    tag: string;
    pusher: string;
    pushed_at?: number;
  };
  callback_url?: string;
}

export interface GitHubDispatchPayload {
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

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}
