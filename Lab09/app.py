from __future__ import annotations

import re
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

from flask import (
    Flask,
    g,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
)
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "entradas.db"
UPLOAD_ROOT = BASE_DIR / "static" / "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024
PAYMENT_METHODS = {"Tarjeta", "Transferencia", "Efectivo", "Yape", "Plin"}
SALE_STATES = {"completada", "pendiente", "cancelada"}

app = Flask(__name__)
app.config.update(
    DATABASE=str(DATABASE),
    UPLOAD_ROOT=str(UPLOAD_ROOT),
    MAX_CONTENT_LENGTH=MAX_IMAGE_SIZE,
    JSON_SORT_KEYS=False,
)

for folder in ("portadas", "entradas", "defaults"):
    (UPLOAD_ROOT / folder).mkdir(parents=True, exist_ok=True)

SCHEMA = """
CREATE TABLE IF NOT EXISTS conciertos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artista TEXT NOT NULL,
    tour TEXT NOT NULL,
    fecha TEXT NOT NULL,
    recinto TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    precio REAL NOT NULL CHECK (precio > 0),
    stock_inicial INTEGER NOT NULL CHECK (stock_inicial >= 0),
    stock_disponible INTEGER NOT NULL CHECK (stock_disponible >= 0),
    estado TEXT NOT NULL DEFAULT 'disponible',
    portada TEXT,
    imagen_entrada TEXT,
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (stock_disponible <= stock_inicial)
);

CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE,
    concierto_id INTEGER NOT NULL,
    comprador TEXT NOT NULL,
    correo TEXT NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario REAL NOT NULL CHECK (precio_unitario >= 0),
    total REAL NOT NULL CHECK (total >= 0),
    metodo_pago TEXT NOT NULL DEFAULT 'Tarjeta',
    estado TEXT NOT NULL DEFAULT 'completada',
    observaciones TEXT,
    fecha_venta TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (concierto_id) REFERENCES conciertos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_conciertos_fecha ON conciertos(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_concierto ON ventas(concierto_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta);
"""

SEED_DATA = [
    (
        "Coldplay",
        "Music of the Spheres",
        "2026-11-21T20:00:00",
        "Estadio Nacional",
        "Lima",
        250.0,
        500,
        318,
        "disponible",
        "uploads/defaults/default_tour.svg",
        "uploads/defaults/default_ticket.svg",
    ),
    (
        "Dua Lipa",
        "Radical Optimism Tour",
        "2027-02-14T20:30:00",
        "Arena 1",
        "Lima",
        220.0,
        350,
        32,
        "pocas_entradas",
        "uploads/defaults/default_tour.svg",
        "uploads/defaults/default_ticket.svg",
    ),
    (
        "Imagine Dragons",
        "Loom World Tour",
        "2027-04-18T20:00:00",
        "Estadio Nacional",
        "Lima",
        280.0,
        800,
        640,
        "disponible",
        "uploads/defaults/default_tour.svg",
        "uploads/defaults/default_ticket.svg",
    ),
    (
        "The Weeknd",
        "After Hours Til Dawn",
        "2027-06-05T21:00:00",
        "Estadio Monumental",
        "Lima",
        340.0,
        600,
        0,
        "agotado",
        "uploads/defaults/default_tour.svg",
        "uploads/defaults/default_ticket.svg",
    ),
]


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"], timeout=5)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
        g.db.execute("PRAGMA journal_mode = WAL")
        g.db.execute("PRAGMA busy_timeout = 5000")
    return g.db


