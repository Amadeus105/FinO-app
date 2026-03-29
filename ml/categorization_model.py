import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import joblib
import warnings
warnings.filterwarnings("ignore")

df = pd.read_csv("../data/personal_finance.csv")
print(f"Dataset shape: {df.shape}")
print(df.head())

df = df[df["Type"] == "Expense"].copy()
df = df.dropna(subset=["Category", "Amount", "Date"])
df["Date"] = pd.to_datetime(df["Date"])
df["month"] = df["Date"].dt.month
df["day"] = df["Date"].dt.day
df["dayofweek"] = df["Date"].dt.dayofweek
df["is_weekend"] = (df["dayofweek"] >= 5).astype(int)
df["quarter"] = df["Date"].dt.quarter
df["amount_log"] = np.log1p(df["Amount"])
df["amount_rounded"] = (df["Amount"] % 10 < 1).astype(int)
df["amount_bin"] = pd.cut(df["Amount"], bins=[0,100,300,600,1000,2000,99999], labels=[0,1,2,3,4,5]).astype(int)
df["desc_word_count"] = df["Transaction Description"].str.split().str.len()
df["desc_length"] = df["Transaction Description"].str.len()

feature_cols = ["Amount","amount_log","amount_rounded","amount_bin","month","day","dayofweek","is_weekend","quarter","desc_word_count","desc_length"]
X = df[feature_cols]
le = LabelEncoder()
y = le.fit_transform(df["Category"])

X_train,X_test,y_train,y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
print(f"Train: {len(X_train)}, Test: {len(X_test)}")

best_acc, best_model, best_name = 0, None, ""
for name, model in {"Random Forest": RandomForestClassifier(n_estimators=200,random_state=42,n_jobs=-1), "Gradient Boosting": GradientBoostingClassifier(n_estimators=200,random_state=42), "Logistic Regression": LogisticRegression(max_iter=1000,random_state=42)}.items():
    model.fit(X_train, y_train)
    acc = accuracy_score(y_test, model.predict(X_test))
    print(f"  {name}: {acc:.4f}")
    if acc > best_acc:
        best_acc, best_model, best_name = acc, model, name

print(f"\nBEST MODEL: {best_name}  Accuracy: {best_acc:.4f}")
from sklearn.metrics import classification_report
print(classification_report(y_test, best_model.predict(X_test), target_names=le.classes_))

joblib.dump(best_model, "categorization_model.pkl")
joblib.dump(le, "label_encoder.pkl")
joblib.dump(feature_cols, "feature_cols.pkl")
print("DONE - files saved")
