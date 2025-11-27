# MotionCare Cloud Run Deployment Guide

This guide will help you deploy MotionCare to Google Cloud Run.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
3. **Vertex AI Service Account Key** (`vertex-ai-key.json`)
4. **Project ID**: `gen-lang-client-0891331347` (or your own)

## Quick Deployment

### Option 1: Automated Script (Recommended)

```bash
# Make sure you're in the project root
cd /home/sarah/motion/motioncare

# Run deployment script
./deploy.sh
```

The script will:
- ✅ Build Docker image with frontend + backend
- ✅ Push to Google Container Registry
- ✅ Deploy to Cloud Run
- ✅ Configure environment variables
- ✅ Provide live URL

### Option 2: Manual Deployment

```bash
# 1. Set your project
gcloud config set project gen-lang-client-0891331347

# 2. Build and submit the image
gcloud builds submit --tag gcr.io/gen-lang-client-0891331347/motioncare

# 3. Deploy to Cloud Run
gcloud run deploy motioncare \
  --image gcr.io/gen-lang-client-0891331347/motioncare \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --set-env-vars "NODE_ENV=production,VITE_GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0891331347"
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Google Cloud Run                │
│  ┌───────────────────────────────────┐  │
│  │   Docker Container (Port 8080)    │  │
│  │                                   │  │
│  │  ├─ React Frontend (Static)      │  │
│  │  │  Built with Vite              │  │
│  │  │  Served via Express           │  │
│  │  │                               │  │
│  │  ├─ Express Backend              │  │
│  │  │  └─ Genkit Flows              │  │
│  │  │     ├─ analyzeInjuryFlow      │  │
│  │  │     ├─ chatFlow               │  │
│  │  │     ├─ generateExercisePlan   │  │
│  │  │     └─ analyzeExerciseForm    │  │
│  │  │                               │  │
│  │  └─ Vertex AI Integration        │  │
│  │     ├─ Gemini 2.0 Flash          │  │
│  │     └─ Imagen 3.0                │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           │
           ▼
    Vertex AI APIs
```

## Environment Variables

The following are automatically configured:

- `NODE_ENV=production`
- `PORT=8080` (Cloud Run default)
- `GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json`
- `VITE_GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0891331347`
- `VITE_GOOGLE_CLOUD_LOCATION=us-central1`

## Cost Estimation

**Cloud Run Pricing** (us-central1):
- **CPU**: $0.00002400/vCPU-second
- **Memory**: $0.00000250/GiB-second
- **Requests**: Free for first 2 million requests/month

**Estimated monthly cost for low traffic:**
- ~$0-5/month (within free tier)
- Scales to zero when not in use

**Vertex AI Pricing:**
- **Gemini 2.0 Flash**: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- **Imagen 3.0**: $0.02 per image

## Post-Deployment

### 1. Get Your Live URL
```bash
gcloud run services describe motioncare \
  --region=us-central1 \
  --format='value(status.url)'
```

### 2. View Logs
```bash
gcloud run logs tail motioncare --region=us-central1
```

### 3. Monitor Performance
Visit: https://console.cloud.google.com/run/detail/us-central1/motioncare/metrics

### 4. Update Deployment
```bash
# After making changes
./deploy.sh
```

## Troubleshooting

### Build Fails
```bash
# Check Cloud Build logs
gcloud builds list --limit=5
```

### Service Won't Start
```bash
# Check logs
gcloud run logs read motioncare --region=us-central1 --limit=50
```

### Vertex AI Authentication Error
- Ensure `vertex-ai-key.json` is in `apps/web/` directory
- Verify service account has Vertex AI permissions:
  - Vertex AI User
  - Cloud Run Admin

### CORS Issues
- Cloud Run URL is automatically allowed in CORS
- Frontend API calls use relative URLs in production

## Security Notes

1. **Service Account Key**: Never commit `vertex-ai-key.json` to Git
2. **Environment Variables**: Sensitive data should use Secret Manager
3. **Authentication**: Add Firebase Auth or similar for production
4. **Rate Limiting**: Consider adding rate limits for API endpoints

## Advanced Configuration

### Custom Domain
```bash
gcloud run domain-mappings create \
  --service motioncare \
  --domain your-domain.com \
  --region us-central1
```

### Increase Resources
```bash
gcloud run services update motioncare \
  --memory 2Gi \
  --cpu 2 \
  --region us-central1
```

### Enable CDN
```bash
# Set up Cloud CDN for faster global access
gcloud compute backend-services update motioncare-backend \
  --enable-cdn
```

## Support

- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Vertex AI Docs**: https://cloud.google.com/vertex-ai/docs
- **Genkit Docs**: https://firebase.google.com/docs/genkit

---

**Need help?** Check the main README.md for local development setup.
