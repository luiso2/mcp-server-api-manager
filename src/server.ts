import express from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// Environment configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";

// Server activity log
const activityLog: string[] = [];
function addToLog(message: string) {
  const timestamp = new Date().toISOString();
  activityLog.push(`[${timestamp}] ${message}`);
  if (activityLog.length > 100) {
    activityLog.shift();
  }
  console.log(`[LOG] ${message}`);
}

// TypeScript Interfaces
interface ApiConfig {
  name: string;
  baseUrl: string;
  description?: string;
  auth?: {
    type: 'bearer' | 'api-key' | 'basic' | 'none';
    credentials?: {
      token?: string;
      apiKey?: string;
      username?: string;
      password?: string;
      headerName?: string; // for api-key custom
    }
  };
  headers?: Record<string, string>;
  timeout?: number;
  createdAt: string;
  lastUsed?: string;
}

interface RequestHistory {
  timestamp: string;
  apiName: string;
  method: string;
  endpoint: string;
  status: number;
  responseTime: number;
  success: boolean;
}

// Storage and state management
const apiConfigs = new Map<string, ApiConfig>();
const requestHistory: RequestHistory[] = [];

// Helper functions
function getApiConfig(name: string): ApiConfig | undefined {
  return apiConfigs.get(name);
}

function buildHeaders(config: ApiConfig, customHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers,
    ...customHeaders
  };

  // Add authentication headers
  if (config.auth && config.auth.type !== 'none' && config.auth.credentials) {
    const { type, credentials } = config.auth;
    switch (type) {
      case 'bearer':
        if (credentials.token) {
          headers['Authorization'] = `Bearer ${credentials.token}`;
        }
        break;
      case 'api-key':
        if (credentials.apiKey && credentials.headerName) {
          headers[credentials.headerName] = credentials.apiKey;
        }
        break;
      case 'basic':
        if (credentials.username && credentials.password) {
          const encoded = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
          headers['Authorization'] = `Basic ${encoded}`;
        }
        break;
    }
  }

  return headers;
}

function buildUrl(baseUrl: string, endpoint: string, queryParams?: Record<string, any>): string {
  // Ensure baseUrl doesn't end with slash and endpoint starts with slash
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = cleanBase + cleanEndpoint;

  if (queryParams && Object.keys(queryParams).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    url += `?${searchParams.toString()}`;
  }

  return url;
}

async function parseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return await response.json();
  } else if (contentType.includes('text/')) {
    return await response.text();
  } else {
    // Try to parse as text first, fallback to json
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}

function sanitizeConfig(config: ApiConfig): any {
  const sanitized = { ...config };
  if (sanitized.auth?.credentials) {
    const creds = sanitized.auth.credentials;
    sanitized.auth.credentials = {
      username: creds.username,
      headerName: creds.headerName,
      token: creds.token ? '[REDACTED]' : undefined,
      apiKey: creds.apiKey ? '[REDACTED]' : undefined,
      password: creds.password ? '[REDACTED]' : undefined
    };
    // Remove undefined values
    Object.keys(sanitized.auth.credentials).forEach(key => {
      if (sanitized.auth!.credentials![key as keyof typeof sanitized.auth.credentials] === undefined) {
        delete sanitized.auth!.credentials![key as keyof typeof sanitized.auth.credentials];
      }
    });
  }
  return sanitized;
}

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

function addRequestToHistory(request: RequestHistory): void {
  requestHistory.push(request);
  if (requestHistory.length > 100) {
    requestHistory.shift(); // Keep only last 100 requests
  }
}

// Create MCP server instance
const mcp = new McpServer({
  name: "api-manager-mcp",
  version: "1.0.0",
  description: "Universal API Manager for MCP - Save configurations and execute HTTP requests to any API"
}, {
  capabilities: {
    tools: {},
    resources: {}
  }
});

