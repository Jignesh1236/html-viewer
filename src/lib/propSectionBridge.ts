let _opener: ((title: string) => void) | null = null;

export function setGlSectionOpener(fn: ((title: string) => void) | null): void {
  _opener = fn;
}

export function openSectionInGL(title: string): void {
  if (_opener) {
    _opener(title);
  }
}
