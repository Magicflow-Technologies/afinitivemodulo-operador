import { Controller, Get, Post, Patch, Body, Query, Param } from '@nestjs/common';
import { AgentService } from './agent.service';
import {
  ConsultarDisponibilidadQueryDto,
  CrearReunionAgentDto,
  EnviarCorreoPlantillaAgentDto,
  ConsultarClientesNuevosQueryDto,
  ActualizarEstadoClienteAgentDto,
} from './agent.dto';

@Controller('api/agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  // 1. CONSULTAR AGENDA DISPONIBLE
  @Get('agenda/disponibilidad')
  async consultarDisponibilidad(@Query() query: ConsultarDisponibilidadQueryDto) {
    return await this.agentService.consultarDisponibilidad(query);
  }

  // 2 & 3. CREAR REUNIÓN (CON O SIN GOOGLE MEET)
  @Post('agenda/crear-reunion')
  async crearReunion(@Body() dto: CrearReunionAgentDto) {
    return await this.agentService.crearReunion(dto);
  }

  // 4.1. LISTAR PLANTILLAS DE CORREO DISPONIBLES
  @Get('plantillas')
  async listarPlantillas() {
    return await this.agentService.listarPlantillas();
  }

  // 4.2. ENVIAR CORREO USANDO PLANTILLA
  @Post('correos/enviar-plantilla')
  async enviarCorreoPlantilla(@Body() dto: EnviarCorreoPlantillaAgentDto) {
    return await this.agentService.enviarCorreoPlantilla(dto);
  }

  // 5. CONSULTAR CLIENTES NUEVOS (BIO-LINK / LANDINGS)
  @Get('clientes/nuevos')
  async consultarClientesNuevos(@Query() query: ConsultarClientesNuevosQueryDto) {
    return await this.agentService.consultarClientesNuevos(query);
  }

  // 6. ACTUALIZAR ESTADO DE CLIENTE
  @Patch('clientes/:id/estado')
  async actualizarEstadoCliente(
    @Param('id') id: string,
    @Body() dto: ActualizarEstadoClienteAgentDto,
  ) {
    return await this.agentService.actualizarEstadoCliente(id, dto);
  }

  // 7. REGISTRAR CLIENTE POTENCIAL (WHATSAPP INBOUND / REDES SOCIALES)
  @Post('clientes/registrar')
  async registrarClientePotencial(@Body() dto: any) {
    return await this.agentService.registrarClientePotencial(dto);
  }

  // 7. ESQUEMA DE TOOLS PARA AGENTES DE IA (OpenAI / Claude / n8n / LangChain)
  @Get('tools')
  obtenerToolsOpenAI() {
    return this.agentService.obtenerToolsOpenAI();
  }
}
