// Utility for deterministic element id generation
export function generateElementId(parentId: string, type: string, index: number, className?: string): string {
  let id = `${parentId}-${type}-${index}`;
  if (className) {
    id += `-${className}`;
  }
  return id;
}
