export default [
  (await import('./list.mjs')).default,
  (await import('./promote.mjs')).default,
  (await import('./skip.mjs')).default,
  (await import('./when.mjs')).default,
  (await import('./wrongsong.mjs')).default
]