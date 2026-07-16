# LivePass — Sistema de venta de entradas para conciertos

Proyecto académico con interfaz administrativa basada en el diseño de Stitch **Electric Nocturne**, API REST en Flask y base de datos SQLite.

## Funcionalidades

- Dashboard con estadísticas reales.
- CRUD de conciertos.
- Stock inicial, disponible y porcentaje vendido.
- Registro de ventas con descuento atómico de stock.
- Historial de ventas y exportación CSV.
- Entrada digital imprimible con código visual.
- Carga, reemplazo y eliminación de portadas y diseños de entrada.
- Galería de recursos locales.
- Interfaz responsive para escritorio y móvil.
- Pruebas K6 sobre el endpoint de conciertos.

## Instalación

```bash
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

Linux o macOS:

```bash
source venv/bin/activate
```

Instala y ejecuta:

```bash
pip install -r requirements.txt
python app.py
```

Abre la interfaz:

```text
http://127.0.0.1:5000/admin
```

La base `entradas.db` y sus datos iniciales se crean automáticamente.

## Rutas de interfaz

```text
/admin
/admin/conciertos
/admin/conciertos/nuevo
/admin/conciertos/<id>
/admin/conciertos/<id>/editar
/admin/ventas
/admin/ventas/nueva
/admin/ventas/<id>/entrada
/admin/galeria
```

## API REST

| Método | Endpoint | Función |
|---|---|---|
| GET | `/conciertos` | Listar conciertos |
| GET | `/conciertos/<id>` | Obtener un concierto |
| POST | `/conciertos` | Crear un concierto |
| PUT/PATCH | `/conciertos/<id>` | Actualizar un concierto |
| DELETE | `/conciertos/<id>` | Eliminar un concierto sin ventas |
| POST | `/conciertos/<id>/imagenes` | Subir portada o entrada |
| DELETE | `/conciertos/<id>/imagenes/<tipo>` | Restaurar imagen predeterminada |
| GET | `/ventas` | Listar ventas |
| GET | `/ventas/<id>` | Obtener una venta |
| POST | `/ventas` | Registrar una venta |
| GET | `/api/dashboard` | Datos del dashboard |
| GET | `/api/galeria` | Recursos visuales |

### Crear concierto

La API acepta `stock_inicial` o el campo compatible `stock`:

```json
{
  "artista": "Imagine Dragons",
  "tour": "Loom World Tour",
  "fecha": "2027-04-18T20:00:00",
  "recinto": "Estadio Nacional",
  "ciudad": "Lima",
  "precio": 280,
  "stock": 800
}
```

### Registrar venta

```json
{
  "concierto_id": 1,
  "comprador": "Andrea López",
  "correo": "andrea@example.com",
  "cantidad": 2,
  "metodo_pago": "Yape"
}
```

El stock se valida y descuenta dentro de una transacción SQLite para evitar sobreventa.

## Imágenes y Git

Las imágenes se guardan físicamente en:

```text
static/uploads/portadas/
static/uploads/entradas/
```

SQLite almacena solamente la ruta relativa. Las carpetas de imágenes **no están ignoradas por Git**.

Después de cargar o reemplazar una imagen desde la interfaz:

```bash
git status
git add static/uploads/
git commit -m "Actualizar imágenes de conciertos"
git push
```

La aplicación no ejecuta `git commit` ni `git push` automáticamente.

`entradas.db` sí está ignorada para evitar conflictos binarios. Para versionarla, elimina esa regla de `.gitignore`, aunque no es lo recomendado para trabajo colaborativo.

## Pruebas de rendimiento

Con Flask ejecutándose:

```bash
k6 run prueba.js
k6 run prueba2.js
```

## Estructura principal

```text
app.py
templates/
  base.html
  components/
  dashboard.html
  conciertos.html
  concierto_detalle.html
  concierto_formulario.html
  ventas.html
  venta_formulario.html
  venta_entrada.html
  galeria.html
static/
  css/
    utilities.css
    styles.css
  js/
    app.js
    dashboard.js
    conciertos.js
    ventas.js
    galeria.js
  uploads/
    defaults/
    portadas/
    entradas/
```

`utilities.css` contiene las utilidades visuales compiladas localmente, por lo que la interfaz no depende de Tailwind CDN.
