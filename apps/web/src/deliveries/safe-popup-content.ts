export function createTextPopupContent(text: string): HTMLElement {
  const content = document.createElement('div');
  content.textContent = text;
  return content;
}
