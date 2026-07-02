# Aether Gaming Marketplace

Aplicación web inicial basada en el diseño de Stitch, ahora con backend modular, JWT, roles, subida de portadas, SQLite y pruebas de integración con Supertest + Jest.

## Decisión técnica para la guía

Para que la app sea fácil de evaluar y testear, la base de datos usada en esta versión es **SQLite con SQL real mediante `sql.js`**.

La razón es QA/pruebas:

- No requiere instalar PostgreSQL/MySQL para ejecutar la práctica.
- Permite correr pruebas Supertest con una base limpia por cada test.
- Evita acoplar los controladores a una tecnología específica.
- La lógica está separada en servicios y repositorios.
- Luego se puede migrar a PostgreSQL cambiando la capa `repositories/database`, no toda la API.

## Arquitectura

```text
src/
 ├── app.js                 # Factory testeable de Express, no levanta puerto
 ├── config/                # Variables de entorno
 ├── controllers/           # Reciben req/res y delegan a servicios
 ├── database/              # SQLite + schema + seed
 ├── middlewares/           # Auth, roles, uploads, errores
 ├── repositories/          # Acceso a datos
 ├── routes/                # Rutas independientes por módulo
 ├── services/              # Reglas de negocio
 ├── validators/            # Validaciones
 └── utils/                 # Helpers
```

## Requisitos cubiertos de la guía

### Flujo de persistencia cruzada

Se valida con Supertest:

```text
POST /api/admin/games
GET  /api/games/:id
```

El ID creado dinámicamente en el POST se reutiliza en el GET.

### Modificación de estado

Se valida con:

```text
POST /api/cart/items
POST /api/checkout
GET  /api/games/:id
```

El checkout descuenta stock en base de datos y luego se verifica con un GET posterior.

### Edge cases / robustez

Se validan casos como:

- Precio no numérico.
- Cantidad inválida.
- Stock insuficiente.
- Cliente intentando acceder a rutas admin.
- Credenciales incorrectas.

## Instalación

```bash
npm install
```

## Ejecutar aplicación

```bash
npm run dev
```

Abrir:

```text
http://localhost:3000
```

La base local se genera automáticamente en:

```text
database/aether.sqlite
```

Si quieres reiniciarla:

```bash
npm run db:reset
```

## Credenciales demo

```text
Admin:
admin@aether.dev
Admin1234

Cliente:
alex@aether.dev
Player1234
```

## Ejecutar pruebas

```bash
npm test
```

Resultado esperado:

```text
Test Suites: 3 passed
Tests: 8 passed
```

## Pruebas implementadas

```text
tests/auth.integration.test.js
tests/game-crud.integration.test.js
tests/cart-checkout.integration.test.js
```

Incluyen:

- Registro + lectura de sesión con JWT.
- Login inválido.
- CRUD de videojuegos desde admin.
- Lectura posterior con ID dinámico.
- Actualización de stock y verificación persistida.
- Archivado de videojuego.
- Cliente bloqueado en ruta admin.
- Carrito + checkout + reducción de stock.
- Edge cases 400 y 409, alineados con la guía del laboratorio.

## Postman

Colección incluida:

```text
postman/aether-gaming-integration.postman_collection.json
```

Flujo principal:

```text
1. Login Admin
2. Create Game
3. Read Created Game
4. Update Game Stock
5. Delete Archive Game
6. Edge Case Invalid Price
```

La colección usa variables:

```text
baseUrl
adminToken
gameId
```

## Endpoints principales

### Auth

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/forgot-password
```

### Catálogo

```text
GET /api/home
GET /api/games
GET /api/games/:id
GET /api/games/:id/related
GET /api/games/search/suggestions
```

### Admin

```text
GET    /api/admin/stats
GET    /api/admin/games
POST   /api/admin/games
PUT    /api/admin/games/:id
DELETE /api/admin/games/:id
GET    /api/admin/activity
GET    /api/admin/reports/sales
```

### Wishlist

```text
GET    /api/wishlist
POST   /api/wishlist
DELETE /api/wishlist/:gameId
```

### Carrito y compra

```text
GET    /api/cart
POST   /api/cart/items
PUT    /api/cart/items/:itemId
DELETE /api/cart/items/:itemId
DELETE /api/cart
POST   /api/cart/apply-promo
POST   /api/checkout
```

### Perfil y biblioteca

```text
GET  /api/users/me
PUT  /api/users/me
PUT  /api/users/me/avatar
GET  /api/users/me/purchases
GET  /api/users/me/wishlist
GET  /api/library
GET  /api/library/:gameId/download
POST /api/users/me/delete-request
```

## Subida de portadas desde Admin

Desde el dashboard admin se puede crear o editar videojuegos con portada.

Validaciones:

```text
MIME: image/jpeg, image/png, image/webp
Tamaño máximo: 5 MB
Campo: coverImage
```

Las imágenes se guardan en:

```text
public/uploads/covers/
```

## Buenas prácticas aplicadas

- `server.js` exporta `app` por defecto para Supertest y solo levanta el servidor cuando se ejecuta directamente.
- `src/app.js` exporta `createApp()` para pruebas con base limpia e inyectable.
- Controladores sin lógica de negocio pesada.
- Servicios con reglas de negocio.
- Repositorios aislados para acceso a DB.
- Rutas independientes.
- Middleware de JWT y rol admin.
- Manejo centralizado de errores.
- Validaciones server-side.
- Transacción en checkout.
- Seed automático para demo.
- Pruebas con base limpia por test.

## Versión final de navegación

Se cerraron las pestañas y flujos que antes estaban como pendientes:

```text
#/settings
#/support
#/upgrade
#/checkout
#/legal/privacy
#/legal/terms
#/payments
#/admin/users
#/admin/categories
#/admin/activity
```

### Nuevos flujos conectados

- Settings de usuario conectado a `PUT /api/users/me`.
- Upgrade to Pro conectado a `POST /api/users/me/upgrade`.
- Support conectado a `POST /api/support/tickets`.
- Checkout final conectado a `POST /api/checkout`.
- Reviews del perfil conectado a `GET /api/users/me/reviews`.
- Admin Users conectado a `GET /api/admin/users` y `PUT /api/admin/users/:id`.
- Admin Categories conectado a CRUD de categorías.
- Admin Activity muestra actividad y tickets de soporte.
- Páginas legales y métodos de pago ya tienen pantalla navegable.

## Resultado actualizado de pruebas

```text
Test Suites: 4 passed
Tests: 11 passed
```

Prueba adicional incluida:

```text
tests/final-tabs.integration.test.js
```

Valida:

- Creación pública de ticket de soporte.
- Creación y listado de categorías por admin.
- Lectura de tickets por admin.
- Upgrade de usuario a Pro.

## Endpoints adicionales de versión final

```text
POST /api/support/tickets
POST /api/users/me/upgrade
GET  /api/users/me/reviews
GET  /api/admin/categories
POST /api/admin/categories
PUT  /api/admin/categories/:id
DELETE /api/admin/categories/:id
PUT  /api/admin/users/:id
GET  /api/admin/support-tickets
```
