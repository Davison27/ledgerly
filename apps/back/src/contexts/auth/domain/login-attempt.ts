import { hashesMatch } from './hash-equality';

interface LoginAttemptProps {
  id: string;
  transactionHash: string;
  stateHash: string;
  codeVerifier: string;
  nonce: string;
  redirectTo: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
}

export class LoginAttempt {
  private constructor(private readonly props: LoginAttemptProps) {}

  static create(props: {
    id: string;
    transactionHash: string;
    stateHash: string;
    codeVerifier: string;
    nonce: string;
    redirectTo: string;
    now: Date;
    ttlMinutes: number;
  }): LoginAttempt {
    return new LoginAttempt({
      id: props.id,
      transactionHash: props.transactionHash,
      stateHash: props.stateHash,
      codeVerifier: props.codeVerifier,
      nonce: props.nonce,
      redirectTo: props.redirectTo,
      createdAt: props.now,
      expiresAt: new Date(props.now.getTime() + props.ttlMinutes * 60_000),
      consumedAt: null,
    });
  }

  static fromPrimitives(props: LoginAttemptProps): LoginAttempt {
    return new LoginAttempt(props);
  }

  getId(): string {
    return this.props.id;
  }

  getCodeVerifier(): string {
    return this.props.codeVerifier;
  }

  getNonce(): string {
    return this.props.nonce;
  }

  getRedirectTo(): string {
    return this.props.redirectTo;
  }

  getConsumedAt(): Date | null {
    return this.props.consumedAt;
  }

  isExpired(now: Date): boolean {
    return now.getTime() >= this.props.expiresAt.getTime();
  }

  matchesState(hash: string): boolean {
    return hashesMatch(this.props.stateHash, hash);
  }

  toPrimitives(): LoginAttemptProps {
    return { ...this.props };
  }
}
