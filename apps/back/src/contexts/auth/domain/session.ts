import { hashesMatch } from './hash-equality';
import {
  SESSION_ABSOLUTE_TTL_MINUTES,
  SESSION_IDLE_TTL_MINUTES,
  SESSION_TOUCH_INTERVAL_MINUTES,
} from './session-policy';

const MINUTE_IN_MS = 60_000;

interface SessionProps {
  id: string;
  memberId: string;
  tokenHash: string;
  csrfHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export class Session {
  private constructor(private readonly props: SessionProps) {}

  static create(props: {
    id: string;
    memberId: string;
    tokenHash: string;
    csrfHash: string;
    now: Date;
  }): Session {
    return new Session({
      id: props.id,
      memberId: props.memberId,
      tokenHash: props.tokenHash,
      csrfHash: props.csrfHash,
      createdAt: props.now,
      lastSeenAt: props.now,
      expiresAt: new Date(props.now.getTime() + SESSION_ABSOLUTE_TTL_MINUTES * MINUTE_IN_MS),
      revokedAt: null,
    });
  }

  static fromPrimitives(props: SessionProps): Session {
    return new Session(props);
  }

  getId(): string {
    return this.props.id;
  }

  getMemberId(): string {
    return this.props.memberId;
  }

  getTokenHash(): string {
    return this.props.tokenHash;
  }

  getCsrfHash(): string {
    return this.props.csrfHash;
  }

  getLastSeenAt(): Date {
    return this.props.lastSeenAt;
  }

  getExpiresAt(): Date {
    return this.props.expiresAt;
  }

  getRevokedAt(): Date | null {
    return this.props.revokedAt;
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  isExpired(now: Date): boolean {
    return now.getTime() >= this.props.expiresAt.getTime();
  }

  isIdle(now: Date): boolean {
    return now.getTime() >= this.props.lastSeenAt.getTime() + SESSION_IDLE_TTL_MINUTES * MINUTE_IN_MS;
  }

  needsTouch(now: Date): boolean {
    return now.getTime() >= this.props.lastSeenAt.getTime() + SESSION_TOUCH_INTERVAL_MINUTES * MINUTE_IN_MS;
  }

  matchesCsrfHash(hash: string): boolean {
    return hashesMatch(this.props.csrfHash, hash);
  }

  revoke(now: Date): void {
    this.props.revokedAt = now;
  }

  touch(now: Date): void {
    this.props.lastSeenAt = now;
  }

  toPrimitives(): SessionProps {
    return { ...this.props };
  }
}
