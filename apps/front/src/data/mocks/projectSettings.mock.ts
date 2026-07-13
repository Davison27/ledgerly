// Datos mock de configuración de proyecto (equipo e integraciones).
// Solo se cargan en modo local (ver src/data/projectSettings.ts y src/config.ts).
// Derivados del prototipo de diseño de Ledgerly ERP.

export interface TeamMember {
  id: string;
  name: string;
  /** Clave i18n del rol: project.settings.roles.<roleKey> */
  roleKey: 'accountant' | 'projectManager' | 'auditor' | 'admin';
  color: string;
  initials: string;
}

export interface Integration {
  key: string;
  name: string;
  connected: boolean;
}

export const mockTeam: TeamMember[] = [
  { id: 't1', name: 'Ana Torres', roleKey: 'accountant', color: '#00609c', initials: 'AT' },
  { id: 't2', name: 'Marc Puig', roleKey: 'projectManager', color: '#5a7286', initials: 'MP' },
  { id: 't3', name: 'Laura Serra', roleKey: 'auditor', color: '#8a949c', initials: 'LS' },
  { id: 't4', name: 'Jordi Vila', roleKey: 'admin', color: '#3a6d99', initials: 'JV' },
];

export const mockIntegrations: Integration[] = [
  { key: 'facturae', name: 'Facturae', connected: true },
  { key: 'banco', name: 'Banco Sabadell (PSD2)', connected: true },
  { key: 'aeat', name: 'Agencia Tributaria (AEAT)', connected: false },
  { key: 'smtp', name: 'Correo (SMTP)', connected: true },
];