@app.teardown_appcontext
def close_db(_error: BaseException | None = None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db() -> None:
    db = get_db()
    db.executescript(SCHEMA)
    total = db.execute("SELECT COUNT(*) AS total FROM conciertos").fetchone()["total"]
    if total == 0:
        db.executemany(
            """
            INSERT INTO conciertos
                (artista, tour, fecha, recinto, ciudad, precio,
                 stock_inicial, stock_disponible, estado, portada, imagen_entrada)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            SEED_DATA,
        )
    db.commit()


def parse_iso_date(value: object) -> datetime:
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def concert_status(row: sqlite3.Row | dict) -> str:
    stock_initial = int(row["stock_inicial"])
    stock_available = int(row["stock_disponible"])
    try:
        event_date = parse_iso_date(row["fecha"]).replace(tzinfo=None)
        if event_date < datetime.now():
            return "finalizado"
    except (ValueError, TypeError):
        pass
    if stock_available <= 0:
        return "agotado"
    if stock_initial <= 0:
        return "agotado"
    ratio = stock_available / stock_initial
    if ratio < 0.10:
        return "pocas_entradas"
    if ratio <= 0.50:
        return "disponibilidad_media"
    return "disponible"


def image_url(relative_path: str | None) -> str | None:
    return url_for("static", filename=relative_path, _external=False) if relative_path else None


def row_to_concert(row: sqlite3.Row) -> dict:
    item = dict(row)
    item["stock"] = item["stock_disponible"]  # compatibilidad con el ejercicio original
    item["entradas_vendidas"] = max(0, item["stock_inicial"] - item["stock_disponible"])
    item["porcentaje_vendido"] = round(
        (item["entradas_vendidas"] / item["stock_inicial"] * 100)
        if item["stock_inicial"]
        else 0,
        1,
    )
    item["estado"] = concert_status(item)
    item["portada_url"] = image_url(item.get("portada"))
    item["imagen_entrada_url"] = image_url(item.get("imagen_entrada"))
    return item


def row_to_sale(row: sqlite3.Row) -> dict:
    item = dict(row)
    if "portada" in item:
        item["portada_url"] = image_url(item.get("portada"))
    if "imagen_entrada" in item:
        item["imagen_entrada_url"] = image_url(item.get("imagen_entrada"))
    return item


def get_concert_or_none(concert_id: int) -> sqlite3.Row | None:
    return get_db().execute(
        "SELECT * FROM conciertos WHERE id = ?", (concert_id,)
    ).fetchone()


def get_sale_or_none(sale_id: int) -> sqlite3.Row | None:
    return get_db().execute(
        """
        SELECT v.*, c.artista, c.tour, c.fecha AS fecha_concierto,
               c.recinto, c.ciudad, c.portada, c.imagen_entrada
        FROM ventas v
        JOIN conciertos c ON c.id = v.concierto_id
        WHERE v.id = ?
        """,
        (sale_id,),
    ).fetchone()


def normalize_concert_payload(data: dict, current: sqlite3.Row | None = None) -> dict:
    normalized = dict(data)
    if "stock" in normalized and "stock_inicial" not in normalized:
        normalized["stock_inicial"] = normalized["stock"]
    if current is None and "stock_disponible" not in normalized and "stock_inicial" in normalized:
        normalized["stock_disponible"] = normalized["stock_inicial"]
    return normalized


def validate_concert_payload(
    data: dict, *, partial: bool = False, current: sqlite3.Row | None = None
) -> list[str]:
    data = normalize_concert_payload(data, current)
    required = (
        "artista",
        "tour",
        "fecha",
        "recinto",
        "ciudad",
        "precio",
        "stock_inicial",
    )
    errors: list[str] = []
    if not partial:
        for field in required:
            if field not in data or data[field] in (None, ""):
                errors.append(f"El campo '{field}' es obligatorio.")

    for field in ("artista", "tour", "recinto", "ciudad"):
        if field in data and (not isinstance(data[field], str) or not data[field].strip()):
            errors.append(f"El campo '{field}' debe contener texto.")

    if "precio" in data:
        try:
            if float(data["precio"]) <= 0:
                errors.append("El precio debe ser mayor que cero.")
        except (TypeError, ValueError):
            errors.append("El precio debe ser numérico.")

    for field in ("stock_inicial", "stock_disponible"):
        if field in data:
            try:
                if int(data[field]) < 0:
                    errors.append(f"El campo '{field}' no puede ser negativo.")
            except (TypeError, ValueError):
                errors.append(f"El campo '{field}' debe ser un número entero.")

    initial = data.get("stock_inicial", current["stock_inicial"] if current else None)
    available = data.get("stock_disponible", current["stock_disponible"] if current else initial)
    try:
        if initial is not None and available is not None and int(available) > int(initial):
            errors.append("El stock disponible no puede superar el stock inicial.")
    except (TypeError, ValueError):
        pass

    if "fecha" in data:
        try:
            parse_iso_date(data["fecha"])
        except (ValueError, TypeError):
            errors.append("La fecha debe usar un formato válido, por ejemplo 2027-04-18T20:00:00.")
    return errors


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_image(file_storage, *, concert_id: int, kind: str) -> str:
    original = secure_filename(file_storage.filename or "")
    if not original or not allowed_file(original):
        raise ValueError("Formato no permitido. Usa JPG, JPEG, PNG o WEBP.")
    if file_storage.mimetype and not file_storage.mimetype.startswith("image/"):
        raise ValueError("El archivo seleccionado no parece ser una imagen válida.")

    extension = original.rsplit(".", 1)[1].lower()
    folder = "portadas" if kind == "portada" else "entradas"
    filename = f"{kind}_{concert_id}_{uuid.uuid4().hex[:12]}.{extension}"
    destination = UPLOAD_ROOT / folder / filename
    file_storage.save(destination)
    return f"uploads/{folder}/{filename}"


def delete_local_image(relative_path: str | None) -> None:
    if not relative_path or "/defaults/" in f"/{relative_path}":
        return
    try:
        path = (BASE_DIR / "static" / relative_path).resolve()
        static_root = (BASE_DIR / "static").resolve()
        if static_root in path.parents and path.exists():
            path.unlink()
    except OSError:
        pass


def is_api_request() -> bool:
    return not request.path.startswith("/admin") and request.path != "/"


@app.errorhandler(413)
def file_too_large(_error):
    if is_api_request():
        return jsonify({"error": "La imagen supera el límite de 5 MB."}), 413
    return render_template("error.html", code=413, message="La imagen supera el límite de 5 MB."), 413


# ------------------------------- UI ---------------------------------------


@app.route("/")
def root():
    return redirect(url_for("admin_dashboard"))


@app.route("/admin")
def admin_dashboard():
    return render_template("dashboard.html", active="dashboard", title="Dashboard")


@app.route("/admin/conciertos")
def admin_concerts():
    return render_template("conciertos.html", active="conciertos", title="Conciertos")


@app.route("/admin/conciertos/nuevo")
def admin_new_concert():
    return render_template(
        "concierto_formulario.html",
        active="nuevo_concierto",
        title="Registrar concierto",
        concert_id=None,
    )


@app.route("/admin/conciertos/<int:concert_id>")
def admin_concert_detail(concert_id: int):
    return render_template(
        "concierto_detalle.html",
        active="conciertos",
        title="Detalle del concierto",
        concert_id=concert_id,
    )


@app.route("/admin/conciertos/<int:concert_id>/editar")
def admin_edit_concert(concert_id: int):
    return render_template(
        "concierto_formulario.html",
        active="conciertos",
        title="Editar concierto",
        concert_id=concert_id,
    )


@app.route("/admin/ventas")
def admin_sales():
    return render_template("ventas.html", active="ventas", title="Historial de ventas")


@app.route("/admin/ventas/nueva")
def admin_new_sale():
    return render_template("venta_formulario.html", active="nueva_venta", title="Registrar venta")


@app.route("/admin/ventas/<int:sale_id>/entrada")
def admin_ticket(sale_id: int):
    return render_template("venta_entrada.html", title="Entrada digital", sale_id=sale_id)


@app.route("/admin/galeria")
def admin_gallery():
    return render_template("galeria.html", active="galeria", title="Galería")


# ------------------------------- API --------------------------------------


@app.route("/api", methods=["GET"])
def api_home():
    return jsonify(
        {
            "aplicacion": "LivePass - Sistema de venta de entradas",
            "base_de_datos": "SQLite",
            "interfaz": "/admin",
            "endpoints": {
                "conciertos": "/conciertos",
                "ventas": "/ventas",
                "dashboard": "/api/dashboard",
                "galeria": "/api/galeria",
            },
        }
    )


@app.route("/conciertos", methods=["GET"])
def list_concerts():
    rows = get_db().execute("SELECT * FROM conciertos ORDER BY fecha ASC, id ASC").fetchall()
    return jsonify([row_to_concert(row) for row in rows])


@app.route("/conciertos/<int:concert_id>", methods=["GET"])
def get_concert(concert_id: int):
    row = get_concert_or_none(concert_id)
    if row is None:
        return jsonify({"error": "Concierto no encontrado."}), 404
    return jsonify(row_to_concert(row))


@app.route("/conciertos", methods=["POST"])
def create_concert():
    data = request.get_json(silent=True) or {}
    data = normalize_concert_payload(data)
    errors = validate_concert_payload(data)
    if errors:
        return jsonify({"errores": errors}), 400

    db = get_db()
    cursor = db.execute(
        """
        INSERT INTO conciertos
            (artista, tour, fecha, recinto, ciudad, precio, stock_inicial,
             stock_disponible, estado, portada, imagen_entrada)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data["artista"].strip(),
            data["tour"].strip(),
            data["fecha"],
            data["recinto"].strip(),
            data["ciudad"].strip(),
            float(data["precio"]),
            int(data["stock_inicial"]),
            int(data.get("stock_disponible", data["stock_inicial"])),
            str(data.get("estado", "disponible")),
            data.get("portada") or "uploads/defaults/default_tour.svg",
            data.get("imagen_entrada") or "uploads/defaults/default_ticket.svg",
        ),
    )
    db.commit()
    return jsonify(row_to_concert(get_concert_or_none(cursor.lastrowid))), 201


