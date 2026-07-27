import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { NotificationType } from './notification-type';

export function buildDedupeKey(type: NotificationType, ...parts: string[]): string {
  const allParts = [type, ...parts];

  for (const part of allParts) {
    if (part.length === 0 || part.includes(':')) {
      throw new InvalidValueException(`dedupe key part "${part}" must not be empty or contain ":"`);
    }
  }

  return allParts.join(':');
}
