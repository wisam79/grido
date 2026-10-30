let documentSession = 0;

export function getDocumentSession(): number {
  return documentSession;
}

export function advanceDocumentSession(): void {
  documentSession += 1;
}