@app.route("/conciertos/<int:concert_id>", methods=["PUT", "PATCH"])
def update_concert(concert_id: int):
    current = get_concert_or_none(concert_id)
    if current is None:
        return jsonify({"error": "Concierto no encontrado."}), 404

    data = request.get_json(silent=True) or {}
    if not data:
        return jsonify({"error": "Debes enviar al menos un campo para actualizar."}), 400
    data = normalize_concert_payload(data, current)
    errors = validate_concert_payload(data, partial=True, current=current)
    if errors:
        return jsonify({"errores": errors}), 400

    allowed = {
        "artista", "tour", "fecha", "recinto", "ciudad", "precio",
        "stock_inicial", "stock_disponible", "estado", "portada", "imagen_entrada",
    }
    fields: list[str] = []
    values: list[object] = []
    for key, value in data.items():
        if key not in allowed:
            continue
        if key in {"artista", "tour", "recinto", "ciudad"}:
            value = str(value).strip()
        elif key == "precio":
            value = float(value)
        elif key in {"stock_inicial", "stock_disponible"}:
            value = int(value)
        fields.append(f"{key} = ?")
        values.append(value)
    if not fields:
        return jsonify({"error": "No se enviaron campos válidos."}), 400

    fields.append("actualizado_en = CURRENT_TIMESTAMP")
    values.append(concert_id)
    db = get_db()
    db.execute(f"UPDATE conciertos SET {', '.join(fields)} WHERE id = ?", values)
    db.commit()
    return jsonify(row_to_concert(get_concert_or_none(concert_id)))


