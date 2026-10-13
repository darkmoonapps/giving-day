import '@mantine/core';

declare module '@mantine/core' {
  interface MantineThemeOther {
    brand: {
      wisteria: string;
      mint: string;
      plum: string;
    };
    semantic: {
      success: 'mint';
      delivered: 'mint';
    };
  }
}
