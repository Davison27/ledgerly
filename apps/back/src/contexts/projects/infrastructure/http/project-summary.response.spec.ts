import { ProjectSummary } from '../../domain/project-summary';
import { ProjectSummaryResponse } from './project-summary.response';

const summary: ProjectSummary = {
  id: 'project-1',
  name: 'Project',
  code: 'PRJ-001',
  currency: 'EUR',
  financials: [],
  documentCount: 3,
  pendingCount: 1,
  image: null,
  color: null,
  planningEnabled: true,
  checklistCompletedCount: 2,
  checklistTotalCount: 5,
};

describe('ProjectSummaryResponse', () => {
  it('returns planning progress only when requested for an enabled project', () => {
    expect(ProjectSummaryResponse.fromSummary(summary, true, false, true)).toMatchObject({
      checklistCompletedCount: 2,
      checklistTotalCount: 5,
      documentCount: 3,
    });
    expect(JSON.stringify(ProjectSummaryResponse.fromSummary(summary, true, false, false))).not.toContain(
      'checklistCompletedCount',
    );
    expect(ProjectSummaryResponse.fromSummary({ ...summary, planningEnabled: false }, true, false, true))
      .toMatchObject({ documentCount: 3 });
    expect(JSON.stringify(ProjectSummaryResponse.fromSummary(
      { ...summary, planningEnabled: false }, true, false, true,
    ))).not.toContain('checklistTotalCount');
  });
});
