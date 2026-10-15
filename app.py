
import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

st.set_page_config(page_title="Attendance Anomaly Detection", layout="wide")
st.title("Student Attendance Anomaly Detection")
st.write("Upload your attendance CSV to detect unusual patterns.")

file = st.file_uploader("Upload CSV", type=["csv"])

if file:
    df = pd.read_csv(file)

    required = ["Student_ID", "Classes_Held", "Classes_Attended"]
    if not all(col in df.columns for col in required):
        st.error("CSV must contain: Student_ID, Classes_Held, Classes_Attended")
    else:
        df["Classes_Held"] = pd.to_numeric(df["Classes_Held"], errors="coerce")
        df["Classes_Attended"] = pd.to_numeric(df["Classes_Attended"], errors="coerce")
        df = df.dropna(subset=required)
        df = df[(df["Classes_Held"] > 0) &
                (df["Classes_Attended"] >= 0) &
                (df["Classes_Attended"] <= df["Classes_Held"])]

        df["Attendance_Percentage"] = (
            df["Classes_Attended"] / df["Classes_Held"] * 100
        )
        df["Absences"] = df["Classes_Held"] - df["Classes_Attended"]

        result = df.groupby("Student_ID").agg(
            Average_Attendance=("Attendance_Percentage", "mean"),
            Attendance_Std=("Attendance_Percentage", "std"),
            Total_Absences=("Absences", "sum"),
            Low_Attendance_Days=(
                "Attendance_Percentage", lambda x: (x < 40).sum()
            )
        ).fillna(0)

        if len(result) < 3:
            st.error("Upload attendance data for at least 3 students.")
        else:
            features = result[
                ["Average_Attendance", "Attendance_Std",
                 "Total_Absences", "Low_Attendance_Days"]
            ]
            scaled = StandardScaler().fit_transform(features)

            model = IsolationForest(
                n_estimators=100, contamination=0.10, random_state=42
            )
            predictions = model.fit_predict(scaled)
            result["Status"] = [
                "Anomaly" if p == -1 else "Normal" for p in predictions
            ]

            a, b, c = st.columns(3)
            a.metric("Total Students", len(result))
            b.metric("Average Attendance",
                     f"{result['Average_Attendance'].mean():.1f}%")
            c.metric("Anomalies Detected",
                     int((result["Status"] == "Anomaly").sum()))

            st.subheader("Attendance Distribution")
            fig, ax = plt.subplots()
            ax.hist(result["Average_Attendance"], bins=10)
            ax.set_xlabel("Average Attendance (%)")
            ax.set_ylabel("Number of Students")
            st.pyplot(fig)
            plt.close(fig)

            st.subheader("Student Analysis Results")
            st.dataframe(result.sort_values("Average_Attendance"),
                         use_container_width=True)

            st.download_button(
                "Download Results CSV",
                result.to_csv().encode("utf-8"),
                "attendance_anomaly_results.csv",
                "text/csv"
            )

            st.info("Anomaly flags indicate unusual patterns and should be reviewed.")
