import { describe, expect, it } from 'vitest';
import { createTextPopupContent } from './safe-popup-content';

describe('createTextPopupContent', () => {
  it('renders a crafted elder name as text instead of markup', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const node = createTextPopupContent(payload);

    expect(node.textContent).toBe(payload);
    expect(node.querySelector('img')).toBeNull();
    expect(node.innerHTML).not.toContain('<img');
    expect(node.childNodes).toHaveLength(1);
    expect(node.childNodes[0]?.nodeType).toBe(Node.TEXT_NODE);
  });
});
