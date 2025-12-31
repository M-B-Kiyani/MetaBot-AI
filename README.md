# AI-Powered Chat and Voice Booking Assistant

A comprehensive Node.js application that provides conversational AI capabilities for Metalogics.io, enabling users to interact with an AI assistant to get company information, book services, and manage leads through both chat and voice interfaces.

## Features

- 🤖 AI-powered chat using Gemini API
- 📅 Google Calendar integration for booking management
- 🎯 HubSpot CRM integration for lead management
- ✉️ Automated email confirmations
- 🎙️ Voice interaction support via Retell AI
- 🌐 Embeddable widget for external websites
- 🔒 Production-ready security and error handling
- ☁️ Railway deployment ready

## Project Structure

```
├── app.js                 # Main Express application
├── server.js              # Production server startup
├── package.json           # Dependencies and scripts
├── .env.example           # Environment variables template
├── services/              # External API integrations
├── routes/                # Express route handlers
├── middleware/            # Custom middleware functions
├── utils/                 # Utility functions and helpers
└── test/                  # Test files
```

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`

### Development

Start the development server:

```bash
npm run dev
```

### Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Production

Start the production server:

```bash
npm start
```

## Environment Variables

| Variable                       | Description                        | Required |
| ------------------------------ | ---------------------------------- | -------- |
| `PORT`                         | Server port (default: 3000)        | No       |
| `NODE_ENV`                     | Environment mode                   | No       |
| `CORS_ORIGINS`                 | Allowed CORS origins               | No       |
| `LOG_LEVEL`                    | Logging level                      | No       |
| `GEMINI_API_KEY`               | Google Gemini API key              | Yes      |
| `HUBSPOT_API_KEY`              | HubSpot API key                    | Yes      |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google service account email       | Yes      |
| `GOOGLE_PRIVATE_KEY`           | Google service account private key | Yes      |
| `RETELL_API_KEY`               | Retell AI API key                  | Yes      |
| `RETELL_WEBHOOK_SECRET`        | Retell webhook secret              | Yes      |
| `GOOGLE_CALENDAR_ID`           | Target Google Calendar ID          | Yes      |
| `TIMEZONE`                     | Default timezone                   | No       |
| `EMAIL_USER`                   | Email account user                 | Yes      |
| `EMAIL_PASS`                   | Email App Password                 | Yes      |
| `EMAIL_SERVICE`                | Email provider (default: gmail)    | No       |

## API Endpoints

### Health Check

- `GET /health` - Application health status
- `GET /api/status` - API service status

### Chat (Coming Soon)

- `POST /api/chat` - AI chat interactions

### Booking (Coming Soon)

- `POST /api/booking` - Create new booking
- `GET /api/booking/availability` - Check availability

### Voice (Coming Soon)

- `POST /api/voice/webhook` - Retell webhook handler

## Architecture

The application follows a modular architecture with clear separation of concerns:

- **Express Server**: Handles HTTP requests and middleware
- **AI Service**: Manages Gemini API interactions
- **Booking Service**: Orchestrates booking flow
- **Calendar Service**: Google Calendar integration
- **Lead Manager**: HubSpot CRM integration
- **Voice Handler**: Retell AI voice processing

## Security Features

- Input validation and sanitization
- Rate limiting
- CORS configuration
- Security headers via Helmet
- Environment-based configuration
- Comprehensive error handling

## Deployment

The application is configured for deployment on Railway platform with:

- Environment variable configuration
- Health check endpoints
- Graceful shutdown handling
- Production logging

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

MIT License - see LICENSE file for details
