import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { TokenGenerator } from '../../domain/token-generator.port';

@Injectable()
export class NodeTokenGenerator implements TokenGenerator {
  generateOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  hashesMatch(hash: string, candidate: string): boolean {
    if (hash.length !== candidate.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
  }
}
