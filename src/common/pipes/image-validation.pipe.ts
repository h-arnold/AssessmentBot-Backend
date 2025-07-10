import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { detectBufferMime } from 'mime-detect';

import { ConfigService } from '../../config/config.service';

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
    } else if (typeof value === 'string' && value.startsWith('data:image')) {
      const matches = value.match(/^data:(.+);base64,(.*)$/);
      if (!matches || matches.length !== 3) {
        throw new BadRequestException('Invalid base64 image format.');
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      // Regex to check for valid base64 characters
      const base64Regex = /^[A-Za-z0-9+/=]*$/;
      if (!base64Regex.test(base64Data)) {
        throw new BadRequestException('Invalid base64 string format.');
      }

      if (!allowedMimeTypes.includes(mimeType)) {
        throw new BadRequestException('Invalid image type.');
      }

      if (base64Data.length === 0) {
        throw new BadRequestException('Empty image data is not allowed.');
      }

      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > maxFileSize) {
        throw new BadRequestException(
          `Image size exceeds the limit of ${this.configService.get('MAX_IMAGE_UPLOAD_SIZE_MB')}MB.`,
        );
      }
    }

    return value;
  }
}
