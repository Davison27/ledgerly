import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { DeletionOutcomeResponse } from '../../../../shared/infrastructure/http/deletion-outcome.response';
import { UnarchiveOutcomeResponse } from '../../../../shared/infrastructure/http/unarchive-outcome.response';
import { CreateClientUseCase } from '../../application/create-client/create-client.use-case';
import { DeleteClientUseCase } from '../../application/delete-client/delete-client.use-case';
import { GetClientUseCase } from '../../application/get-client/get-client.use-case';
import { ListClientsUseCase } from '../../application/list-clients/list-clients.use-case';
import { UnarchiveClientUseCase } from '../../application/unarchive-client/unarchive-client.use-case';
import { UpdateClientUseCase } from '../../application/update-client/update-client.use-case';
import { ClientResponse } from './client.response';
import { ClientSummaryResponse } from './client-summary.response';
import { CreateClientDto } from './dtos/create-client.dto';
import { UpdateClientDto } from './dtos/update-client.dto';

@RequiresAccess('projects', 'view')
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly listClientsUseCase: ListClientsUseCase,
    private readonly getClientUseCase: GetClientUseCase,
    private readonly createClientUseCase: CreateClientUseCase,
    private readonly updateClientUseCase: UpdateClientUseCase,
    private readonly deleteClientUseCase: DeleteClientUseCase,
    private readonly unarchiveClientUseCase: UnarchiveClientUseCase,
  ) {}

  @Get()
  async list(): Promise<ClientSummaryResponse[]> {
    return (await this.listClientsUseCase.execute()).map((client) => ClientSummaryResponse.fromSummary(client));
  }

  @RequiresAccess('projects', 'edit')
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateClientDto): Promise<ClientResponse> {
    const client = await this.createClientUseCase.execute(dto);
    return ClientResponse.fromDomain(client);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<ClientResponse> {
    return ClientResponse.fromDomain(await this.getClientUseCase.execute(id));
  }

  @RequiresAccess('projects', 'edit')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateClientDto): Promise<ClientResponse> {
    return ClientResponse.fromDomain(await this.updateClientUseCase.execute({ id, ...dto }));
  }

  @RequiresAccess('projects', 'edit')
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<DeletionOutcomeResponse> {
    return new DeletionOutcomeResponse(await this.deleteClientUseCase.execute(id));
  }

  @RequiresAccess('projects', 'edit')
  @Post(':id/unarchive')
  async unarchive(@Param('id') id: string): Promise<UnarchiveOutcomeResponse> {
    await this.unarchiveClientUseCase.execute(id);
    return new UnarchiveOutcomeResponse();
  }
}
