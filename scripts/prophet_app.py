"""
아이템 5 — Modal Python Prophet 런타임
DataLab 52주 시계열 데이터 → Prophet 예측

배포:
  pip install modal prophet pandas
  modal token set --token-id $MODAL_TOKEN_ID --token-secret $MODAL_TOKEN_SECRET
  modal deploy scripts/prophet_app.py

배포 후 web endpoint URL → 환경변수 MODAL_PROPHET_URL 에 등록
"""

import modal

app = modal.App("sellfit-prophet")

image = (
    modal.Image.debian_slim()
    .pip_install("prophet==1.1.5", "pandas==2.2.2", "fastapi", "uvicorn")
)

IZSTORY_CATEGORIES = {"압축팩", "다리미판", "화분", "유아매트"}


@app.function(image=image, timeout=60)
@modal.web_endpoint(method="POST")
def predict(body: dict) -> dict:
    """
    Input:
      category: str          # 이지스토리 4개 카테고리 중 하나
      ratios: list[float]    # DataLab 52주 정규화 비율 (0–100)
      horizon: int = 12      # 예측 주수

    Output:
      category, forecast, trend, peak_week, source
    """
    import pandas as pd
    from prophet import Prophet

    category = body.get("category", "")
    ratios = body.get("ratios", [])
    horizon = int(body.get("horizon", 12))

    if category not in IZSTORY_CATEGORIES:
        return {"error": f"unsupported category: {category}"}
    if len(ratios) < 8:
        return {"error": "ratios 최소 8개 필요"}

    # Prophet 데이터프레임 구성
    n = len(ratios)
    # 임의 시작일 (주차 기반이므로 절대날짜 불필요)
    import datetime
    start = datetime.date(2025, 1, 6)  # 2025년 1주차 월요일
    dates = [start + datetime.timedelta(weeks=i) for i in range(n)]

    df = pd.DataFrame({"ds": pd.to_datetime(dates), "y": [float(v) for v in ratios]})

    m = Prophet(
        weekly_seasonality=False,
        daily_seasonality=False,
        yearly_seasonality=True,
        changepoint_prior_scale=0.3,
    )
    m.fit(df)

    future = m.make_future_dataframe(periods=horizon, freq="W")
    forecast_df = m.predict(future)
    fcast = forecast_df["yhat"].tail(horizon).clip(0, 100).round(1).tolist()

    peak_week = int(fcast.index(max(fcast)))
    last4 = ratios[-4:]
    prev4 = ratios[-8:-4]
    avg = lambda x: sum(x) / len(x)
    trend = (
        "rising"  if avg(last4) > avg(prev4) * 1.1 else
        "falling" if avg(last4) < avg(prev4) * 0.9 else
        "stable"
    )

    return {
        "category": category,
        "forecast": fcast,
        "trend": trend,
        "peak_week": peak_week,
        "source": "modal_prophet",
    }
