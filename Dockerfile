FROM node:18-slim

# Install Python 3 and pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (into a venv so pip doesn't complain)
COPY ingestion/requirements.txt /app/ingestion/requirements.txt
RUN python3 -m venv /app/venv && \
    /app/venv/bin/pip install --no-cache-dir -r /app/ingestion/requirements.txt

# Make the venv's python3 the default
ENV PATH="/app/venv/bin:$PATH"

# Install Node dependencies and build backend
COPY backend/package.json backend/package-lock.json* /app/backend/
RUN cd /app/backend && npm install

COPY backend/ /app/backend/
RUN cd /app/backend && npm run build

# Copy ingestion scripts (used at runtime by the backend)
COPY ingestion/ /app/ingestion/

EXPOSE 3001

CMD ["node", "/app/backend/dist/server.js"]
