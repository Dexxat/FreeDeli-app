# FreeDeli · Identidad visual

FreeDeli conecta kioscos 24 hs del barrio con usuarios y riders de envíos. Hay **tres apps** y un **panel de administración**, con un logo cada una y la misma estética 8 bit (inspirada en los juegos clásicos de Nintendo y Pokémon):

| App | Para quién | Símbolo | Texto | Archivos |
|---|---|---|---|---|
| **FreeDeli** | Usuarios (los que piden) | Scooter tipo Honda Wave con alas | `FreeDeli` | `usuarios-*`, `freedeli-moto.svg` |
| **FreeDeli Kioscos** | Kioscos | Nube clásica 8 bit con una ventanita de kiosco iluminada | `FreeDeli` + `KIOSCOS` | `kioscos-*`, `freedeli-nube-kiosco.svg` |
| **FreeDeli Riders** | Repartidores | Casco de moto clásico (integral, con visera y franja de carrera) | `FreeDeli` + `RIDERS` | `riders-*`, `freedeli-casco.svg` |
| **FreeDeli Dev** | Administrador (dueño de la plataforma) | Pirámide con un ojo en la punta, sobresaliendo entre dos nubes | `FreeDeli` + `DEV` | `dev-*`, `freedeli-piramide.svg` |

El color de marca es el **azul marino**, elegido para diferenciarse del rojo de la competencia. El único color cálido es el amarillo de las luces (faro y ventana).

Canvas de diseño original (editable): https://claude.ai/code/artifact/277bd38e-4a81-4e57-b363-844c5ddbe7b9

### FreeDeli Dev · panel de administración

Es el panel del dueño, el mediador entre kioscos y riders. Secciones principales:

- **Kioscos:** los activos, sus movimientos y el saldo que les queda para seguir operando.
- **Riders:** los activos, sus movimientos y el seguimiento de cada envío.
- **Conflictos e incidencias:** problemas abiertos entre kioscos, riders y usuarios, y cómo se resuelven.

## Contenido

```
design/
├── README.md               ← este archivo
├── _brand-tokens.scss      ← colores, tipografía y utilidades (SCSS + CSS vars)
├── fonts/
│   ├── press-start-2p.woff2
│   └── OFL-LICENSE.txt     ← licencia libre (SIL OFL)
├── logos/
│   ├── svg/                ← símbolos solos, vectoriales (escalan sin perder calidad)
│   │   ├── freedeli-moto.svg
│   │   ├── freedeli-nube-kiosco.svg
│   │   ├── freedeli-casco.svg
│   │   └── freedeli-piramide.svg
│   └── png/                ← logos completos (símbolo + nombre), 2400×1600
│       ├── usuarios-logo-claro.png / -oscuro.png (+ -transparente)
│       ├── kioscos-logo-claro.png / -oscuro.png (+ -transparente)
│       ├── riders-logo-claro.png / -oscuro.png (+ -transparente)
│       └── dev-logo-claro.png / -oscuro.png (+ -transparente)
└── icons/
    ├── usuarios/ icon-1024, icon-512, icon-192, icon-48, favicon.ico
    ├── kioscos/  icon-1024, icon-512, icon-192, icon-48, favicon.ico
    ├── riders/   icon-1024, icon-512, icon-192, icon-48, favicon.ico
    └── dev/      icon-1024, icon-512, icon-192, icon-48, favicon.ico
```

## Paleta

| Token | Hex | Uso |
|---|---|---|
| navy-900 | `#0A1633` | Contorno de sprites |
| navy-800 | `#0B1736` | Fondo oscuro |
| **navy-700** | **`#16306F`** | **Azul marino de marca** |
| blue-500 | `#2E5BBF` | "Deli", acentos, botones |
| blue-300 | `#8FB4FF` | Acentos sobre fondo oscuro |
| blue-100 | `#BFD3FF` | Sombra pixel del texto |
| blue-50 | `#EEF2FA` | Fondo claro |
| yellow-400 | `#FFD23F` | Luz de kiosco / faro (usar con moderación) |
| amber-400 | `#FFB020` | Detalles |

## Tipografía

- **Press Start 2P** para el logo, títulos y botones cortos.
- Una sans del sistema para textos largos, porque la pixel cansa en párrafos.

## Reglas de uso

- Mostrar los sprites siempre con `image-rendering: pixelated` (clase `.fd-pixel`) para que no se vean borrosos.
- Escalar los PNG en múltiplos enteros (×2, ×3…).
- Sobre fondo oscuro usar las versiones `-oscuro`, que tienen texto blanco y el scooter con borde blanco.
- No usar rojo como color de marca.

## Para Angular (cuando arranques en VS Code)

Una forma sugerida de repartir los archivos en un workspace con las tres apps:

```
projects/
├── usuarios-app/ src/assets/brand/  ← logos usuarios-*, icons/usuarios/*
├── kioscos-app/  src/assets/brand/  ← logos kioscos-*, icons/kioscos/*
├── riders-app/   src/assets/brand/  ← logos riders-*, icons/riders/*
├── dev-admin/    src/assets/brand/  ← logos dev-*, icons/dev/*
└── shared/       styles/_brand-tokens.scss, assets/fonts/
```

- `favicon.ico` va en `src/` de cada app, y `icon-192` / `icon-512` en el `manifest.webmanifest` si las hacés PWA.
- `_brand-tokens.scss` se importa en el `styles.scss` global de cada app.
