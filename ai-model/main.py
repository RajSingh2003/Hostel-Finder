"""
main.py — FastAPI server for AI price prediction.
Run: uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import joblib, json, numpy as np, os

app = FastAPI(title="StayFinder AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model artefacts ───────────────────────────────────────────────────────
MODEL_LOADED = False
model = le_city = le_type = le_floor = meta = None

def load_model():
    global model, le_city, le_type, le_floor, meta, MODEL_LOADED
    if os.path.exists('model.pkl'):
        model    = joblib.load('model.pkl')
        le_city  = joblib.load('le_city.pkl')
        le_type  = joblib.load('le_type.pkl')
        le_floor = joblib.load('le_floor.pkl')
        with open('model_meta.json') as f:
            meta = json.load(f)
        MODEL_LOADED = True
        print("✅ AI model loaded")
    else:
        print("⚠️  model.pkl not found — run train_model.py first")

load_model()

# ── Schemas ────────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    city: str
    type: str
    size: float = Field(gt=0)
    floor: str = "Ground"
    amenities: Optional[List[str]] = []

class PredictResponse(BaseModel):
    predicted: float
    range: dict
    breakdown: dict
    source: str
    model_r2: Optional[float] = None

# Amenity → feature mapping
AMENITY_MAP = {
    'WiFi': 'wifi', 'AC': 'ac', 'Meals Included': 'meals',
    'Gym': 'gym', 'Laundry': 'laundry', 'Parking': 'parking',
    'Attached Bath': 'attached_bath', 'Furnished': 'furnished'
}
AMENITY_BONUS = {
    'WiFi': 300, 'AC': 800, 'Meals Included': 1200, 'Gym': 400,
    'Laundry': 200, 'Parking': 300, 'Attached Bath': 500, 'Furnished': 1000,
    'CCTV': 150, 'Lift': 200, 'Hot Water': 150, 'Power Backup': 250
}

# Local fallback prices
CITY_BASE = {'Mumbai':12000,'Delhi':9000,'Pune':8000,'Bengaluru':10000,
             'Hyderabad':9500,'Chennai':8500,'Nashik':6000,'Nagpur':5500,
             'Ahmedabad':7000,'Kolkata':7000}
TYPE_MULTI = {'PG':0.65,'Hostel':0.6,'Studio':1.3,'1BHK':1.5,'2BHK':2.2,'Shared Room':0.55}
FLOOR_BONUS = {'Ground':0,'1st':200,'2nd':350,'3rd':500,'4th+':600}

def local_predict(data: PredictRequest):
    base = CITY_BASE.get(data.city, 8000) * TYPE_MULTI.get(data.type, 0.8)
    size_premium = data.size * 8
    floor_premium = FLOOR_BONUS.get(data.floor, 0)
    amenity_premium = sum(AMENITY_BONUS.get(a, 0) for a in (data.amenities or []))
    predicted = round((base + size_premium + floor_premium + amenity_premium) / 100) * 100
    return predicted, base, size_premium, floor_premium, amenity_premium

@app.get("/")
def root():
    return {"message": "StayFinder AI API", "model_loaded": MODEL_LOADED}

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_LOADED, "meta": meta}

@app.post("/predict", response_model=PredictResponse)
def predict(data: PredictRequest):
    amenities = data.amenities or []

    if MODEL_LOADED:
        try:
            # Encode inputs
            city_enc  = le_city.transform([data.city])[0]  if data.city  in le_city.classes_  else 0
            type_enc  = le_type.transform([data.type])[0]  if data.type  in le_type.classes_  else 0
            floor_enc = le_floor.transform([data.floor])[0] if data.floor in le_floor.classes_ else 0

            feats = [
                city_enc, type_enc, floor_enc, data.size,
                int('WiFi' in amenities), int('AC' in amenities),
                int('Meals Included' in amenities), int('Gym' in amenities),
                int('Laundry' in amenities), int('Parking' in amenities),
                int('Attached Bath' in amenities), int('Furnished' in amenities)
            ]
            predicted = float(model.predict([feats])[0])
            predicted = round(predicted / 100) * 100

            return PredictResponse(
                predicted=predicted,
                range={'low': round(predicted * 0.88 / 100) * 100,
                       'high': round(predicted * 1.15 / 100) * 100},
                breakdown={'model': 'RandomForest', 'features_used': len(feats)},
                source='ml-model',
                model_r2=meta.get('r2') if meta else None
            )
        except Exception as e:
            print(f"ML predict error: {e}. Using fallback.")

    # Fallback
    predicted, base, size_p, floor_p, amen_p = local_predict(data)
    return PredictResponse(
        predicted=predicted,
        range={'low': round(predicted * 0.88 / 100) * 100,
               'high': round(predicted * 1.15 / 100) * 100},
        breakdown={'base': round(base), 'sizePremium': size_p,
                   'floorPremium': floor_p, 'amenityPremium': amen_p},
        source='local-fallback'
    )

@app.post("/check-fraud")
def check_fraud(data: dict):
    listed = data.get('listed', 0)
    predicted = data.get('predicted', 0)
    if not predicted:
        raise HTTPException(400, "predicted price is required")
    diff_pct = ((listed - predicted) / predicted) * 100
    status = 'overpriced' if diff_pct > 20 else ('deal' if diff_pct < -10 else 'fair')
    return {'status': status, 'diff_pct': round(diff_pct, 1),
            'listed': listed, 'predicted': predicted}
