import { useNavigate, useParams } from '@tanstack/react-router';
import { Badge, Button, Flex, Layout, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { getEnterprise } from '../../data/enterprises';
import logoIconUrl from '../../assets/ledgerly-icon.svg';

const { useToken } = theme;

/**
 * Barra de navegación superior de la aplicación (estilo antd por defecto).
 * Siempre visible dentro del layout `_app`. La empresa activa se deriva del
 * parámetro de ruta `enterpriseId` (presente en las rutas de proyectos).
 * Las pestañas de proyectos abiertos se añadirán con la pantalla de workspace.
 */
export function TopBar() {
  const { token } = useToken();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const params = useParams({ strict: false }) as { enterpriseId?: string };
  const enterprise = params.enterpriseId
    ? getEnterprise(params.enterpriseId)
    : undefined;

  return (
    <Layout.Header
      style={{
        height: 52,
        lineHeight: 'normal',
        padding: '0 16px',
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex align="center" gap={4} style={{ height: '100%' }}>
        <Button
          type="text"
          aria-label={t('common.appName')}
          style={{ height: 40, padding: '0 8px' }}
          onClick={() => void navigate({ to: '/enterprises' })}
        >
          <img
            src={logoIconUrl}
            alt={t('common.appName')}
            style={{ height: 28, display: 'block' }}
          />
        </Button>

        {enterprise && (
          <Button
            type="text"
            onClick={() => void navigate({ to: '/enterprises' })}
          >
            <Badge color={enterprise.color} text={enterprise.name} />
          </Button>
        )}

        <div style={{ flex: 1 }} />

        <Button
          type="text"
          aria-label={t('topbar.newTab')}
          onClick={() => void navigate({ to: '/enterprises' })}
        >
          +
        </Button>
        <Button type="text" onClick={() => void navigate({ to: '/' })}>
          {t('common.signOut')}
        </Button>
      </Flex>
    </Layout.Header>
  );
}
