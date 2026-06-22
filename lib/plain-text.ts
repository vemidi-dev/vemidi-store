export const plainTextClassName = "whitespace-pre-line break-words";

export function withPlainTextClass(className?: string) {
  return className ? `${plainTextClassName} ${className}` : plainTextClassName;
}
