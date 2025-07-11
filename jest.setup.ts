// Jest setup file for test environment configuration
// Import.meta.url issues are now handled by the getCurrentDirname() utility
// from src/common/file-utils.ts instead of babel transformations

process.env.GEMINI_API_KEY = 'test-key';
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.API_KEYS = 'test-api-key';
process.env.MAX_IMAGE_UPLOAD_SIZE_MB = '5';
process.env.ALLOWED_IMAGE_MIME_TYPES = 'image/png,image/jpeg';
process.env.APP_NAME = 'AssessmentBot';
process.env.APP_VERSION = '1.0.0';
