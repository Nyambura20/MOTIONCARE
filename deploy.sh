#!/bin/bash

# MotionCare Cloud Run Deployment Script
# Deploys both frontend and backend to Google Cloud Run

set -e

echo "🚀 MotionCare Deployment to Google Cloud Run"
echo "=============================================="

# Configuration
PROJECT_ID="gen-lang-client-0891331347"
REGION="us-central1"
SERVICE_NAME="motioncare"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if vertex-ai-key.json exists
if [ ! -f "apps/web/vertex-ai-key.json" ]; then
    echo "❌ Error: vertex-ai-key.json not found in apps/web/"
    echo "Please add your Vertex AI service account key"
    exit 1
fi

echo ""
echo "📋 Deployment Configuration:"
echo "  Project ID: ${PROJECT_ID}"
echo "  Region: ${REGION}"
echo "  Service: ${SERVICE_NAME}"
echo "  Image: ${IMAGE_NAME}"
echo ""

# Authenticate with GCloud
echo "🔐 Authenticating with Google Cloud..."
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com \
    aiplatform.googleapis.com

# Build Docker image
echo ""
echo "🐳 Building Docker image..."
gcloud builds submit --tag ${IMAGE_NAME} --timeout=20m

# Deploy to Cloud Run
echo ""
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 1 \
    --timeout 300 \
    --set-env-vars "NODE_ENV=production,VITE_GOOGLE_CLOUD_PROJECT_ID=${PROJECT_ID},VITE_GOOGLE_CLOUD_LOCATION=${REGION}"

# Get the service URL
echo ""
echo "✅ Deployment complete!"
echo ""
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')
echo "🌐 Your application is live at:"
echo "   ${SERVICE_URL}"
echo ""
echo "📊 Monitor your deployment:"
echo "   https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/metrics?project=${PROJECT_ID}"
echo ""
echo "🔍 View logs:"
echo "   gcloud run logs tail ${SERVICE_NAME} --region=${REGION}"
