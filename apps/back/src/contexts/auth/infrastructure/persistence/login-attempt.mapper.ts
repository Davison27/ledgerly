import { LoginAttempt } from '../../domain/login-attempt';
import { LoginAttemptOrmEntity } from './login-attempt.orm-entity';

export class LoginAttemptMapper {
  static toDomain(orm: LoginAttemptOrmEntity): LoginAttempt {
    return LoginAttempt.fromPrimitives({
      id: orm.id,
      transactionHash: orm.transactionHash,
      stateHash: orm.stateHash,
      codeVerifier: orm.codeVerifier,
      nonce: orm.nonce,
      redirectTo: orm.redirectTo,
      createdAt: orm.createdAt,
      expiresAt: orm.expiresAt,
      consumedAt: orm.consumedAt,
    });
  }

  static toOrm(attempt: LoginAttempt): LoginAttemptOrmEntity {
    const orm = new LoginAttemptOrmEntity();
    const primitives = attempt.toPrimitives();

    orm.id = primitives.id;
    orm.transactionHash = primitives.transactionHash;
    orm.stateHash = primitives.stateHash;
    orm.codeVerifier = primitives.codeVerifier;
    orm.nonce = primitives.nonce;
    orm.redirectTo = primitives.redirectTo;
    orm.createdAt = primitives.createdAt;
    orm.expiresAt = primitives.expiresAt;
    orm.consumedAt = primitives.consumedAt;

    return orm;
  }
}
