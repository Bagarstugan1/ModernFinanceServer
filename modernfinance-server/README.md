# ModernFinance Server

Express.js backend server for the ModernFinance AI-powered stock research assistant.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Add your API keys to the `.env` file:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`

## Development

Run the development server:
```bash
npm run dev
```

The server will start on http://localhost:3000

## API Endpoints

- `GET /health` - Health check endpoint

## Security Features

- Helmet.js for security headers
- CORS configured for iOS app
- Rate limiting (60 requests/minute)
- Request compression
- Input validation
- Error handling

## Build

Build for production:
```bash
npm run build
npm start
```