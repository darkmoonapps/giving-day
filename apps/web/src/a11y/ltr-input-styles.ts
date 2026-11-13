/** Force LTR inside phone/number inputs so digits stay readable in RTL UI. */
export const LTR_INPUT_STYLES = {
  input: {
    direction: 'ltr' as const,
    unicodeBidi: 'isolate' as const,
  },
};
