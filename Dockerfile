FROM python:3.12-slim

# Don't buffer Python output, don't write .pyc files
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Set working directory
WORKDIR /app

# Install system dependencies including curl for healthcheck
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire application
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Expose port
EXPOSE 5000

# Health check hitting your Flask endpoint
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Use gunicorn for production, loading app from wsgi.py
CMD ["gunicorn",
     "--bind", "0.0.0.0:5000",
     "--workers", "4",
     "--timeout", "120",
     "--access-logfile", "-",
     "--error-logfile", "-",
     "wsgi:app"]
