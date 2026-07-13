import { Avatar, Card, List } from 'antd';
import { useTranslation } from 'react-i18next';
import { getProjectTeam } from '../../../../data/projectSettings';

export function TeamCard() {
  const { t } = useTranslation();
  const team = getProjectTeam();

  return (
    <Card title={t('projects.settings.team')} variant="outlined">
      <List
        dataSource={team}
        renderItem={(member) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <Avatar style={{ backgroundColor: member.color }}>
                  {member.initials}
                </Avatar>
              }
              title={member.name}
              description={t(`projects.settings.roles.${member.roleKey}`)}
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
