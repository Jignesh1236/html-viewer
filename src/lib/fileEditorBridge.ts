type FileEditorOpener = (fileId: string, fileName: string) => void;

let _opener: FileEditorOpener | null = null;

export function setFileEditorOpener(fn: FileEditorOpener | null): void {
  _opener = fn;
}

export function openFileInGLPanel(fileId: string, fileName: string): void {
  if (_opener) {
    _opener(fileId, fileName);
  }
}
