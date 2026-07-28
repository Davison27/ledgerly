export interface CompleteGoogleLoginCommand {
  transactionToken: string;
  code: string;
  state: string;
  existingSessionToken: string | null;
}
