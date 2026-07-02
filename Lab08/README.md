# Aether Gaming Flow Starter

Starter inicial para ver el flujo funcional del marketplace diseñado en Stitch.

## Qué incluye

- Frontend SPA simple con rutas hash: Home, Auth, Catalog, Details, Cart, Profile, Admin, Maintenance y 404.
- Backend Express con API REST mock/in-memory.
- JWT, bcryptjs, Helmet, CORS y Rate Limiter.
- Roles: `admin` y `customer`.
- Flujo completo: login, catálogo, wishlist, carrito, checkout, perfil y dashboard admin.
- Subida de portadas desde Admin con `multipart/form-data` usando Multer.
- Validación de portadas: JPG, PNG o WEBP, máximo 5MB.

## Cómo ejecutar

```bash
npm install
npm run dev
```

Luego abre:

```text
http://localhost:3000
```

## Credenciales demo

Admin:

```text
admin@aether.dev
Admin1234
```

Cliente:

```text
alex@aether.dev
Player1234
```

## Cómo probar portadas desde Admin

1. Inicia sesión como admin.
2. Entra a `Admin`.
3. Pulsa `Add New Game`.
4. Elige una imagen en `Choose cover image`.
5. Guarda el videojuego.
6. La portada se verá en Admin, Home, Catálogo y Detalle.

Las imágenes subidas se guardan localmente en:

```text
public/uploads/covers/
```

## Nota

Este proyecto usa datos en memoria para validar navegación y comportamiento. La siguiente fase sería reemplazar `src/store.js` por PostgreSQL/MySQL y separar controllers/services/repositories.
