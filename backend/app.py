import os
import uvicorn
import gradio as gr
from app.main import app as fastapi_app

# Visual status dashboard for users visiting the Space root
with gr.Blocks(title="AirShare Backend API") as demo:
    gr.Markdown("""
    # ✈️ AirShare Cloud Storage Gateway
    **Status:** Active & Ready
    - **Frontend:** [AirShare Web App](https://ashikulislamkhan.github.io/airshare/)
    - **Engine:** Telegram MTProto Zero-Dollar Streaming Storage
    - **Database:** Google Cloud Firestore
    """)

# Mount Gradio onto FastAPI so both API routes and the status page work seamlessly
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
