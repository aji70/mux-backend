import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  AuthProvider,
  isValidAuthProvider,
  getValidProviderNames,
} from './auth-provider.enum';

/**
 * Plain payload shape inspected by {@link AuthPayloadValidator}.
 */
export interface AuthPayload {
  authId?: string;
  email?: string;
  displayName?: string;
  authProvider?: AuthProvider | string | null;
  network?: string;
}

/**
 * Validates authentication payloads from identity providers.
 *
 * Fail-closed: invalid or missing claims are rejected.
 */
@Injectable()
export class AuthPayloadValidator {
  private static readonly logger = new Logger(AuthPayloadValidator.name);

  static validate(payload: AuthPayload): void {
    if (!payload) {
      throw new BadRequestException('Payload is required');
    }

    if (payload.authProvider !== undefined && payload.authProvider !== null) {
      if (typeof payload.authProvider !== 'string') {
        throw new BadRequestException('authProvider must be a string');
      }

      if (payload.authProvider.trim() === '') {
        throw new BadRequestException('authProvider cannot be empty');
      }

      if (!isValidAuthProvider(payload.authProvider)) {
        const validNames = getValidProviderNames().join(', ');
        throw new BadRequestException(
          `authProvider must be one of: ${validNames}`,
        );
      }
    }
  }
}

@Injectable()
export class AuthOrchestratorService {
  private readonly logger = new Logger(AuthOrchestratorService.name);

  validatePayload(payload: AuthPayload): boolean {
    if (!payload.authId) {
      this.logger.warn('Missing authId in payload');
      return false;
    }

    try {
      AuthPayloadValidator.validate(payload);
      return true;
    } catch (error) {
      this.logger.warn('Invalid authProvider', {
        provider: payload.authProvider,
        error: (error as Error).message,
      });
      return false;
    }
  }
}
