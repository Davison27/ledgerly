import { AuthStatusResult } from '../../application/get-auth-status/auth-status.result';

export class AuthStatusResponse {
  bootstrapNeeded: boolean;
  authenticated: boolean;

  private constructor(props: { bootstrapNeeded: boolean; authenticated: boolean }) {
    this.bootstrapNeeded = props.bootstrapNeeded;
    this.authenticated = props.authenticated;
  }

  static fromResult(result: AuthStatusResult): AuthStatusResponse {
    return new AuthStatusResponse(result);
  }
}
