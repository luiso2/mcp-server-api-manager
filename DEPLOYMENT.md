# 🚀 Deployment Guide

This guide covers different ways to deploy your MCP server for production use with ChatGPT connectors.

## 🌐 Production Requirements

For ChatGPT to connect to your MCP server, you need:
- ✅ **HTTPS URL** (required for ChatGPT connectors)
- ✅ **Public accessibility** (not localhost)
- ✅ **Reliable uptime** (for consistent ChatGPT experience)
- ✅ **CORS enabled** (already configured in template)

## 🔧 Deployment Options

### 1. Railway (Recommended - Easy)

**Pros**: Zero config, automatic HTTPS, good for beginners
**Cost**: Free tier available, then $5/month

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy (first time)
railway up

# Get your URL
railway domain
# Use: https://your-app.railway.app/mcp
```

**Environment Variables in Railway**:
- No special config needed
- Railway automatically sets `PORT`

### 2. Render (Good for production)

**Pros**: Great uptime, built-in SSL, good monitoring
**Cost**: Free tier (sleeps after 15min), paid starts at $7/month

1. **Connect GitHub**:
   - Push your code to GitHub
   - Connect your repo to Render

2. **Configure Service**:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

3. **Environment Variables**:
   ```
   NODE_ENV=production
   ```

4. **Your URL**: `https://your-service.onrender.com/mcp`

### 3. Vercel (Serverless)

**Pros**: Excellent performance, global CDN, generous free tier
**Cost**: Free tier very generous, then $20/month

**⚠️ Note**: Vercel uses serverless functions, so you need a slight modification:

1. **Create `api/mcp.ts`**:
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/server';

export default app;
```

2. **Update `package.json`**:
```json
{
  "scripts": {
    "vercel-build": "npm run build"
  }
}
```

3. **Deploy**:
```bash
npm install -g vercel
vercel --prod
```

4. **Your URL**: `https://your-project.vercel.app/api/mcp`

### 4. Digital Ocean App Platform

**Pros**: Good balance of features and cost
**Cost**: $5/month for basic app

1. **Connect GitHub repo**
2. **Configure**:
   - **Source Directory**: `/`
   - **Build Command**: `npm run build`
   - **Run Command**: `npm start`

3. **Your URL**: `https://your-app.ondigitalocean.app/mcp`

### 5. Heroku

**Pros**: Classic PaaS, lots of documentation
**Cost**: $5-7/month (no free tier anymore)

1. **Create `Procfile`**:
```
web: npm start
```

2. **Deploy**:
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Deploy
git push heroku main
```

3. **Your URL**: `https://your-app.herokuapp.com/mcp`

### 6. AWS App Runner (Advanced)

**Pros**: Auto-scaling, pay-per-use, AWS ecosystem
**Cost**: Pay per request + compute time

1. **Create `apprunner.yaml`**:
```yaml
version: 1.0
runtime: nodejs18
build:
  commands:
    build:
      - npm install
      - npm run build
run:
  runtime-version: 18
  command: npm start
  network:
    port: 3000
    env: PORT
  env:
    - name: NODE_ENV
      value: production
```

2. **Deploy via AWS Console or CLI**

3. **Your URL**: `https://abc123.region.awsapprunner.com/mcp`

## 🏠 Self-Hosting Options

### Docker + VPS

**Pros**: Full control, cost-effective for multiple apps
**Cost**: VPS from $5/month + domain/SSL setup

1. **Create `Dockerfile`**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["npm", "start"]
```

2. **Build and deploy**:
```bash
# Build locally
npm run build
docker build -t mcp-server .

# Deploy to VPS
docker run -d -p 3000:3000 mcp-server
```

3. **Setup reverse proxy** (Nginx + Let's Encrypt for HTTPS)

### Using PM2 + VPS

**Pros**: Good for Node.js apps, process management
**Cost**: VPS from $5/month

```bash
# On your VPS
npm install -g pm2
pm2 start dist/server.js --name mcp-server
pm2 startup
pm2 save
```

## 🔍 Testing Your Deployment

### 1. Health Check
```bash
curl https://your-domain.com/health
```

### 2. MCP Endpoint Test
```bash
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### 3. ChatGPT Connection Test
1. Go to ChatGPT Settings → Connectors
2. Add your URL: `https://your-domain.com/mcp`
3. Check that tools appear correctly

## 🛡️ Production Best Practices

### Security
- ✅ Use HTTPS (handled by most platforms)
- ✅ Rate limiting (consider adding middleware)
- ✅ Input validation (already in template)
- ✅ No sensitive data in logs

### Monitoring
```typescript
// Add to your server.ts
app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});
```

### Environment Variables
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

### Scaling Considerations
- Most platforms auto-scale
- For high traffic, consider:
  - Redis for shared state
  - Load balancing
  - Database connections pooling

## 🐛 Troubleshooting Deployment

### Common Issues

**"Application failed to start"**
- Check build logs
- Verify `npm start` works locally
- Ensure all dependencies in `package.json`

**"Cannot connect from ChatGPT"**
- Verify HTTPS is working
- Test `/mcp` endpoint manually
- Check CORS headers

**"Tools not appearing"**
- Verify JSON responses are valid
- Check server logs for errors
- Test with MCP Inspector locally first

### Debugging Commands

```bash
# Check if your service is running
curl -I https://your-domain.com/

# Test MCP handshake
curl https://your-domain.com/mcp -v

# Check logs (platform specific)
railway logs --tail  # Railway
heroku logs --tail   # Heroku
# etc.
```

## 📊 Cost Comparison

| Platform | Free Tier | Paid Start | Best For |
|----------|-----------|------------|----------|
| Railway | Yes (limited) | $5/mo | Beginners |
| Render | Yes (sleeps) | $7/mo | Production |
| Vercel | Very generous | $20/mo | Serverless |
| DigitalOcean | No | $5/mo | Balanced |
| Heroku | No | $7/mo | Enterprise |
| VPS | No | $5/mo | Self-hosting |

## 🎯 Recommended Path

**For beginners**: Railway → super easy setup
**For production**: Render or Railway → great reliability
**For scale**: Vercel → handles traffic spikes well
**For control**: VPS + Docker → full customization

---

Need help? Check the main README.md or open an issue! 🚀