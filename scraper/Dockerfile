# scraper/Dockerfile

FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash scraper && \
    chown -R scraper:scraper /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Change ownership to scraper user
RUN chown -R scraper:scraper /app

# Create logs directory
RUN mkdir -p /app/logs && chown -R scraper:scraper /app/logs

# Switch to non-root user
USER scraper

# Set environment variables
ENV PYTHONPATH=/app/src
ENV HEADLESS_BROWSER=true
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8080/health', timeout=5)" || exit 1

# Expose health check port (optional, for local testing)
EXPOSE 8080

# Default command
ENTRYPOINT ["python", "-m", "src.main"]
CMD ["scheduled"]