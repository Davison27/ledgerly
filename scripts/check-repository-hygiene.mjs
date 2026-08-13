import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const repositoryFiles = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  {
    encoding: 'utf8',
  },
)
  .split('\0')
  .filter(Boolean);

const temporaryPlanFiles = execFileSync(
  'git',
  [
    'ls-files',
    '--others',
    '--ignored',
    '--exclude-standard',
    '-z',
    '--',
    'docs/plans',
    '.claude/plans',
    '.codex/plans',
  ],
  {
    encoding: 'utf8',
  },
)
  .split('\0')
  .filter(Boolean);

const allowedSharedSkills = new Set([
  '.agents/skills/arquitectura-frontend',
  '.agents/skills/arquitectura-hexagonal',
  '.claude/skills/arquitectura-frontend/SKILL.md',
  '.claude/skills/arquitectura-hexagonal/SKILL.md',
]);

const forbiddenRepositoryFiles = repositoryFiles.filter((file) => {
  const basename = path.basename(file);
  const segments = file.split('/');
  const isEnvironmentFile = basename.startsWith('.env') && !basename.endsWith('.example');
  const isGeneratedDirectory = segments.some((segment) =>
    ['node_modules', 'dist', 'build', 'coverage', '.turbo', '.vite'].includes(segment),
  );
  const isTemporaryPlan =
    file.startsWith('docs/plans/') ||
    file.startsWith('.claude/plans/') ||
    file.startsWith('.codex/plans/');
  const isLocalSkill =
    (file.startsWith('.agents/skills/') || file.startsWith('.claude/skills/')) &&
    !allowedSharedSkills.has(file);

  return (
    isEnvironmentFile ||
    isGeneratedDirectory ||
    isTemporaryPlan ||
    isLocalSkill ||
    file.startsWith('deploy/backups/') ||
    file === 'deploy/.state' ||
    file === '.claude/settings.local.json' ||
    file === 'skills-lock.json' ||
    basename === '.DS_Store' ||
    basename.endsWith('.log') ||
    basename.endsWith('.pem') ||
    basename.endsWith('.key')
  );
});

const documentationFiles = [...repositoryFiles, ...temporaryPlanFiles].filter(
  (file) =>
    file.endsWith('.md') ||
    file.endsWith('.mdx') ||
    file.startsWith('.codex/agents/') ||
    file === '.codex/config.toml' ||
    file === 'Makefile' ||
    file.startsWith('deploy/scripts/') ||
    file.endsWith('.example'),
);

const spanishText =
  /[áéíóúüñ¿¡]|\b(?:fase|encargo|fichero|ficheros|código|debe|deben|nunca|siempre|después|pruebas|verificación|documentación|usuario|usuarios|empresa|factura|facturas|proveedor|proveedores|proyecto|proyectos|trabajador|trabajadores|despliegue|autenticación|tarea|tareas|cambio|cambios|instalador|instalación|producción|desarrollo|contexto|recurso|contraseña|correo|dominio|configuración|copia|restaurar|cancelado|longitud|guardar|guardado|eliminar|borrar|salir|continuar|volver|arrancar|levantando|aplicando|comprobaciones|claves|fuera de alcance|ver también|por qué|qué problema)\b/iu;

const languageViolations = documentationFiles.flatMap((file) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, index) => (spanishText.test(line) ? [`${file}:${index + 1}`] : [])),
);

const oversizedFiles = repositoryFiles.filter((file) => statSync(file).size > 10 * 1024 * 1024);

const violations = [
  ...forbiddenRepositoryFiles.map((file) => `forbidden repository file: ${file}`),
  ...languageViolations.map((file) => `non-English documentation: ${file}`),
  ...oversizedFiles.map((file) => `repository file exceeds 10 MB: ${file}`),
];

if (violations.length > 0) {
  process.stderr.write(`${violations.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Repository hygiene check passed.\n');
}
