# express-galery

Generador visual de composiciones dinámicas a partir de las imágenes y videos de una carpeta local. Funciona por completo en el navegador: sin backend, sin subir archivos, sin almacenar nada.

**Demo:** https://elrequena.github.io/express-galery/

## Características

- Selecciona una carpeta del equipo y mezcla sus imágenes (JPG, JPEG, PNG, WEBP, GIF) y videos (MP4, WEBM, MOV) en un escenario de PixiJS.
- Cada elemento tiene su propio tamaño, posición, dirección, velocidad, transiciones de opacidad y ciclo de vida.
- Los videos se reproducen como **fragmentos aleatorios** (5–12 s) desde puntos distintos del archivo, nunca completos.
- Controles discretos: añadir carpetas (una a una, con lista para quitarlas), iniciar / pausar / detener, y en los ajustes tiempo por imagen, cantidad simultánea (5–50) y color de fondo. `Space` inicia, pausa y reanuda. La barra se oculta y aparece con el mouse, o con `Space`, `Enter` o `Esc`; el switch «Fijar» la mantiene visible.

## Cómo se completa el escenario

1. Clips de video, hasta 5 a la vez (si hay videos).
2. Imágenes en los espacios restantes.
3. Frames fijos de los videos si faltan imágenes, y de forma ocasional (10 %) aunque sobren.

Los valores (duración de fragmentos, límite de videos, proporción de frames, etc.) están en `src/media/config.ts`.

## Privacidad y memoria

- Los archivos se leen solo en el navegador mediante `URL.createObjectURL`; nada se sube ni se guarda.
- Carga bajo demanda con precarga limitada, texturas liberadas al retirar cada elemento y URLs temporales revocadas cuando ya no se usan.

## Estructura

```
src/
  media/    ImageSource, VideoSource, MediaLibrary, config y tipos
  engine/   AnimationEngine (escenario PixiJS) e ImageEntity (elemento activo)
  ui/       AppUI (carpeta, tiempo, densidad, reproducción)
```

## Desarrollo

Requiere Node.js. Stack: Vite, TypeScript y PixiJS 7.

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # comprobación de tipos + build en dist/
npm run deploy   # publica dist/ en GitHub Pages (gh-pages)
```

La base de Vite está configurada como `/express-galery/` para GitHub Pages (`vite.config.ts`).

## Licencia

[MIT](LICENSE) © 2026 Jesus Requena
