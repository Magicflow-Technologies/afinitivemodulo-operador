import { Controller, Get, Post, Patch, Body, Query, Param } from '@nestjs/common';
import { AgentService } from './agent.service';
import {
  ConsultarDisponibilidadQueryDto,
  CrearReunionAgentDto,
  EnviarCorreoPlantillaAgentDto,
  ConsultarClientesNuevosQueryDto,
  ConsultarClientesRegistradosQueryDto,
  ActualizarEstadoClienteAgentDto,
  CrearCampanaAgentDto,
  ConsultarCampanasQueryDto,
  ReenviarCampanaDto,
  ProcesarRecordatoriosCampanaDto,
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

  // 5.1. MÉTRICAS Y RESUMEN GENERAL DE CLIENTES (PARA AGENTE IA)
  @Get('clientes/resumen')
  async consultarResumenClientes() {
    return await this.agentService.consultarResumenClientes();
  }

  // 5.2. LISTADO FLEXIBLE DE CLIENTES REGISTRADOS CON FILTROS Y PAGINACIÓN
  @Get('clientes/registrados')
  async consultarClientesRegistrados(@Query() query: ConsultarClientesRegistradosQueryDto) {
    return await this.agentService.consultarClientesRegistrados(query);
  }

  // 5.3. CONSULTAR CLIENTES NUEVOS (COMPATIBILIDAD ANTERIOR)
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

  // 8. GUARDAR Y/O LANZAR CAMPAÑA O EVENTO (AGENTE IA)
  @Post('campanas')
  async crearCampana(@Body() dto: CrearCampanaAgentDto) {
    return await this.agentService.crearCampana(dto);
  }

  // 8.1. PROCESAR RECORDATORIOS DE EVENTOS Y CAMPAÑAS
  @Post('campanas/procesar-recordatorios')
  async procesarRecordatorios(@Body() dto: ProcesarRecordatoriosCampanaDto) {
    return await this.agentService.procesarRecordatorios(dto);
  }

  // 9. CONSULTAR CAMPAÑAS Y MENSAJES ANTERIORES
  @Get('campanas')
  async consultarCampanas(@Query() query: ConsultarCampanasQueryDto) {
    return await this.agentService.consultarCampanas(query);
  }

  // 10. REENVIAR CAMPAÑA EXISTENTE
  @Post('campanas/:id/reenviar')
  async reenviarCampana(
    @Param('id') id: string,
    @Body() dto: ReenviarCampanaDto,
  ) {
    return await this.agentService.reenviarCampana(id, dto);
  }

  // 11. ESQUEMA DE TOOLS PARA AGENTES DE IA (OpenAI / Claude / n8n / LangChain)
  @Get('tools')
  obtenerToolsOpenAI() {
    return this.agentService.obtenerToolsOpenAI();
  }
}
