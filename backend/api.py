from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import joblib, pandas as pd, numpy as np

app = FastAPI(title="FinTech AI API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cat_model    = joblib.load("../ml/categorization_model.pkl")
label_enc    = joblib.load("../ml/label_encoder.pkl")
feature_cols = joblib.load("../ml/feature_cols.pkl")
fore_model   = joblib.load("../ml/forecasting_model.pkl")
fore_results = joblib.load("../ml/forecasting_model_results.pkl")

class TransactionInput(BaseModel):
    description: str
    amount: float
    date: str
    transaction_type: Optional[str] = "Expense"

class CategoryResponse(BaseModel):
    description: str
    predicted_category: str
    amount: float
    date: str

class BulkInput(BaseModel):
    transactions: List[TransactionInput]

def build_features(amount, date_str, description):
    dt = pd.to_datetime(date_str)
    row = {"Amount": amount, "amount_log": np.log1p(amount),
           "amount_rounded": int(amount % 10 < 1),
           "amount_bin": int(pd.cut([amount], bins=[0,100,300,600,1000,2000,99999], labels=[0,1,2,3,4,5])[0]),
           "month": dt.month, "day": dt.day, "dayofweek": dt.dayofweek,
           "is_weekend": int(dt.dayofweek >= 5), "quarter": dt.quarter,
           "desc_word_count": len(description.split()), "desc_length": len(description)}
    return pd.DataFrame([row])[feature_cols]

@app.get("/")
def root():
    return {"message": "FinTech AI API running"}

@app.post("/categorize", response_model=CategoryResponse)
def categorize(t: TransactionInput):
    try:
        pred = label_enc.inverse_transform([cat_model.predict(build_features(t.amount, t.date, t.description))[0]])[0]
        return CategoryResponse(description=t.description, predicted_category=pred, amount=t.amount, date=t.date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/categorize/bulk")
def categorize_bulk(bulk: BulkInput):
    results = []
    for t in bulk.transactions:
        pred = label_enc.inverse_transform([cat_model.predict(build_features(t.amount, t.date, t.description))[0]])[0]
        results.append({"description": t.description, "predicted_category": pred, "amount": t.amount, "date": t.date})
    return {"results": results, "count": len(results)}

@app.get("/categories")
def get_categories():
    return {"categories": list(label_enc.classes_)}

@app.get("/forecast")
def get_forecast():
    future = fore_model.make_future_dataframe(periods=4, freq="W")
    fc = fore_model.predict(future)
    next4 = fc[["ds","yhat","yhat_lower","yhat_upper"]].tail(4).copy()
    next4[["yhat","yhat_lower","yhat_upper"]] = next4[["yhat","yhat_lower","yhat_upper"]].clip(lower=0)
    weekly = [{"week": row["ds"].strftime("%Y-%m-%d"),
               "predicted": round(row["yhat"], 2),
               "lower": round(row["yhat_lower"], 2),
               "upper": round(row["yhat_upper"], 2)}
              for _, row in next4.iterrows()]
    return {
        "forecast_next_30_days": weekly,
        "total_predicted": round(next4["yhat"].sum(), 2),
        "by_category": fore_results
    }
