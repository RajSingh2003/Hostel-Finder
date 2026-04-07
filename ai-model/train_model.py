"""
train_model.py — Train the rent price prediction model.
Run this once: python train_model.py
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import json

# ── Synthetic training data (replace with real data in production) ─────────────
np.random.seed(42)
N = 3000

CITIES = ['Mumbai', 'Delhi', 'Pune', 'Bengaluru', 'Hyderabad', 'Chennai', 'Nashik', 'Nagpur', 'Ahmedabad', 'Kolkata']
TYPES  = ['PG', 'Hostel', 'Studio', '1BHK', '2BHK', 'Shared Room']
FLOORS = ['Ground', '1st', '2nd', '3rd', '4th+']

city_base = {'Mumbai':12000,'Delhi':9000,'Pune':8000,'Bengaluru':10000,
             'Hyderabad':9500,'Chennai':8500,'Nashik':6000,'Nagpur':5500,
             'Ahmedabad':7000,'Kolkata':7000}
type_multi = {'PG':0.65,'Hostel':0.6,'Studio':1.3,'1BHK':1.5,'2BHK':2.2,'Shared Room':0.55}
floor_bonus = {'Ground':0,'1st':200,'2nd':350,'3rd':500,'4th+':600}

cities   = np.random.choice(CITIES, N)
types    = np.random.choice(TYPES,  N)
floors   = np.random.choice(FLOORS, N)
sizes    = np.random.randint(60, 400, N)
wifi     = np.random.randint(0, 2, N)
ac       = np.random.randint(0, 2, N)
meals    = np.random.randint(0, 2, N)
gym      = np.random.randint(0, 2, N)
laundry  = np.random.randint(0, 2, N)
parking  = np.random.randint(0, 2, N)
attached = np.random.randint(0, 2, N)
furnished= np.random.randint(0, 2, N)

prices = []
for i in range(N):
    base  = city_base[cities[i]] * type_multi[types[i]]
    base += sizes[i] * 8
    base += floor_bonus[floors[i]]
    base += wifi[i]*300 + ac[i]*800 + meals[i]*1200 + gym[i]*400
    base += laundry[i]*200 + parking[i]*300 + attached[i]*500 + furnished[i]*1000
    base += np.random.normal(0, base * 0.08)   # ±8% noise
    prices.append(max(2000, round(base / 100) * 100))

df = pd.DataFrame({
    'city': cities, 'type': types, 'floor': floors, 'size': sizes,
    'wifi': wifi, 'ac': ac, 'meals': meals, 'gym': gym,
    'laundry': laundry, 'parking': parking, 'attached_bath': attached,
    'furnished': furnished, 'price': prices
})

# ── Encode categoricals ────────────────────────────────────────────────────────
le_city  = LabelEncoder().fit(df['city'])
le_type  = LabelEncoder().fit(df['type'])
le_floor = LabelEncoder().fit(df['floor'])

df['city_enc']  = le_city.transform(df['city'])
df['type_enc']  = le_type.transform(df['type'])
df['floor_enc'] = le_floor.transform(df['floor'])

FEATURES = ['city_enc','type_enc','floor_enc','size','wifi','ac','meals',
            'gym','laundry','parking','attached_bath','furnished']
X = df[FEATURES]
y = df['price']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# ── Train Random Forest ────────────────────────────────────────────────────────
model = RandomForestRegressor(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
r2  = r2_score(y_test, y_pred)
print(f"✅ Random Forest  →  MAE: ₹{mae:.0f}  |  R²: {r2:.4f}")

cv_scores = cross_val_score(model, X, y, cv=5, scoring='r2')
print(f"   Cross-val R²: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ── Save artefacts ─────────────────────────────────────────────────────────────
joblib.dump(model,    'model.pkl')
joblib.dump(le_city,  'le_city.pkl')
joblib.dump(le_type,  'le_type.pkl')
joblib.dump(le_floor, 'le_floor.pkl')

meta = {
    'features': FEATURES,
    'cities':   list(le_city.classes_),
    'types':    list(le_type.classes_),
    'floors':   list(le_floor.classes_),
    'mae': round(mae, 2),
    'r2':  round(r2, 4)
}
with open('model_meta.json', 'w') as f:
    json.dump(meta, f, indent=2)

print("✅ Model saved: model.pkl, le_city.pkl, le_type.pkl, le_floor.pkl, model_meta.json")
