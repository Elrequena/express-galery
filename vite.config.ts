import { defineConfig } from 'vite'

// GitHub Pages sirve el sitio en /express-galery/, no en la raíz del dominio.
export default defineConfig({
  base: '/express-galery/',
})
