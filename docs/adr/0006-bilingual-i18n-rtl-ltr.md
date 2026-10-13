# ADR 0006: Bilingual i18n (Hebrew RTL + English LTR)

**Status**: Accepted

**Date**: 2026-10-13

## Context

The application needs to support:

- **Hebrew (עברית)** as the default language (RTL - right-to-left)
- **English** as a secondary language (LTR - left-to-right)

Requirements:

- All UI text must be translatable
- No hardcoded strings in components
- Proper layout mirroring for RTL/LTR
- Language switcher for users

## Decision

Implement **bilingual internationalization** using **react-i18next** with:

- Hebrew as the default language and RTL as default direction
- English as a secondary language with LTR support
- All UI strings externalized to translation files
- Language preference stored in localStorage
- Mantine's built-in RTL support for layout mirroring

**No hardcoded UI strings are allowed in the codebase.**

## Consequences

### Positive

- **True bilingual support** - Users can choose their preferred language
- **RTL/LTR correctness** - Proper layout mirroring automatically
- **Maintainability** - All strings in one place, easy to update
- **Future extensibility** - Can add more languages easily
- **Accessibility** - Proper `dir` and `lang` attributes for screen readers
- **react-i18next** - Battle-tested library with React hooks (`useTranslation`)

### Negative

- **Development overhead** - Every string must go through translation system
- **Translation maintenance** - Need to keep Hebrew and English in sync
- **Testing complexity** - Must test both RTL and LTR layouts
- **Bundle size** - Includes translation files (mitigated by lazy loading)

### Required Practices

1. **Never hardcode strings**: Use `t('key')` for all user-facing text
2. **Namespace translations**: Organize by feature (e.g., `common`, `volunteer`, `admin`)
3. **Test both directions**: All layouts must work in RTL and LTR
4. **Icon directionality**: Some icons need mirroring (arrows, navigation)
5. **Pluralization**: Handle Hebrew plural rules correctly

## Implementation Details

### Translation Files Structure

```
public/locales/
├── he/
│   ├── common.json
│   ├── volunteer.json
│   └── admin.json
└── en/
    ├── common.json
    ├── volunteer.json
    └── admin.json
```

### Usage Pattern

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('volunteer');
  return <Button>{t('confirm_participation')}</Button>;
}
```

### Mantine Direction

```typescript
<MantineProvider
  theme={{ dir: i18n.dir() }}
  defaultColorScheme="light"
>
  {children}
</MantineProvider>
```

### HTML Direction

```html
<html dir="{i18n.dir()}" lang="{i18n.language}"></html>
```

## Alternatives Considered

### react-intl (FormatJS)

**Rejected**: More verbose API than react-i18next. Requires `FormattedMessage` components instead of hooks, less ergonomic for our use case.

### i18next Without React Wrapper

**Rejected**: react-i18next provides React-specific hooks and context, better DX than using i18next directly.

### Manual Translation Object

**Rejected**: No ecosystem, no tooling, would need to build everything ourselves. i18next provides pluralization, interpolation, and namespace management out-of-box.

### Hardcoded Hebrew Only

**Rejected**: Excludes English speakers, reduces accessibility, limits future growth.

### Tailwind RTL Plugin + Manual Strings

**Rejected**: react-i18next + Mantine RTL provides more comprehensive solution than just CSS direction without translation management.

## Translation Guidelines

### Key Naming Convention

Use snake_case for translation keys:

```json
{
  "confirm_participation": "אשר השתתפות",
  "distribution_day": "יום החלוקה",
  "volunteer_list": "רשימת מתנדבים"
}
```

### Interpolation

```json
{
  "greeting": "שלום, {{name}}!"
}
```

```typescript
t('greeting', { name: volunteerName });
```

### Pluralization

```json
{
  "volunteer_count": "מתנדב אחד",
  "volunteer_count_plural": "{{count}} מתנדבים"
}
```

### Namespaces

- `common`: Shared UI (buttons, navigation, errors)
- `volunteer`: Volunteer-specific features
- `admin`: Admin dashboard
- `auth`: Login and authentication
- `validation`: Form validation messages

## RTL Testing Requirements

Must verify in RTL mode:

- Text alignment (right-aligned)
- Icons and buttons (mirrored where appropriate)
- Modals and dialogs (close button on correct side)
- Forms (labels and inputs aligned correctly)
- Navigation (hamburger menu, back buttons)
- Tables (columns flow right-to-left)

## Notes

- Use `i18next-browser-languagedetector` to detect user language preference
- Store language choice in localStorage: `i18nextLng`
- Lazy-load translation files to reduce initial bundle size
- Use translation keys as fallback if translation missing (in development)
- Consider using i18next-parser to extract translation keys from code
