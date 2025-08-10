# Environment Variables

The application uses environment variables for configuration. Copy `.env.example` to `.env` and configure the following variables:

### Required Variables

- `GEMINI_API_KEY`: The API key for the Google Gemini service. Required for LLM functionality.

### Authentication & Security

- `API_KEYS`: Comma-separated list of valid API keys for client authentication. Use strong, randomly generated strings (e.g., `openssl rand -base64 32`).

### Image Upload Configuration

- `MAX_IMAGE_UPLOAD_SIZE_MB`: Sets the maximum allowed image size (in megabytes) for uploads. Default is `1` MB.
- `ALLOWED_IMAGE_MIME_TYPES`: Comma-separated list of allowed image MIME types (e.g., `image/png,image/jpeg`). Default is `image/png`.

### Rate Limiting (Throttling)

- `THROTTLER_TTL`: Time-to-live for rate-limiting windows in milliseconds. Default is `10000`.
- `UNAUTHENTICATED_THROTTLER_LIMIT`: Maximum requests per TTL window for unauthenticated routes. Default is `10`.
- `AUTHENTICATED_THROTTLER_LIMIT`: Maximum requests per TTL window for authenticated routes. Default is `90`.

### LLM Configuration

- `LLM_BACKOFF_BASE_MS`: Base backoff time in milliseconds for LLM rate limit retries. Default is `1000`.
- `LLM_MAX_RETRIES`: Maximum number of retry attempts for LLM rate limit errors. Default is `3`.

### Application Settings

- `NODE_ENV`: Application environment (`development`, `production`, `test`). Default is `development`.
- `PORT`: Port on which the server runs. Default is `3000`.
- `APP_NAME`: Application name. Default is `AssessmentBot-Backend`.
- `APP_VERSION`: Application version. Optional, defaults to version from `package.json`.
- `LOG_LEVEL`: Logging verbosity level (`fatal`, `error`, `warn`, `info`, `debug`, `verbose`). Default is `info`.

### Example Configuration

```env
NODE_ENV=development
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
API_KEYS=your_secret_key,another_secret_key
MAX_IMAGE_UPLOAD_SIZE_MB=1
ALLOWED_IMAGE_MIME_TYPES=image/png,image/jpeg
```

All variables are validated at startup using Zod schemas to ensure type safety and proper configuration.
