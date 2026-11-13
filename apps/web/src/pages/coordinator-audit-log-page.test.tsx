import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import { CITY_A_ID, volunteerUser } from '../test/distribution-day-fixtures';
import {
  AUDIT_ENTRY_NEWER_ID,
  createAuditLogFetchMock,
  holonAuditLogsPage1,
} from '../test/audit-log-fixtures';
import { renderApp } from '../test/render';

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
