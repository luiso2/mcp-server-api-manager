# API Manager MCP Server 🚀

**Universal API Manager for MCP** - Save configurations and execute HTTP requests to any API with full authentication support.

Transform any AI into a powerful API client with persistent configurations, multiple authentication methods, and comprehensive request/response handling.

## ✨ Features

- **🤖 ChatGPT Deep Research Compatible**: Implements required `search` and `fetch` tools
- **🌊 SSE Compatible**: Server-Sent Events endpoint for real-time ChatGPT integration
- **🔐 Multiple Authentication Types**: Bearer Token, API Key, Basic Auth, None
- **💾 Persistent API Configurations**: Save and reuse API settings across sessions
- **📊 Request Analytics**: Track usage, response times, and success rates
- **🛡️ Security First**: Credentials are encrypted and never logged
- **⚡ Fast & Reliable**: Built with TypeScript, Express, and native Node.js fetch
- **📚 Comprehensive Resources**: Built-in help, stats, and API listings
- **🎯 MCP Native**: Designed specifically for Model Context Protocol

## 🚀 Quick Start

### Installation

```bash
cd "C:\MCP SERVERS CHATGPT\mcp-server-api-manager"
npm install
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

The server will be available at:
- **HTTP**: `http://localhost:3000`
- **MCP Endpoint**: `http://localhost:3000/mcp`
- **SSE Endpoint**: `http://localhost:3000/sse/` (for ChatGPT)
- **Health Check**: `http://localhost:3000/health`

## 🛠️ Available Tools

### 🤖 ChatGPT Deep Research Tools

### search
Search through saved API configurations and their usage history for ChatGPT Deep Research.

**Parameters:**
- `query` (string, required): Search query to find relevant API configurations, endpoints, or usage data

**Returns:**
- JSON object with `results` array containing matching APIs and endpoints
- Each result has `id`, `title`, and `url` for ChatGPT Deep Research compatibility

### fetch
Fetch detailed information about a specific API configuration or endpoint for ChatGPT Deep Research.

**Parameters:**
- `id` (string, required): Unique identifier for the API configuration or endpoint to fetch

**Returns:**
- JSON object with detailed information including `id`, `title`, `text`, `url`, and `metadata`
- Comprehensive documentation about the API or endpoint usage

### 🔧 API Management Tools

### save_api
Save a new API configuration for future use.

**Parameters:**
- `name` (string, required): Unique identifier for this API
- `baseUrl` (string, required): Base URL of the API
- `description` (string, optional): Description of what this API does
- `auth` (object, optional): Authentication configuration
  - `type`: `'bearer' | 'api-key' | 'basic' | 'none'`
  - `credentials`: Authentication credentials object
- `headers` (object, optional): Default headers for all requests
- `timeout` (number, optional): Request timeout in milliseconds (default: 30000)

### make_request
Execute HTTP requests to saved APIs.