@app.route("/conciertos/<int:concert_id>", methods=["DELETE"])
def delete_concert(concert_id: int):
    row = get_concert_or_none(concert_id)
    if row is None:
        return jsonify({"error": "Concierto no encontrado."}), 404
    db = get_db()
    sales_count = db.execute(
        "SELECT COUNT(*) AS total FROM ventas WHERE concierto_id = ?", (concert_id,)
    ).fetchone()["total"]
    if sales_count:
        return jsonify({"error": "No se puede eliminar un concierto que ya tiene ventas registradas."}), 409
    db.execute("DELETE FROM conciertos WHERE id = ?", (concert_id,))
    db.commit()
    delete_local_image(row["portada"])
    delete_local_image(row["imagen_entrada"])
    return jsonify({"mensaje": "Concierto eliminado correctamente."})


@app.route("/conciertos/<int:concert_id>/imagenes", methods=["POST"])
def upload_concert_images(concert_id: int):
    row = get_concert_or_none(concert_id)
    if row is None:
        return jsonify({"error": "Concierto no encontrado."}), 404
    portada_file = request.files.get("portada")
    ticket_file = request.files.get("entrada")
    if not portada_file and not ticket_file:
        return jsonify({"error": "Envía una imagen en el campo 'portada' o 'entrada'."}), 400

    changes: dict[str, str] = {}
    try:
        if portada_file and portada_file.filename:
            changes["portada"] = save_image(portada_file, concert_id=concert_id, kind="portada")
        if ticket_file and ticket_file.filename:
            changes["imagen_entrada"] = save_image(ticket_file, concert_id=concert_id, kind="entrada")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not changes:
        return jsonify({"error": "No se seleccionó ningún archivo válido."}), 400

    db = get_db()
    assignments = ", ".join(f"{field} = ?" for field in changes)
    db.execute(
        f"UPDATE conciertos SET {assignments}, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?",
        [*changes.values(), concert_id],
    )
    db.commit()
    if "portada" in changes:
        delete_local_image(row["portada"])
    if "imagen_entrada" in changes:
        delete_local_image(row["imagen_entrada"])
    return jsonify(
        {
            "mensaje": "Imágenes guardadas correctamente en static/uploads/.",
            "concierto": row_to_concert(get_concert_or_none(concert_id)),
        }
    )


