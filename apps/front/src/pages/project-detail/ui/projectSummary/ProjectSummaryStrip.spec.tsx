import { App } from 'antd';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Project } from '@/entities/project';
import { ProjectSummaryStrip } from './ProjectSummaryStrip';

const project: Project = {
  id: 'project-1',
  name: 'Project One',
  code: 'P-001',
  planningEnabled: true,
};

function renderSummary(
  showChecklistProgress: boolean,
  checklistCompletedCount?: number,
  checklistTotalCount?: number,
) {
  return render(
    <App>
      <ProjectSummaryStrip
        project={{ ...project, checklistCompletedCount, checklistTotalCount }}
        data={{ expenses: 0, margin: 0 } as never}
        isFinancialsPending={false}
        isFinancialsError={false}
        showFinancials={false}
        showChecklistProgress={showChecklistProgress}
      />
    </App>,
  );
}

describe('ProjectSummaryStrip checklist progress', () => {
  it('renders counts and a bounded percentage for enabled visible planning', () => {
    renderSummary(true, 1, 2);

    expect(screen.getByText('1 de 2 completados')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '1 de 2 completados' })).toHaveAttribute('aria-valuenow', '50');
  });

  it('renders 0/0 as zero percent and hides progress when it is not permitted', () => {
    const { rerender } = renderSummary(true, 0, 0);

    expect(screen.getByText('0 de 0 completados')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '0 de 0 completados' })).toHaveAttribute('aria-valuenow', '0');

    rerender(
      <App>
        <ProjectSummaryStrip
          project={project}
          data={{ expenses: 0, margin: 0 } as never}
          isFinancialsPending={false}
          isFinancialsError={false}
          showFinancials={false}
          showChecklistProgress={false}
        />
      </App>,
    );

    expect(screen.queryByText('0 de 0 completados')).not.toBeInTheDocument();
  });
});