**Parameters:**
- `apiName` (string, required): Name of the saved API configuration
- `endpoint` (string, required): API endpoint relative to base URL
- `method` (string, required): HTTP method (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`)
- `body` (any, optional): Request body for POST/PUT/PATCH
- `queryParams` (object, optional): Query parameters as key-value pairs
- `headers` (object, optional): Additional headers for this specific request

### list_apis
List all saved API configurations with their details.

### get_api
Get detailed configuration of a specific saved API (credentials are sanitized).

**Parameters:**
- `name` (string, required): Name of the API to retrieve

### delete_api
Delete a saved API configuration permanently.

**Parameters:**
- `name` (string, required): Name of the API to delete

## 📚 Available Resources

### apis://list
Complete list of all saved API configurations with metadata and statistics.

### apis://stats
Usage statistics including total requests, success rates, response times, and recent activity.

### apis://help
Interactive help guide with examples and best practices.

## 🔐 Authentication Examples

### Bearer Token (GitHub API)

```javascript
// Save GitHub API configuration
{
  "name": "github",
  "baseUrl": "https://api.github.com",
  "description": "GitHub REST API v3",
  "auth": {
    "type": "bearer",
    "credentials": {
      "token": "ghp_your_personal_access_token_here"
    }
  },
  "headers": {
    "Accept": "application/vnd.github+json"
  }
}
```

### API Key in Header (OpenWeather)

```javascript
// Save OpenWeather API configuration
{
  "name": "weather",
  "baseUrl": "https://api.openweathermap.org/data/2.5",
  "description": "OpenWeather API",
  "auth": {
    "type": "api-key",
    "credentials": {
      "apiKey": "your_api_key_here",
      "headerName": "X-API-Key"
    }
  }
}
```

### Basic Authentication

```javascript
// Save API with Basic Auth
{
  "name": "protected-api",
  "baseUrl": "https://api.example.com",
  "auth": {
    "type": "basic",
    "credentials": {
      "username": "your_username",
      "password": "your_password"
    }
  }
}
```

### No Authentication

```javascript
// Save public API
{
  "name": "jsonplaceholder",
  "baseUrl": "https://jsonplaceholder.typicode.com",
  "description": "JSONPlaceholder - Free fake REST API for testing",
  "auth": {
    "type": "none"
  }
}
```

## 📖 Usage Examples

### Example 1: GitHub Repository List

```javascript
// 1. Save GitHub API (one time setup)
save_api({
  "name": "github",
  "baseUrl": "https://api.github.com",
  "auth": {
    "type": "bearer",
    "credentials": {
      "token": "ghp_your_token"
    }
  }
})

// 2. Get your repositories
make_request({
  "apiName": "github",
  "endpoint": "/user/repos",
  "method": "GET",
  "queryParams": {
    "sort": "updated",
    "per_page": 10
  }
})
```

### Example 2: Create a Blog Post

```javascript
// 1. Save JSONPlaceholder API
save_api({
  "name": "blog",
  "baseUrl": "https://jsonplaceholder.typicode.com"
})

// 2. Create a new post
make_request({
  "apiName": "blog",
  "endpoint": "/posts",
  "method": "POST",
  "body": {
    "title": "My Awesome Blog Post",
    "body": "This is the content of my blog post...",
    "userId": 1
  }
})
```

### Example 3: Weather Data

```javascript
// 1. Save Weather API
save_api({
  "name": "weather",
  "baseUrl": "https://api.openweathermap.org/data/2.5",
  "auth": {
    "type": "api-key",
    "credentials": {
      "apiKey": "your_api_key",
      "headerName": "appid"
    }
  }
})

// 2. Get weather for a city
make_request({
  "apiName": "weather",
  "endpoint": "/weather",
  "method": "GET",
  "queryParams": {
    "q": "London,UK",
    "units": "metric"
  }
})
```

### Example 4: Update Resource

```javascript
// Update a user via PUT request
make_request({
  "apiName": "jsonplaceholder",
  "endpoint": "/users/1",
  "method": "PUT",
  "body": {
    "name": "Updated Name",
    "email": "updated@example.com"
  },
  "headers": {
    "Content-Type": "application/json"
  }
})
```

### Example 5: Delete Resource

```javascript
// Delete a post
make_request({
  "apiName": "jsonplaceholder",
  "endpoint": "/posts/1",
  "method": "DELETE"
})
```

## 🛡️ Security Features

### Credential Protection
- **Never Logged**: Sensitive credentials are never written to logs
- **Memory Only**: All configurations stored in memory (not persisted to disk)
- **Sanitized Responses**: API configurations return `[REDACTED]` for sensitive fields
- **Secure Headers**: Proper CORS and security headers configured

### Best Practices
1. **Use Environment Variables**: Store sensitive tokens in environment variables when possible
2. **Rotate Credentials**: Regularly update API keys and tokens
3. **Limit Scope**: Use API keys with minimal required permissions
4. **Monitor Usage**: Use the stats resource to track API usage patterns

## ⚡ Performance Features

### Request Optimization
- **Timeout Control**: Configurable timeout per API (default: 30 seconds)
- **Connection Reuse**: HTTP/1.1 keep-alive for better performance
- **Error Handling**: Comprehensive error reporting with context
- **Response Parsing**: Automatic JSON/text detection and parsing

### Memory Management
- **Circular Buffers**: Activity logs and request history use circular buffers
- **Bounded Storage**: Maximum 100 recent requests and log entries
- **Efficient Lookups**: Map-based storage for O(1) API configuration access

## 📊 Monitoring & Analytics

### Usage Statistics
- **Total APIs**: Number of saved API configurations
- **Request Count**: Total HTTP requests made
- **Success Rate**: Percentage of successful requests (2xx status codes)
- **Average Response Time**: Mean response time across all requests
- **Most Used API**: API with the highest request count
- **Recent Activity**: Last 10 requests with status and timing

### Health Monitoring
- **Server Uptime**: Time since server started
- **Memory Usage**: Current memory consumption
- **Active Sessions**: Number of active MCP sessions
- **Request History**: Detailed logs of all API interactions

## 🔧 Technical Details

### Architecture
- **Node.js**: Runtime environment
- **TypeScript**: Type-safe development
- **Express**: HTTP server framework
- **MCP SDK**: Model Context Protocol implementation
- **Zod**: Runtime type validation
- **Native Fetch**: HTTP client (Node.js 18+)

### Storage
- **In-Memory**: All data stored in memory (Map-based)
- **Session-Based**: Data persists for server lifetime only
- **No Database**: Zero external dependencies for storage
- **Fast Access**: O(1) lookups for API configurations

### Error Handling
- **Comprehensive**: Every tool includes try-catch error handling
- **Descriptive**: Clear error messages with context
- **Logged**: All errors logged with timestamps
- **Graceful**: Errors don't crash the server

## 🚦 API Response Format

### Successful Requests
```javascript
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    "content-length": "123"
  },
  "body": {
    // Parsed response body
  },
  "responseTime": 245  // milliseconds
}
```

### Error Handling
- **Network Errors**: Connection failures, DNS resolution issues
- **Timeout Errors**: Requests exceeding configured timeout
- **HTTP Errors**: 4xx and 5xx status codes (still return response data)
- **Parsing Errors**: Invalid JSON or unexpected content types

## 🔄 Common Workflows

### Setup Workflow
1. **Save API Configuration**: Use `save_api` with your API details
2. **Test Connection**: Make a simple GET request with `make_request`
3. **Verify Setup**: Use `get_api` to confirm configuration
4. **Monitor Usage**: Check `apis://stats` for request analytics