@app.route("/conciertos/<int:concert_id>/imagenes/<string:kind>", methods=["DELETE"])
def delete_concert_image(concert_id: int, kind: str):
    mapping = {"portada": ("portada", "uploads/defaults/default_tour.svg"), "entrada": ("imagen_entrada", "uploads/defaults/default_ticket.svg")}
    if kind not in mapping:
        return jsonify({"error": "Tipo de imagen inválido. Usa 'portada' o 'entrada'."}), 400
    row = get_concert_or_none(concert_id)
    if row is None:
        return jsonify({"error": "Concierto no encontrado."}), 404
    field, fallback = mapping[kind]
    old_path = row[field]
    db = get_db()
    db.execute(
        f"UPDATE conciertos SET {field} = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?",
        (fallback, concert_id),
    )
    db.commit()
    delete_local_image(old_path)
    return jsonify({"mensaje": "Imagen eliminada correctamente.", "concierto": row_to_concert(get_concert_or_none(concert_id))})


@app.route("/ventas", methods=["GET"])
def list_sales():
    rows = get_db().execute(
        """
        SELECT v.*, c.artista, c.tour, c.fecha AS fecha_concierto,
               c.recinto, c.ciudad, c.portada, c.imagen_entrada
        FROM ventas v
        JOIN conciertos c ON c.id = v.concierto_id
        ORDER BY v.fecha_venta DESC, v.id DESC
        """
    ).fetchall()
    return jsonify([row_to_sale(row) for row in rows])


@app.route("/ventas/<int:sale_id>", methods=["GET"])
def get_sale(sale_id: int):
    row = get_sale_or_none(sale_id)
    if row is None:
        return jsonify({"error": "Venta no encontrada."}), 404
    return jsonify(row_to_sale(row))


