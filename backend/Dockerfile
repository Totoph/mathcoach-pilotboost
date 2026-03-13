# 1. Use a specific, stable base image
FROM python:3.12-slim

# 2. Set environment variables to optimize Python for containers
# PYTHONDONTWRITEBYTECODE: Prevents Python from writing .pyc files
# PYTHONUNBUFFERED: Ensures logs are sent straight to the terminal (no buffering)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# 3. Set the working directory
WORKDIR /app

# 4. Install dependencies first (better for build caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of the application code
COPY . .

# 6. Railway uses a dynamic port, but we expose 8000 for local dev
EXPOSE 8000

# 7. Use the "Shell Form" for CMD to correctly interpret the $PORT variable
# This removes the need for ["sh", "-c", ...] which can sometimes swallow signals
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]