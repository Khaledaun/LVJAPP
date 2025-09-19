export const toast = {
  success: (msg: string) => { if (typeof window !== 'undefined') alert(msg); console.log('SUCCESS:', msg) },
  error: (msg: string) => { if (typeof window !== 'undefined') alert(msg); console.error('ERROR:', msg) },
  info: (msg: string) => { if (typeof window !== 'undefined') alert(msg); console.info('INFO:', msg) },
}
