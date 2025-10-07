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

// Create MCP server instance
const mcp = new McpServer({
  name: "mcp-chatgpt-template",
  version: "1.0.0",
  description: "MCP server template for ChatGPT connectors"
}, {
  capabilities: {
    tools: {},
    resources: {}
  }
});

// Register tools
mcp.tool("say_hello", "Returns a personalized greeting message. Use when you need to greet someone or test the connection.", {
  name: z.string().describe("The name of the person to greet"),
  language: z.enum(["en", "es", "fr"]).optional().describe("Language for the greeting (en, es, fr)")
}, async ({ name, language = "en" }) => {
  addToLog(`Tool called: say_hello for ${name} in ${language}`);

  const greetings = {
    en: `Hello, ${name}! 👋 Welcome to our MCP server.`,
    es: `¡Hola, ${name}! 👋 Bienvenido a nuestro servidor MCP.`,
    fr: `Bonjour, ${name}! 👋 Bienvenue sur notre serveur MCP.`
  };

  return {
    content: [
      {
        type: "text",
        text: greetings[language] || greetings.en
      }
    ]
  };
});

mcp.tool("get_current_time", "Returns the current server time in various formats. Useful for timestamps and time-based operations.", {
  format: z.enum(["iso", "unix", "human"]).optional().describe("Time format: iso, unix, or human"),
  timezone: z.string().optional().describe("Timezone (UTC, America/New_York, Europe/Madrid, etc.)")
}, async ({ format = "iso", timezone = "UTC" }) => {
  addToLog(`Tool called: get_current_time (${format}, ${timezone})`);

  const now = new Date();
  let timeString: string;

  switch (format) {
    case "unix":
      timeString = Math.floor(now.getTime() / 1000).toString();
      break;
    case "human":
      timeString = now.toLocaleString("en-US", { timeZone: timezone });
      break;
    case "iso":
    default:
      timeString = now.toISOString();
  }

  return {
    content: [
      {
        type: "text",
        text: `Current time (${format}, ${timezone}): ${timeString}`
      }
    ]
  };
});

mcp.tool("calculate_basic", "Performs basic mathematical calculations (addition, subtraction, multiplication, division).", {
  operation: z.enum(["add", "subtract", "multiply", "divide"]).describe("Mathematical operation to perform"),
  a: z.number().describe("First number"),
  b: z.number().describe("Second number")
}, async ({ operation, a, b }) => {
  addToLog(`Tool called: calculate_basic (${a} ${operation} ${b})`);

  let result: number;
  let operationSymbol: string;

  switch (operation) {
    case "add":
      result = a + b;
      operationSymbol = "+";
      break;
    case "subtract":
      result = a - b;
      operationSymbol = "-";
      break;
    case "multiply":
      result = a * b;
      operationSymbol = "×";
      break;
    case "divide":
      if (b === 0) {
        throw new Error("Division by zero is not allowed");
      }
      result = a / b;
      operationSymbol = "÷";
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return {
    content: [
      {
        type: "text",
        text: `${a} ${operationSymbol} ${b} = ${result}`
      }
    ]
  };
});

// Register resources
mcp.registerResource("server-status", "status://server", {
  description: "Current status and health information of the MCP server",
  mimeType: "application/json"
}, async () => {
  addToLog("Resource accessed: status://server");

  const status = {
    status: "healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    tools_count: 3,
    resources_count: 3
  };

  return {
    contents: [
      {
        uri: "status://server",
        mimeType: "application/json",
        text: JSON.stringify(status, null, 2)
      }
    ]
  };
});

mcp.registerResource("server-capabilities", "info://capabilities", {
  description: "Information about available tools and resources",
  mimeType: "application/json"
}, async () => {
  addToLog("Resource accessed: info://capabilities");

  const capabilities = {
    server: {
      name: "mcp-chatgpt-template",
      version: "1.0.0",
      description: "MCP server template for ChatGPT connectors"
    },
    tools: [
      { name: "say_hello", description: "Returns a personalized greeting message" },
      { name: "get_current_time", description: "Returns the current server time in various formats" },
      { name: "calculate_basic", description: "Performs basic mathematical calculations" }
    ],
    resources: [
      { uri: "status://server", name: "Server Status", description: "Current status and health information" },
      { uri: "info://capabilities", name: "Server Capabilities", description: "Information about available tools and resources" },
      { uri: "logs://recent", name: "Recent Logs", description: "Recent server activity logs" }
    ]
  };

  return {
    contents: [
      {
        uri: "info://capabilities",
        mimeType: "application/json",
        text: JSON.stringify(capabilities, null, 2)
      }
    ]
  };
});

mcp.registerResource("server-logs", "logs://recent", {
  description: "Recent server activity logs",
  mimeType: "text/plain"
}, async () => {
  addToLog("Resource accessed: logs://recent");

  const recentLogs = activityLog.slice(-20).join("\n");

  return {
    contents: [
      {
        uri: "logs://recent",
        mimeType: "text/plain",
        text: recentLogs || "No recent activity"
      }
    ]
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
    name: "mcp-chatgpt-template",
    version: "1.0.0",
    description: "MCP server template for ChatGPT connectors",
    status: "running",
    mcp_endpoint: "/mcp",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Health endpoint for monitoring
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
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
    addToLog("Starting MCP HTTP server");

    // Start Express server
    app.listen(PORT, () => {
      addToLog(`HTTP server listening on ${HOST}:${PORT}`);
      addToLog(`MCP endpoint available at /mcp`);
      addToLog(`Health check available at /health`);
      console.log(`
🚀 MCP Server is running!
📍 HTTP: http://${HOST}:${PORT}
🔗 MCP Endpoint: http://${HOST}:${PORT}/mcp
❤️  Health Check: http://${HOST}:${PORT}/health

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