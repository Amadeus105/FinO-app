import pandas as pd
import numpy as np
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib
import warnings
warnings.filterwarnings("ignore")

df = pd.read_csv("../data/personal_finance.csv")
df = df[df["Type"] == "Expense"].copy()
df["Date"] = pd.to_datetime(df["Date"])

weekly = df.groupby(pd.Grouper(key="Date", freq="W"))["Amount"].sum().reset_index()
weekly.columns = ["ds", "y"]
weekly = weekly[weekly["y"] > 0].sort_values("ds").reset_index(drop=True)

print(f"Total WEEKS: {len(weekly)}")
print(f"Avg weekly spend: {weekly['y'].mean():.2f}")

test_weeks = 8
train_df = weekly[:-test_weeks]
test_df  = weekly[-test_weeks:]
print(f"Train: {len(train_df)} weeks, Test: {len(test_df)} weeks")

model = Prophet(yearly_seasonality=True, weekly_seasonality=False,
                daily_seasonality=False, changepoint_prior_scale=0.1,
                interval_width=0.8)
model.fit(train_df)
print("Prophet trained")

future   = model.make_future_dataframe(periods=4, freq="W")
forecast = model.predict(future)

fc_test = forecast[["ds","yhat","yhat_lower","yhat_upper"]].tail(test_weeks).merge(test_df, on="ds", how="inner")
fc_test["yhat"] = fc_test["yhat"].clip(lower=0)
mae  = mean_absolute_error(fc_test["y"], fc_test["yhat"])
rmse = np.sqrt(mean_squared_error(fc_test["y"], fc_test["yhat"]))
mape = (abs(fc_test["y"] - fc_test["yhat"]) / fc_test["y"].replace(0,np.nan)).mean() * 100

print(f"\nMAE:  {mae:.2f}")
print(f"RMSE: {rmse:.2f}")
print(f"MAPE: {mape:.2f}%")

next4 = forecast[["ds","yhat","yhat_lower","yhat_upper"]].tail(4).copy()
next4[["yhat","yhat_lower","yhat_upper"]] = next4[["yhat","yhat_lower","yhat_upper"]].clip(lower=0)
for _, row in next4.iterrows():
    print(f"  {row['ds'].date()}  ${row['yhat']:.2f}  (${row['yhat_lower']:.2f} - ${row['yhat_upper']:.2f})")
print(f"Total next 30 days: ${next4['yhat'].sum():.2f}")

print("\nPER-CATEGORY:")
category_forecasts = {}
for cat in df["Category"].unique():
    cw = df[df["Category"]==cat].groupby(pd.Grouper(key="Date",freq="W"))["Amount"].sum().reset_index()
    cw.columns = ["ds","y"]
    cw = cw[cw["y"]>0]
    if len(cw) < 20:
        continue
    m = Prophet(yearly_seasonality=True, weekly_seasonality=False,
                daily_seasonality=False, changepoint_prior_scale=0.1)
    m.fit(cw)
    fc = m.predict(m.make_future_dataframe(periods=4, freq="W"))
    predicted = round(fc["yhat"].tail(4).clip(lower=0).sum(), 2)
    category_forecasts[cat] = predicted
    print(f"  {cat:<20} ${predicted:.2f}")

joblib.dump(model, "forecasting_model.pkl")
joblib.dump(category_forecasts, "forecasting_model_results.pkl")
print("\nSaved. DONE")
