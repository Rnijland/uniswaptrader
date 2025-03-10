# Uniswap Trading Bot

High-performance trading bot for Uniswap with a web interface.

## Features

- Uniswap V2 and V3 pool exploration
- Swap simulation with USD value display
- Filter system for pool analysis
- Wallet management

## Deployment on Render

This project is configured for easy deployment on Render.com as a Web Service.

### Automatic Deployment

1. Fork or clone this repository to your GitHub account
2. In Render dashboard, create a new Web Service
3. Connect your GitHub repository
4. Render will automatically detect the configuration from `render.yaml`
5. Set up the required environment variables in the Render dashboard

### Environment Variables

The following environment variables should be set in the Render dashboard:

- `INFURA_API_KEY` or `ALCHEMY_API_KEY`: Your Ethereum provider API key
- Any other API keys or secrets used by your application

### Manual Configuration (if needed)

If you prefer to configure manually:

- **Build Command**: `npm install && npm run build`
- **Start Command**: `node dist/index.js`
- **Environment**: Node.js
- **Plan**: Free (or choose a paid plan for better performance)

## Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

- `src/`: Source code
  - `config/`: Configuration files
  - `core/`: Core functionality
  - `exchanges/`: Exchange integrations
  - `filters/`: Filter system
  - `routes/`: API routes
  - `ui/`: Web interface
    - `controllers/`: UI controllers
    - `public/`: Static assets
    - `views/`: EJS templates
  - `utils/`: Utility functions
- `dist/`: Compiled JavaScript (generated)
- `wallets/`: Wallet data storage
