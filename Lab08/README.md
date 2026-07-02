# Aether Gaming Flow Starter

Starter inicial para ver el flujo funcional del marketplace diseñado en Stitch.

## Qué incluye

- Frontend SPA simple con rutas hash: Home, Auth, Catalog, Details, Cart, Profile, Admin, Maintenance y 404.
- Backend Express con API REST mock/in-memory.
- JWT, bcryptjs, Helmet, CORS y Rate Limiter.
- Roles: `admin` y `customer`.
- Flujo completo: login, catálogo, wishlist, carrito, checkout, perfil y dashboard admin.

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

## Nota

Este proyecto usa datos en memoria para validar navegación y comportamiento. La siguiente fase sería reemplazar `src/store.js` por PostgreSQL/MySQL y separar controllers/services/repositories.
