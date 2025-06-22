import type { Context, Config } from "@netlify/functions";
import type { DockerHubPayload } from "./types";
import { validateDockerPayload } from "./validator";
import { transformPayload } from "./transformer";
import { sendToGitHub } from "./github";
import {
  getConfig,
  validateConfig,
  logConfiguration,
  isRequestLoggingEnabled,
  isPerformanceLoggingEnabled,
} from "./config";

export default async (req: Request, context: Context) => {
  const startTime = Date.now();

  try {
    // Initialize configuration and logging
    const config = getConfig();
    const configValidation = validateConfig(config);

    if (!configValidation.valid) {
      console.error(
        "Configuration validation failed:",
        configValidation.errors
      );
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Log configuration on startup (only in debug mode)
    if (config.logging.level === "debug") {
      logConfiguration();
    }

    // Log incoming request if enabled
    if (isRequestLoggingEnabled()) {
      console.log(
        `[${new Date().toISOString()}] Webhook received from ${req.headers.get(
          "user-agent"
        )}`
      );
    }

    // Validate HTTP method
    if (req.method !== "POST") {
      console.warn(`Invalid method: ${req.method}`);
      return new Response(
        JSON.stringify({ error: "Method not allowed", allowed: ["POST"] }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            Allow: "POST",
          },
        }
      );
    }

    // Parse request body
    let dockerPayload: DockerHubPayload;
    try {
      dockerPayload = (await req.json()) as DockerHubPayload;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate required fields
    const validation = validateDockerPayload(dockerPayload);
    if (!validation.valid) {
      console.warn("Validation failed:", validation.errors);
      return new Response(
        JSON.stringify({
          error: "Invalid payload",
          details: validation.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Transform payload
    const githubPayload = transformPayload(dockerPayload);

    // Log transformation if enabled
    if (isRequestLoggingEnabled()) {
      console.log("Transformed payload:", {
        service: githubPayload.client_payload.repository.repo_name,
        tag: githubPayload.client_payload.push_data.tag,
        environment: githubPayload.client_payload.environment,
      });
    }

    // Send to GitHub
    await sendToGitHub(githubPayload);

    const processingTime = Date.now() - startTime;

    // Log performance if enabled
    if (isPerformanceLoggingEnabled()) {
      console.log(`Webhook processed successfully in ${processingTime}ms`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook processed successfully",
        service: githubPayload.client_payload.repository.repo_name,
        environment: githubPayload.client_payload.environment,
        processing_time_ms: processingTime,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Webhook processing error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        processing_time_ms: processingTime,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const config: Config = {
  path: "/webhook/docker-hub",
};
