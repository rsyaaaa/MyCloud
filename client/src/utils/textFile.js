// Helpers for opening plain-text documents in the built-in web editor.

export function fileNameOf(file) {
  return file?.original_name || file?.display_name || '';
}

export function isTxtFile(file) {
  return /\.txt$/i.test(fileNameOf(file));
}
