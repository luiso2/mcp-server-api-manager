# MCP Server Template for ChatGPT Connectors

A complete **Model Context Protocol (MCP)** server template designed specifically for ChatGPT connectors using **Streamable HTTP** transport. This template provides everything you need to create a custom MCP server that ChatGPT can connect to as a remote connector.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

### 3. Expose with HTTPS (for ChatGPT)

```bash
# Install ngrok globally
npm install -g ngrok

# In another terminal, expose your local server
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.app)
```

### 4. Connect to ChatGPT

1. **Enable Developer Mode**:
   - Go to ChatGPT → Settings → Connectors → Advanced → Enable "Developer mode"

2. **Create Connector**:
   - Settings → Connectors → Create
   - **Connector name**: "MCP Demo Server"
   - **Description**: "Demo MCP server with greeting, time, and calculator tools"
   - **Connector URL**: `https://your-ngrok-url.ngrok.app/mcp`
   - Click "Create"

3. **Test Your Connector**:
   - Start a new chat
   - Click "+" → Enable your connector
   - Try: *"Use the MCP Demo Server to say hello to Alice in Spanish"*

## 🛠️ Available Tools

### `say_hello`
- **Description**: Returns personalized greetings in multiple languages
- **Parameters**:
  - `name` (string, required): Person's name
  - `language` (string, optional): "en", "es", "fr" (default: "en")

### `get_current_time`
- **Description**: Gets current server time in various formats
- **Parameters**:
  - `format` (string, optional): "iso", "unix", "human" (default: "iso")
  - `timezone` (string, optional): Any valid timezone (default: "UTC")

### `calculate_basic`
- **Description**: Performs basic mathematical operations
- **Parameters**:
  - `operation` (string, required): "add", "subtract", "multiply", "divide"
  - `a` (number, required): First number
  - `b` (number, required): Second number

## 📊 Available Resources

### `status://server`
- **Description**: Server health and status information
- **Format**: JSON with uptime, memory usage, version info

### `info://capabilities`
- **Description**: Complete list of available tools and resources
- **Format**: JSON with server capabilities

### `logs://recent`
- **Description**: Recent server activity logs
- **Format**: Plain text with timestamped entries

## 🔧 Development

### Project Structure

```
mcp-chatgpt-template/
├── src/
│   └── server.ts          # Main server implementation
├── dist/                  # Compiled JavaScript (after build)
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run production server
- `npm run clean` - Remove build artifacts
- `npm run rebuild` - Clean and build

### Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: localhost)

## 🆕 Adding New Tools

1. **Define the tool in the `tools` array**:

```typescript
{
  name: "my_new_tool",
  description: "Clear description of what this tool does and when to use it",
  inputSchema: {
    type: "object",
    properties: {
      param1: {
        type: "string",
        description: "Parameter description"
      }
    },
    required: ["param1"]
  }
}
```

2. **Add the handler in the `CallToolRequestSchema` handler**:

```typescript
case "my_new_tool": {
  const { param1 } = request.params.arguments as { param1: string };

  // Your tool logic here

  return {
    content: [
      {
        type: "text",
        text: `Result: ${param1}`
      }
    ]
  };
}
```

## 📋 Adding New Resources

1. **Define the resource in the `resources` array**:

```typescript
{
  uri: "data://my-resource",
  name: "My Resource",
  description: "Description of what this resource provides",
  mimeType: "application/json"
}
```

2. **Add the handler in the `ReadResourceRequestSchema` handler**:

```typescript
case "data://my-resource": {
  const data = { /* your resource data */ };

  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}
```

## 🐛 Troubleshooting

### Common Issues

#### Tools not appearing in ChatGPT
- ✅ Verify your server is running and accessible via HTTPS
- ✅ Check that `/mcp` endpoint responds correctly
- ✅ Try "Refresh" button in ChatGPT connector settings
- ✅ Ensure tool descriptions are clear and specific

#### Connection timeouts
- ✅ Check firewall settings
- ✅ Verify ngrok is running and URL is correct
- ✅ Test with curl: `curl -X POST https://your-url.ngrok.app/mcp`

#### Tools not being used by ChatGPT
- ✅ Improve tool descriptions to be more specific about when to use them
- ✅ Add examples in the description
- ✅ Make sure tool names are descriptive

#### CORS errors
- ✅ CORS headers are already configured in the template
- ✅ If issues persist, check that your proxy/hosting service supports CORS

### Testing Without ChatGPT

Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to test your server locally:

```bash
npm install -g @modelcontextprotocol/inspector
mcp-inspector
```

## 🌐 Production Deployment

### Using Railway

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Deploy: `railway up`
4. Use Railway URL as your Connector URL

### Using Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. Deploy: `vercel --prod`
3. Use Vercel URL as your Connector URL

### Using Render

1. Connect your GitHub repo to Render
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Use Render URL as your Connector URL

## 📚 Learn More

### MCP Documentation
- [Model Context Protocol Specification](https://modelcontextprotocol.io/docs/concepts/architecture)
- [MCP SDK Documentation](https://modelcontextprotocol.io/docs/tools/typescript-sdk)
- [Transport Protocols](https://modelcontextprotocol.io/docs/concepts/transports)

### ChatGPT Connectors
- [ChatGPT Connector Documentation](https://platform.openai.com/docs/assistants/tools/connectors)
- [Developer Mode Guide](https://help.openai.com/en/articles/9275200-using-developer-mode-in-chatgpt)

### Examples
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [Community Examples](https://github.com/topics/model-context-protocol)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## ⭐ Support

If this template helped you, please give it a star! For issues or questions, please open an issue on GitHub.

---

**Happy coding with MCP! 🎉**