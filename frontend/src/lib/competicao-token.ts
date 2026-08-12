const KEY = (salaId: number | string) => `competicao-token-${salaId}`

export function saveCompeticaoToken(salaId: number | string, token: string) {
  sessionStorage.setItem(KEY(salaId), token)
}

export function getCompeticaoToken(salaId: number | string): string | null {
  return sessionStorage.getItem(KEY(salaId))
}

export function clearCompeticaoToken(salaId: number | string) {
  sessionStorage.removeItem(KEY(salaId))
}
