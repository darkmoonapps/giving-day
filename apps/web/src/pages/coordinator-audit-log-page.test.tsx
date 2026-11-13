import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import { CITY_A_ID, volunteerUser } from '../test/distribution-day-fixtures';
import {
  AUDIT_ENTRY_NEWER_ID,
  AUDIT_ENTRY_OLDER_ID,
  createAuditLogFetchMock,
  holonAuditLogsPage1,
} from '../test/audit-log-fixtures';
import { renderApp } from '../test/render';

function actionTexts(): string[] {
  return screen
    .getAllByTestId(/^audit-log-action-/)
    .map((node) => node.textContent ?? '');
}

describe('CoordinatorAuditLogPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('shows Holon audit entries newest first', async () => {
    vi.stubGlobal('fetch', vi.fn(createAuditLogFetchMock()));

    renderApp(`/cities/${CITY_A_ID}/audit-log`);

    expect(
      await screen.findByTestId('coordinator-audit-log-page')
    ).toBeInTheDocument();
    expect(await screen.findByTestId('audit-log-table')).toBeInTheDocument();
    expect(
      screen.getByTestId(`audit-log-row-${AUDIT_ENTRY_NEWER_ID}`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`audit-log-action-${AUDIT_ENTRY_NEWER_ID}`)
    ).toHaveTextContent('אישור בקשת הצטרפות');
    expect(
      screen.getByTestId(`audit-log-entity-${AUDIT_ENTRY_NEWER_ID}`)
    ).toHaveTextContent('חברות');
    expect(screen.getByTestId('audit-log-page-label')).toBeInTheDocument();
    expect(screen.getByTestId('audit-log-filter-count')).toBeInTheDocument();
  });

  it('sorts and filters the audit log list on the client', async () => {
    vi.stubGlobal('fetch', vi.fn(createAuditLogFetchMock()));
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/audit-log`);

    expect(await screen.findByTestId('audit-log-table')).toBeInTheDocument();
    expect(screen.getByTestId('audit-log-filter-count')).toHaveTextContent(
      'מוצגים 2 מתוך 2'
    );

    await user.click(screen.getByTestId('sort-action'));
    expect(actionTexts()).toEqual(['אישור בקשת הצטרפות', 'שיבוץ משלוח']);

    await user.click(screen.getByTestId('sort-action'));
    expect(actionTexts()).toEqual(['שיבוץ משלוח', 'אישור בקשת הצטרפות']);

    await user.selectOptions(
      screen.getByTestId('filter-audit-action'),
      'delivery.assign'
    );
    expect(actionTexts()).toEqual(['שיבוץ משלוח']);
    expect(
      screen.getByTestId(`audit-log-row-${AUDIT_ENTRY_OLDER_ID}`)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(`audit-log-row-${AUDIT_ENTRY_NEWER_ID}`)
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('audit-log-filter-count')).toHaveTextContent(
      'מוצגים 1 מתוך 2'
    );

    await user.click(screen.getByTestId('clear-audit-log-filters'));
    await user.selectOptions(
      screen.getByTestId('filter-audit-entity'),
      'membership'
    );
    expect(
      screen.getByTestId(`audit-log-entity-${AUDIT_ENTRY_NEWER_ID}`)
    ).toHaveTextContent('חברות');
    expect(actionTexts()).toEqual(['אישור בקשת הצטרפות']);

    await user.click(screen.getByTestId('clear-audit-log-filters'));
    await user.type(screen.getByTestId('filter-audit-entity-id'), '1616');
    expect(actionTexts()).toEqual(['שיבוץ משלוח']);

    await user.click(screen.getByTestId('clear-audit-log-filters'));
    await user.type(
      screen.getByTestId('filter-audit-entity-id'),
      '00000000-0000-4000-8000-000000000000'
    );
    expect(screen.getByTestId('audit-log-filter-empty')).toBeInTheDocument();
  });

  it('shows an empty state when there are no entries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createAuditLogFetchMock({
          auditLogs: {
            entries: [],
            page: 1,
            pageSize: 20,
            total: 0,
          },
        })
      )
    );

    renderApp(`/cities/${CITY_A_ID}/audit-log`);

    expect(await screen.findByTestId('audit-log-empty')).toBeInTheDocument();
  });

  it('blocks volunteers from the audit log', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createAuditLogFetchMock({
          user: volunteerUser(),
          auditLogs: holonAuditLogsPage1,
        })
      )
    );

    renderApp(`/cities/${CITY_A_ID}/audit-log`);

    expect(
      await screen.findByTestId('audit-log-no-access')
    ).toBeInTheDocument();
  });
});
