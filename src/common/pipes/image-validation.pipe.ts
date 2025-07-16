import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { detectBufferMime } from 'mime-detect';
import validator from 'validator';

import { ConfigService } from '../../config/config.service';

/**
 * A pipe for validating image uploads, ensuring they meet size and format requirements.
 * This pipe supports both binary image buffers and base64-encoded image strings.
 *
 * @class ImageValidationPipe
 * @implements {PipeTransform}
 *
 * @constructor
 * @param {ConfigService} configService - Service for accessing configuration values.
 *
 * @method transform
 * Validates the provided image data based on its type (Buffer or base64 string).
 * Throws a `BadRequestException` if the image fails validation.
 *
 * @param {unknown} value - The image data to validate. Can be a Buffer or a base64 string.
 * @returns {Promise<unknown>} - The validated image data, or the original value if validation passes.
 *
 * Validation Rules:
 * - For Buffers:
 *   - Must not be empty.
 *   - Must not exceed the maximum file size defined in configuration.
 *   - Must have a MIME type included in the allowed list.
 * - For base64 strings:
 *   - Must not exceed a length limit to mitigate ReDoS risks.
 *   - Must start with a valid Data URI prefix (`data:image/`).
 *   - Must be base64-encoded.
 *   - Must have a MIME type included in the allowed list.
 *   - Must decode to a non-empty Buffer.
 *   - Must not exceed the maximum file size defined in configuration.
 *
 * Exceptions:
 * - Throws `BadRequestException` for invalid image buffers or base64 strings.
 *
 * Configuration Keys:
 * - `MAX_IMAGE_UPLOAD_SIZE_MB`: Maximum allowed image size in megabytes.
 * - `ALLOWED_IMAGE_MIME_TYPES`: List of allowed MIME types for images.
 */
@Injectable()
export class ImageValidationPipe implements PipeTransform {
  constructor(private readonly configService: ConfigService) {}

  async transform(value: unknown): Promise<unknown> {
    const maxFileSize =
      this.configService.get('MAX_IMAGE_UPLOAD_SIZE_MB') * 1024 * 1024;
    const allowedMimeTypes = this.configService.get('ALLOWED_IMAGE_MIME_TYPES');

    if (Buffer.isBuffer(value)) {
      if (value.length === 0) {
        throw new BadRequestException('Empty image buffer is not allowed.');
      }

      if (value.length > maxFileSize) {
        throw new BadRequestException(
          `Image size exceeds the limit of ${this.configService.get('MAX_IMAGE_UPLOAD_SIZE_MB')}MB.`,
        );
      }

      const fileType = await detectBufferMime(value);
      if (!fileType || !allowedMimeTypes.includes(fileType)) {
        throw new BadRequestException('Invalid image type.');
      }
    } else if (typeof value === 'string') {
      // 1. Length check to mitigate ReDoS risk
      if (value.length > 10 * 1024 * 1024) {
        throw new BadRequestException('Base64 image string is too large.');
      }
      // 2. Non-Data URIs: return immediately for performance
      if (!value.startsWith('data:')) {
        return value;
      }
      // 3. Only accept image Data URIs
      if (!value.startsWith('data:image/')) {
        throw new BadRequestException('Invalid base64 image format.');
      }
      // 4. Parse Data URI header and data
      const commaIndex = value.indexOf(',');
      if (commaIndex === -1) {
        throw new BadRequestException('Invalid base64 image format.');
      }
      const header = value.substring(5, commaIndex); // strip 'data:'
      const [mimeType, encoding] = header.split(';');
      // 5. Ensure base64 encoding
      if (encoding !== 'base64') {
        throw new BadRequestException('Invalid base64 image format.');
      }
      // 6. Validate allowed MIME types
      if (!allowedMimeTypes.includes(mimeType)) {
        throw new BadRequestException('Invalid image type.');
      }
      // 7. Extract and validate base64 payload
      const base64Data = value.substring(commaIndex + 1);
      if (base64Data.length === 0) {
        throw new BadRequestException('Empty image data is not allowed.');
      }
      if (!validator.isBase64(base64Data)) {
        throw new BadRequestException('Invalid base64 string format.');
      }
      // 8. Buffer and size validation
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length === 0) {
        throw new BadRequestException('Empty image buffer is not allowed.');
      }
      if (buffer.length > maxFileSize) {
        throw new BadRequestException(
          `Image size exceeds the limit of ${this.configService.get('MAX_IMAGE_UPLOAD_SIZE_MB')}MB.`,
        );
      }
    }

    return value;
  }
}
