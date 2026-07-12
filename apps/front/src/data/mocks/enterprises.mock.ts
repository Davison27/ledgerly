
export interface Project {
  id: string;
  name: string;
  code: string;
}

export interface Enterprise {
  id: string;
  name: string;
  sector: string;
  color: string;
  initials: string;
  projects: Project[];
}

export const mockEnterprises: Enterprise[] = [
  {
    id: 'e1',
    name: 'Grupo Alimenta SL',
    sector: 'Alimentación y distribución',
    color: '#1c5d97',
    initials: 'GA',
    projects: [
      { id: 'p1', name: 'Planta Zaragoza', code: 'GA-ZGZ-24' },
      { id: 'p2', name: 'Central Logística', code: 'GA-LOG-23' },
      { id: 'p3', name: 'Expansión Sur', code: 'GA-SUR-25' },
    ],
  },
  {
    id: 'e2',
    name: 'Textil Norte SA',
    sector: 'Manufactura textil',
    color: '#5a7286',
    initials: 'TN',
    projects: [
      { id: 'p4', name: 'Fábrica Bilbao', code: 'TN-BIO-22' },
      { id: 'p5', name: 'Tienda Online', code: 'TN-ECM-24' },
    ],
  },
  {
    id: 'e3',
    name: 'Constructora Delta',
    sector: 'Construcción e ingeniería',
    color: '#8a949c',
    initials: 'CD',
    projects: [
      { id: 'p6', name: 'Residencial Aurora', code: 'CD-AUR-25' },
      { id: 'p7', name: 'Nave Industrial B7', code: 'CD-NB7-24' },
      { id: 'p8', name: 'Reforma Oficinas', code: 'CD-OFC-23' },
    ],
  },
];
