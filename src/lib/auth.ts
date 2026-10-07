export const isAuthed = () => !!localStorage.getItem('token')

export function logout() {
  localStorage.removeItem('token')
  window.location.assign('/')
}