@app.route("/ventas", methods=["POST"])
def create_sale():
    data = request.get_json(silent=True) or {}
    required = ("concierto_id", "comprador", "correo", "cantidad")
    missing = [field for field in required if data.get(field) in (None, "")]
    if missing:
        return jsonify({"error": f"Faltan campos: {', '.join(missing)}."}), 400
    try:
        concert_id = int(data["concierto_id"])
        quantity = int(data["cantidad"])
    except (TypeError, ValueError):
        return jsonify({"error": "concierto_id y cantidad deben ser enteros."}), 400
    if quantity <= 0:
        return jsonify({"error": "La cantidad debe ser mayor que cero."}), 400

    buyer = str(data["comprador"]).strip()
    email = str(data["correo"]).strip()
    if not buyer:
        return jsonify({"error": "El nombre del comprador es obligatorio."}), 400
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "Ingresa un correo electrónico válido."}), 400
    payment_method = str(data.get("metodo_pago", "Tarjeta")).strip().title()
    if payment_method not in PAYMENT_METHODS:
        return jsonify({"error": "Método de pago no permitido."}), 400
    sale_state = str(data.get("estado", "completada")).lower()
    if sale_state not in SALE_STATES:
        return jsonify({"error": "Estado de venta no permitido."}), 400

    db = get_db()
    try:
        db.execute("BEGIN IMMEDIATE")
        concert = db.execute("SELECT * FROM conciertos WHERE id = ?", (concert_id,)).fetchone()
        if concert is None:
            db.rollback()
            return jsonify({"error": "Concierto no encontrado."}), 404
        if concert_status(concert) in {"agotado", "finalizado"}:
            db.rollback()
            return jsonify({"error": "El concierto no está disponible para ventas."}), 409

        update = db.execute(
            """
            UPDATE conciertos
            SET stock_disponible = stock_disponible - ?, actualizado_en = CURRENT_TIMESTAMP
            WHERE id = ? AND stock_disponible >= ?
            """,
            (quantity, concert_id, quantity),
        )
        if update.rowcount != 1:
            db.rollback()
            return jsonify({"error": "No hay suficientes entradas disponibles."}), 409

        unit_price = float(concert["precio"])
        total = round(unit_price * quantity, 2)
        cursor = db.execute(
            """
            INSERT INTO ventas
                (codigo, concierto_id, comprador, correo, cantidad, precio_unitario,
                 total, metodo_pago, estado, observaciones)
            VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                concert_id,
                buyer,
                email,
                quantity,
                unit_price,
                total,
                payment_method,
                sale_state,
                str(data.get("observaciones", "")).strip() or None,
            ),
        )
        sale_id = cursor.lastrowid
        code = f"LP-{datetime.now().year}-{sale_id:06d}"
        db.execute("UPDATE ventas SET codigo = ? WHERE id = ?", (code, sale_id))
        db.commit()
    except sqlite3.Error:
        db.rollback()
        raise

    return jsonify(row_to_sale(get_sale_or_none(sale_id))), 201


@app.route("/api/dashboard", methods=["GET"])
def dashboard_data():
    db = get_db()
    concert_rows = db.execute("SELECT * FROM conciertos ORDER BY fecha ASC").fetchall()
    sales_rows = db.execute(
        """
        SELECT v.*, c.artista, c.tour
        FROM ventas v JOIN conciertos c ON c.id = v.concierto_id
        ORDER BY v.fecha_venta DESC, v.id DESC
        """
    ).fetchall()
    concerts = [row_to_concert(row) for row in concert_rows]
    sales = [dict(row) for row in sales_rows]
    total_initial = sum(c["stock_inicial"] for c in concerts)
    total_available = sum(c["stock_disponible"] for c in concerts)
    total_sold = sum(c["entradas_vendidas"] for c in concerts)
    revenue = round(sum(float(s["total"]) for s in sales if s["estado"] == "completada"), 2)
    today_prefix = datetime.now().strftime("%Y-%m-%d")
    today_sales = [s for s in sales if str(s["fecha_venta"]).startswith(today_prefix)]
    by_concert: dict[str, int] = {}
    for sale in sales:
        key = f"{sale['artista']} — {sale['tour']}"
        by_concert[key] = by_concert.get(key, 0) + int(sale["cantidad"])
    best_concert = max(by_concert, key=by_concert.get) if by_concert else "Sin ventas todavía"
    return jsonify(
        {
            "resumen": {
                "conciertos_activos": sum(1 for c in concerts if c["estado"] not in {"finalizado"}),
                "entradas_disponibles": total_available,
                "entradas_vendidas": total_sold,
                "ingresos_totales": revenue,
                "ocupacion_general": round(total_sold / total_initial * 100, 1) if total_initial else 0,
                "concierto_mas_vendido": best_concert,
                "venta_promedio": round(revenue / len(sales), 2) if sales else 0,
                "ventas_del_dia": len(today_sales),
            },
            "proximos_conciertos": concerts[:5],
            "ventas_recientes": sales[:6],
            "stock_bajo": [c for c in concerts if c["estado"] in {"pocas_entradas", "agotado"}],
            "ventas_por_concierto": by_concert,
        }
    )


@app.route("/api/galeria", methods=["GET"])
def gallery_data():
    rows = get_db().execute(
        "SELECT id, artista, tour, portada, imagen_entrada, actualizado_en FROM conciertos ORDER BY actualizado_en DESC"
    ).fetchall()
    resources: list[dict] = []
    for row in rows:
        for kind, field in (("portada", "portada"), ("entrada", "imagen_entrada")):
            path = row[field]
            if not path:
                continue
            file_path = BASE_DIR / "static" / path
            resources.append(
                {
                    "concierto_id": row["id"],
                    "artista": row["artista"],
                    "tour": row["tour"],
                    "tipo": kind,
                    "ruta": path,
                    "url": image_url(path),
                    "nombre": Path(path).name,
                    "tamano": file_path.stat().st_size if file_path.exists() else 0,
                    "fecha": row["actualizado_en"],
                    "es_default": "/defaults/" in f"/{path}",
                }
            )
    return jsonify(resources)


with app.app_context():
    init_db()


if __name__ == "__main__":
    app.run(debug=True)
