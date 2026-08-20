import { validate } from 'class-validator';
import { UpdateCompanyDto } from '../../../contexts/company/infrastructure/http/dtos/update-company.dto';
import { UpdateProductDto } from '../../../contexts/products/infrastructure/http/dtos/update-product.dto';
import { UpdateProjectDto } from '../../../contexts/projects/infrastructure/http/dtos/update-project.dto';

const png = `data:image/png;base64,${Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64')}`;

describe('canonical image data URL DTO validation', () => {
  it.each([
    [UpdateCompanyDto, 'logo'],
    [UpdateProjectDto, 'image'],
    [UpdateProductDto, 'image'],
  ] as const)('accepts canonical PNG data URLs for %p.%s', async (Dto, property) => {
    const dto = Object.assign(new Dto(), { [property]: png });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([
    [UpdateCompanyDto, 'logo'],
    [UpdateProjectDto, 'image'],
    [UpdateProductDto, 'image'],
  ] as const)('rejects malformed image payloads for %p.%s', async (Dto, property) => {
    const dto = Object.assign(new Dto(), { [property]: 'data:image/png;base64,AA==' });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
