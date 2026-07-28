export interface AuthStatusDto {
  bootstrapNeeded: boolean;
  authenticated: boolean;
}

export interface BootstrapFirstAdminResultDto {
  email: string;
}

export interface StartGoogleLoginResultDto {
  authorizationUrl: string;
}