### Development Workflow
1. **List APIs**: Use `list_apis` to see all saved configurations
2. **Make Requests**: Use `make_request` for all HTTP operations
3. **Debug Issues**: Check server logs and response status codes
4. **Update Config**: Delete and re-save APIs to update configurations

### Maintenance Workflow
1. **Monitor Stats**: Regular checks of `apis://stats` resource
2. **Clean Up**: Delete unused APIs with `delete_api`
3. **Update Credentials**: Rotate API keys and tokens as needed
4. **Health Check**: Monitor `/health` endpoint for server status

## 📋 Troubleshooting

### Common Issues

#### "API not found" Error
- **Cause**: Trying to use an API that hasn't been saved
- **Solution**: Use `list_apis` to see available APIs or `save_api` to add it

#### Timeout Errors
- **Cause**: API taking longer than configured timeout
- **Solution**: Increase timeout in API configuration or check API status

#### Authentication Errors (401/403)
- **Cause**: Invalid or expired credentials
- **Solution**: Update API credentials using `delete_api` and `save_api`

#### Connection Errors
- **Cause**: Network issues or invalid base URLs
- **Solution**: Verify URL format and network connectivity

### Debug Tips

1. **Check Logs**: Server logs show detailed request information
2. **Verify URLs**: Ensure base URLs are complete and correct
3. **Test Authentication**: Use API provider's documentation to verify credentials
4. **Monitor Resources**: Use `apis://stats` to track request patterns
5. **Health Check**: Verify server status with `/health` endpoint

## 🤖 ChatGPT Deep Research Integration

This server is **fully compatible** with ChatGPT Deep Research! It implements the required `search` and `fetch` tools that ChatGPT needs for deep research capabilities.

### Usage with ChatGPT Deep Research

1. **Save your APIs**: Use the management tools to save API configurations
2. **Let ChatGPT search**: ChatGPT can search through your saved APIs using the `search` tool
3. **Detailed information**: ChatGPT can fetch comprehensive details about any API or endpoint using the `fetch` tool
4. **Execute requests**: ChatGPT can make HTTP requests to your saved APIs using `make_request`

### What ChatGPT Can Research

- **API Configurations**: Find APIs by name, description, or base URL
- **Authentication Methods**: Discover which APIs use Bearer tokens, API keys, etc.
- **Endpoint History**: Search through previously used endpoints and methods
- **Usage Statistics**: Get performance data and success rates
- **API Documentation**: Access detailed information about any saved API

## 🌐 ChatGPT Connector Setup

### 1. Expose with HTTPS (for ChatGPT)

```bash
# Install ngrok globally
npm install -g ngrok

# In another terminal, expose your local server
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.app)
```

### 2. Connect to ChatGPT

1. **Enable Developer Mode**:
   - Go to ChatGPT → Settings → Connectors → Advanced → Enable "Developer mode"

2. **Create Connector**:
   - Settings → Connectors → Create
   - **Connector name**: "API Manager"
   - **Description**: "Universal API manager with Deep Research - save configurations and execute HTTP requests with authentication"
   - **Connector URL**: `https://your-ngrok-url.ngrok.app/sse/`
   - Click "Create"

3. **Test Your Connector**:
   - Start a new chat
   - Click "+" → Enable your connector
   - Try: *"Save a JSONPlaceholder API configuration and then get the first 5 posts"*
   - Or use with Deep Research: *"Research the available API configurations and find ones that use authentication"*

## 🤝 Contributing

This is a transformation of the MCP template server. The code follows these principles:

- **Security First**: Never log or expose sensitive credentials
- **Type Safety**: Full TypeScript coverage with strict settings
- **Error Resilience**: Comprehensive error handling throughout
- **Performance**: Efficient memory usage and fast lookups
- **Usability**: Clear API with helpful error messages

## 📄 License

MIT License - feel free to use this in your own projects!

## 🆘 Support

For issues or questions:

1. Check the built-in help: Access `apis://help` resource
2. Monitor server logs for detailed error information
3. Verify API configurations with `get_api` tool
4. Test with simple public APIs first (like JSONPlaceholder)

---

**🎯 Perfect for**: API testing, prototyping, integration development, and giving AIs the power to interact with any REST API!

**🔥 Use Cases**:
- GitHub repository management
- Weather data collection
- Social media posting
- E-commerce operations
- Database API interactions
- Webhook testing
- API monitoring
- Integration testing

Transform your AI into a universal API client today! 🚀