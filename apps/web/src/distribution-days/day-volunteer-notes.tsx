import { AppText } from '@giving-day/ui';
import { useTranslation } from 'react-i18next';

export function DayVolunteerNotes({
  notes,
}: {
  notes: string | null;
}): JSX.Element | null {
  const { t } = useTranslation('volunteer');

  if (notes === null || notes.length === 0) {
    return null;
  }

  return (
    <div data-testid="day-volunteer-notes">
      <AppText fw={600}>{t('notes_label')}</AppText>
      <AppText mt="xs">{notes}</AppText>
    </div>
  );
}
