import requests

BASE_URL = "http://127.0.0.1:5000"

response = requests.get(f"{BASE_URL}/conciertos", timeout=10)
response.raise_for_status()

print("Conciertos disponibles:")
for concierto in response.json():
    print(
        f"- #{concierto['id']} {concierto['artista']} | "
        f"{concierto['tour']} | S/ {concierto['precio']} | "
        f"stock: {concierto['stock']}"
    )