// TOOL: save_api - Save API configuration
mcp.tool(
  "save_api",
  "Save a new API configuration for future use. Store base URL, authentication, and default headers.",
  {
    name: z.string().describe("Unique identifier for this API"),
    baseUrl: z.string().describe("Base URL of the API (e.g., https://api.example.com)"),
    description: z.string().optional().describe("Description of what this API does"),
    auth: z.object({
      type: z.enum(['bearer', 'api-key', 'basic', 'none']).describe("Authentication type"),
      credentials: z.object({
        token: z.string().optional().describe("Bearer token"),
        apiKey: z.string().optional().describe("API key"),
        username: z.string().optional().describe("Username for basic auth"),
        password: z.string().optional().describe("Password for basic auth"),
        headerName: z.string().optional().describe("Custom header name for API key")
      }).optional().describe("Authentication credentials")
    }).optional().describe("Authentication configuration"),
    headers: z.record(z.string()).optional().describe("Default headers to include in all requests"),
    timeout: z.number().optional().describe("Request timeout in milliseconds (default: 30000)")
  },
  async ({ name, baseUrl, description, auth, headers, timeout = 30000 }) => {
    try {
      // Validations
      if (apiConfigs.has(name)) {
        throw new Error(`API "${name}" already exists. Use a different name or delete the existing one first.`);
      }

      if (!validateUrl(baseUrl)) {
        throw new Error("Invalid baseUrl. Must start with http:// or https://");
      }

      // Validate auth requirements
      if (auth && auth.type !== 'none' && auth.credentials) {
        const { type, credentials } = auth;
        switch (type) {
          case 'bearer':
            if (!credentials.token) {
              throw new Error("Bearer authentication requires a token");
            }
            break;
          case 'api-key':
            if (!credentials.apiKey || !credentials.headerName) {
              throw new Error("API key authentication requires both apiKey and headerName");
            }
            break;
          case 'basic':
            if (!credentials.username || !credentials.password) {
              throw new Error("Basic authentication requires both username and password");
            }
            break;
        }
      }

      // Create and store configuration
      const config: ApiConfig = {
        name,
        baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
        createdAt: new Date().toISOString(),
        timeout
      };

      if (description) config.description = description;
      if (auth) config.auth = auth;
      if (headers) config.headers = headers;

      apiConfigs.set(name, config);
      addToLog(`API configuration saved: ${name} (${baseUrl})`);

      return {
        content: [{
          type: "text",
          text: `✅ API "${name}" saved successfully!\n\nConfiguration:\n${JSON.stringify(sanitizeConfig(config), null, 2)}`
        }]
      };

    } catch (error: any) {
      addToLog(`Error saving API ${name}: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: `❌ Error saving API: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// TOOL: make_request - Execute HTTP request
mcp.tool(
  "make_request",
  "Execute an HTTP request to a saved API. Supports GET, POST, PUT, DELETE, PATCH methods with custom body and headers.",
  {
    apiName: z.string().describe("Name of the saved API configuration to use"),
    endpoint: z.string().describe("API endpoint relative to base URL (e.g., /users/123)"),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).describe("HTTP method"),
    body: z.any().optional().describe("Request body for POST/PUT/PATCH (will be JSON.stringified)"),
    queryParams: z.record(z.any()).optional().describe("Query parameters as key-value pairs"),
    headers: z.record(z.string()).optional().describe("Additional headers for this specific request")
  },
  async ({ apiName, endpoint, method, body, queryParams, headers: customHeaders }) => {
    const startTime = Date.now();

    try {
      // 1. Recuperar configuración
      const config = getApiConfig(apiName);
      if (!config) {
        throw new Error(`API "${apiName}" not found. Use save_api first.`);
      }

      // 2. Construir URL completa
      const url = buildUrl(config.baseUrl, endpoint, queryParams);

      // 3. Construir headers
      const headers = buildHeaders(config, customHeaders);

      // 4. Preparar request options
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        config.timeout || 30000
      );

      const options: RequestInit = {
        method,
        headers,
        signal: controller.signal
      };

      if (body && method !== "GET") {
        options.body = JSON.stringify(body);
      }

      // 5. Ejecutar request
      addToLog(`Executing ${method} ${url} [API: ${apiName}]`);
      const response = await fetch(url, options);
      clearTimeout(timeout);

      // 6. Parsear respuesta
      const responseBody = await parseResponse(response);
      const responseTime = Date.now() - startTime;

      // 7. Actualizar stats
      config.lastUsed = new Date().toISOString();
      addRequestToHistory({
        timestamp: config.lastUsed,
        apiName,
        method,
        endpoint,
        status: response.status,
        responseTime,
        success: response.ok
      });

      // 8. Retornar resultado
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers),
            body: responseBody,
            responseTime
          }, null, 2)
        }]
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      if (error.name === 'AbortError') {
        return {
          content: [{
            type: "text",
            text: `⏱️ Request timeout after ${responseTime}ms`
          }],
          isError: true
        };
      }

      addToLog(`Request failed for ${apiName}: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: `❌ Request failed: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// TOOL: list_apis - List all saved APIs
mcp.tool(
  "list_apis",
  "List all saved API configurations with their details",
  {},
  async () => {
    try {
      const apis = Array.from(apiConfigs.values())
        .sort((a, b) => {
          // Sort by lastUsed (most recent first), then by createdAt
          if (a.lastUsed && b.lastUsed) {
            return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
          }
          if (a.lastUsed && !b.lastUsed) return -1;
          if (!a.lastUsed && b.lastUsed) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .map(config => ({
          name: config.name,
          baseUrl: config.baseUrl,
          description: config.description,
          authType: config.auth?.type || 'none',
          hasDefaultHeaders: !!config.headers && Object.keys(config.headers).length > 0,
          createdAt: config.createdAt,
          lastUsed: config.lastUsed
        }));

      addToLog(`Listed ${apis.length} saved APIs`);

      return {
        content: [{
          type: "text",
          text: apis.length > 0
            ? `📋 Saved APIs (${apis.length}):\n\n${JSON.stringify(apis, null, 2)}`
            : "📋 No APIs saved yet. Use save_api to add your first API configuration."
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `❌ Error listing APIs: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// TOOL: get_api - Get specific API configuration
mcp.tool(
  "get_api",
  "Get detailed configuration of a specific saved API",
  {
    name: z.string().describe("Name of the API to retrieve")
  },
  async ({ name }) => {
    try {
      const config = getApiConfig(name);
      if (!config) {
        throw new Error(`API "${name}" not found`);
      }

      addToLog(`Retrieved API configuration: ${name}`);

      return {
        content: [{
          type: "text",
          text: `🔍 API Configuration: ${name}\n\n${JSON.stringify(sanitizeConfig(config), null, 2)}`
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `❌ Error retrieving API: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// TOOL: delete_api - Delete API configuration
mcp.tool(
  "delete_api",
  "Delete a saved API configuration permanently",
  {
    name: z.string().describe("Name of the API to delete")
  },
  async ({ name }) => {
    try {
      const config = getApiConfig(name);
      if (!config) {
        throw new Error(`API "${name}" not found`);
      }

      apiConfigs.delete(name);
      addToLog(`API configuration deleted: ${name}`);

      return {
        content: [{
          type: "text",
          text: `✅ API "${name}" deleted successfully`
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `❌ Error deleting API: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// RESOURCE: apis://list
mcp.registerResource("apis-list", "apis://list", {
  description: "Complete list of all saved API configurations",
  mimeType: "application/json"
}, async () => {
  addToLog("Resource accessed: apis://list");

  const apis = Array.from(apiConfigs.values()).map(config => sanitizeConfig(config));
  const stats = {
    totalApis: apis.length,
    totalRequests: requestHistory.length,
    lastUpdated: new Date().toISOString()
  };

  return {
    contents: [{
      uri: "apis://list",
      mimeType: "application/json",
      text: JSON.stringify({ stats, apis }, null, 2)
    }]
  };
});

// RESOURCE: apis://stats
mcp.registerResource("apis-stats", "apis://stats", {
  description: "Statistics about API usage and performance",
  mimeType: "application/json"
}, async () => {
  addToLog("Resource accessed: apis://stats");

  const totalRequests = requestHistory.length;
  const successfulRequests = requestHistory.filter(r => r.success).length;
  const averageResponseTime = totalRequests > 0
    ? Math.round(requestHistory.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests)
    : 0;

  // Find most used API
  const apiUsage = requestHistory.reduce((acc, r) => {
    acc[r.apiName] = (acc[r.apiName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostUsedApi = Object.entries(apiUsage)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

  const recentActivity = requestHistory
    .slice(-10)
    .map(r => ({
      apiName: r.apiName,
      endpoint: r.endpoint,
      method: r.method,
      timestamp: r.timestamp,
      status: r.status
    }));

  const stats = {
    totalApis: apiConfigs.size,
    totalRequests,
    successfulRequests,
    successRate: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0,
    averageResponseTime,
    mostUsedApi,
    recentActivity
  };

  return {
    contents: [{
      uri: "apis://stats",
      mimeType: "application/json",
      text: JSON.stringify(stats, null, 2)
    }]
  };
});

// RESOURCE: apis://help
mcp.registerResource("apis-help", "apis://help", {
  description: "Quick reference guide for API Manager tools",
  mimeType: "text/markdown"
}, async () => {
  addToLog("Resource accessed: apis://help");

  const helpText = `# API Manager - Quick Reference Guide

## Overview
The API Manager allows you to save API configurations and execute HTTP requests to any endpoint with full authentication support.

## Available Tools

### save_api
Save a new API configuration for future use.

**Example - GitHub API with Bearer Token:**
\`\`\`json
{
  "name": "github",
  "baseUrl": "https://api.github.com",
  "description": "GitHub REST API v3",
  "auth": {
    "type": "bearer",
    "credentials": {
      "token": "ghp_your_token_here"
    }
  },
  "headers": {
    "Accept": "application/vnd.github+json"
  }
}
\`\`\`

**Example - Weather API with API Key:**
\`\`\`json
{
  "name": "weather",
  "baseUrl": "https://api.openweathermap.org/data/2.5",
  "auth": {
    "type": "api-key",
    "credentials": {
      "apiKey": "your_api_key",
      "headerName": "X-API-Key"
    }
  }
}
\`\`\`

### make_request
Execute HTTP requests to saved APIs.

**Example - GET request with query params:**
\`\`\`json
{
  "apiName": "github",
  "endpoint": "/user/repos",
  "method": "GET",
  "queryParams": {
    "sort": "updated",
    "per_page": 10
  }
}
\`\`\`

**Example - POST request with body:**
\`\`\`json
{
  "apiName": "jsonplaceholder",
  "endpoint": "/posts",
  "method": "POST",
  "body": {
    "title": "My New Post",
    "body": "Content here",
    "userId": 1
  }
}
\`\`\`

### list_apis
List all saved API configurations.

### get_api
Get detailed configuration of a specific API (credentials are sanitized).

### delete_api
Delete an API configuration permanently.

## Authentication Types

- **none**: No authentication
- **bearer**: Bearer token in Authorization header
- **api-key**: Custom API key in specified header
- **basic**: Username/password Basic authentication

## Tips

1. **Security**: Credentials are never logged or exposed in sanitized responses
2. **Timeout**: Default timeout is 30 seconds, configurable per API
3. **Query Params**: Automatically URL-encoded
4. **Response Parsing**: Automatically detects JSON/text responses
5. **Error Handling**: Detailed error messages for troubleshooting

## Resources

- **apis://list**: Complete list of saved APIs with metadata
- **apis://stats**: Usage statistics and performance metrics
- **apis://help**: This help guide

## Support

For issues or feature requests, check the server logs and ensure your API configurations are valid.
`;

  return {
    contents: [{
      uri: "apis://help",
      mimeType: "text/markdown",
      text: helpText
    }]
  };
});

// Express app setup
const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    name: "api-manager-mcp",
    version: "1.0.0",
    description: "Universal API Manager for MCP - Save configurations and execute HTTP requests to any API",
    status: "running",
    mcp_endpoint: "/mcp",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    stats: {
      savedApis: apiConfigs.size,
      totalRequests: requestHistory.length
    }
  });
});

// Health endpoint for monitoring
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    savedApis: apiConfigs.size,
    totalRequests: requestHistory.length
  });
});

// Store transport instances
const transports: Record<string, StreamableHTTPServerTransport> = {};

// MCP endpoint handler
app.use("/mcp", (req, res) => {
  // Create a new transport for each request/session
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      addToLog(`MCP session initialized: ${sessionId}`);
      transports[sessionId] = transport;
    },
    onsessionclosed: (sessionId) => {
      addToLog(`MCP session closed: ${sessionId}`);
      delete transports[sessionId];
    }
  });

  // Connect the MCP server to this transport
  mcp.connect(transport).then(() => {
    // Handle the HTTP request through the transport
    transport.handleRequest(req, res);
  }).catch((error) => {
    console.error("Error connecting MCP to transport:", error);
    res.status(500).json({ error: "Internal server error" });
  });
});

// Start server
async function startServer() {
  try {
    addToLog("Starting API Manager MCP HTTP server");

    // Start Express server
    app.listen(PORT, () => {
      addToLog(`HTTP server listening on ${HOST}:${PORT}`);
      addToLog(`MCP endpoint available at /mcp`);
      addToLog(`Health check available at /health`);
      console.log(`
🚀 API Manager MCP Server is running!
📍 HTTP: http://${HOST}:${PORT}
🔗 MCP Endpoint: http://${HOST}:${PORT}/mcp
❤️  Health Check: http://${HOST}:${PORT}/health
🛠️  Tools: save_api, make_request, list_apis, get_api, delete_api
📚 Resources: apis://list, apis://stats, apis://help

For ChatGPT connector, use: https://your-domain.com/mcp
`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  addToLog("Received SIGINT, shutting down gracefully");
  // Close all transport connections
  Object.values(transports).forEach(transport => {
    transport.close?.();
  });
  process.exit(0);
});

process.on("SIGTERM", () => {
  addToLog("Received SIGTERM, shutting down gracefully");
  // Close all transport connections
  Object.values(transports).forEach(transport => {
    transport.close?.();
  });
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});