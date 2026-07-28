import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('oauth_login_attempts')
export class LoginAttemptOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'transaction_hash', type: 'char', length: 64 })
  transactionHash: string;

  @Column({ name: 'state_hash', type: 'char', length: 64 })
  stateHash: string;

  @Column({ name: 'code_verifier', type: 'varchar', length: 128 })
  codeVerifier: string;

  @Column({ type: 'varchar', length: 64 })
  nonce: string;

  @Column({ name: 'redirect_to', type: 'varchar', length: 255 })
  redirectTo: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt: Date | null;
}
