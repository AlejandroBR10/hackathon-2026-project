from fastapi import FastAPI, UploadFile, File
from ultralytics import YOLO
import io
from PIL import Image

app = FastAPI()

# Cargamos tu modelo experto (el cerebro)
model = YOLO('best.pt')

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # 1. Leemos la imagen que llega
    img_bytes = await file.read()
    img = Image.open(io.BytesIO(img_bytes))
    
    # 2. YOLO hace su magia
    results = model(img)
    
    # 3. Formateamos la respuesta cruda
    detecciones = []
    for r in results:
        for box in r.boxes:
            detecciones.append({
                # model.names te va a dar literalmente el "0" o el "1"
                "clase": model.names[int(box.cls)], 
                "confianza": float(box.conf),
                "bbox": [float(x) for x in box.xyxy[0]]
            })
            
    # 4. Devolvemos el JSON
    return {"detecciones": detecciones, "conteo_total": len(detecciones)}
