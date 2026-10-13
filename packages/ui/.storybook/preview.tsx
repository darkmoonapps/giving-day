import type { Preview } from '@storybook/react';
import '@mantine/core/styles.css';
import { AppThemeProvider } from '../src/theme';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Giving Day color scheme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Wisteria & mint' },
          { value: 'dark', title: 'Deep plum' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const colorScheme = context.globals.theme === 'dark' ? 'dark' : 'light';

      return (
        <AppThemeProvider forceColorScheme={colorScheme}>
          <div style={{ minHeight: '100%', padding: 8 }}>
            <Story />
          </div>
        </AppThemeProvider>
      );
    },
  ],
};

export default preview;
