import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { ImageStoredFileStore, isCanonicalImageDataUrl } from '../crypto/image-data-url';

@ValidatorConstraint({ name: 'canonicalImageDataUrl', async: false })
export class CanonicalImageDataUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, arguments_: ValidationArguments): boolean {
    return isCanonicalImageDataUrl(value, arguments_.constraints[0] as ImageStoredFileStore);
  }

  defaultMessage(): string {
    return 'image must be a canonical PNG, JPEG, or WEBP data URL within the permitted size';
  }
}

export function IsCanonicalImageDataUrl(store: ImageStoredFileStore, validationOptions?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      constraints: [store],
      validator: CanonicalImageDataUrlConstraint,
    });
  };
}
