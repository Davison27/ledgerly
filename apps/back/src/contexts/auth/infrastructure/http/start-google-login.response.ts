export class StartGoogleLoginResponse {
  authorizationUrl: string;

  private constructor(authorizationUrl: string) {
    this.authorizationUrl = authorizationUrl;
  }

  static fromUrl(authorizationUrl: string): StartGoogleLoginResponse {
    return new StartGoogleLoginResponse(authorizationUrl);
  }
}
