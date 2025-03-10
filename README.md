# Uniswap Trading Bot

High-performance trading bot for Uniswap with a web interface.

## Features

- Uniswap V2 and V3 pool exploration
- Swap simulation with USD value display
- Filter system for pool analysis
- Wallet management

## Deployment Options

This project can be deployed on either Vercel or Render.

### Deploying on Vercel (Recommended)

1. Fork or clone this repository to your GitHub account
2. In Vercel dashboard, create a new project
3. Connect your GitHub repository
4. Vercel will automatically detect the configuration from `vercel.json`
5. Set up the required environment variables in the Vercel dashboard

#### Environment Variables for Vercel

The following environment variables should be set in the Vercel dashboard:

- `INFURA_API_KEY` or `ALCHEMY_API_KEY`: Your Ethereum provider API key
- `ETHEREUM_NETWORK`: The Ethereum network to connect to (e.g., `mainnet`)
- `WS_ENDPOINT`: WebSocket endpoint for real-time updates (optional)
- `PRIVATE_KEY`: Private key for transactions (optional, only needed if executing trades)

### Alternative: Deploying on Render

This project is also configured for deployment on Render.com as a Web Service.

1. Fork or clone this repository to your GitHub account
2. In Render dashboard, create a new Web Service
3. Connect your GitHub repository
4. Render will automatically detect the configuration from `render.yaml`
5. Set up the required environment variables in the Render dashboard

#### Environment Variables for Render

The same environment variables listed for Vercel should be set in the Render dashboard.

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
