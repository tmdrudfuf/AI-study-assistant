# Test Deployment

## 1. Push the repository

Push the current `main` branch to GitHub.

## 2. Deploy the backend and database on Render

1. Open the Render dashboard.
2. Choose **New > Blueprint**.
3. Connect the `AI-study-assistant` GitHub repository.
4. Render will detect the root `render.yaml`.
5. Enter the requested secret values:
   - `OPENAI_API_KEY`: your OpenAI API key
   - `GOOGLE_CLIENT_ID`: your Google OAuth Web Client ID
   - `CLIENT_URL`: enter a temporary value such as `https://example.com`
6. Create the Blueprint.
7. Copy the deployed API URL, for example:
   `https://ai-study-assistant-api.onrender.com`

The server runs database migrations automatically when it starts.

## 3. Deploy the frontend on Vercel

1. Import the same GitHub repository in Vercel.
2. Set **Root Directory** to `client`.
3. Keep the detected Vite build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add this environment variable:
   - `VITE_API_URL=https://your-render-api.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com`
5. Deploy and copy the Vercel production URL.

## 4. Finish the connection

Return to the Render web service and replace `CLIENT_URL` with the exact
Vercel production URL, without a trailing slash. Then redeploy the service.

## 5. Verify

1. Open `/health` on the Render API and confirm `{"status":"ok"}`.
2. Sign up through the Vercel site.
3. Create a study session.
4. Generate one AI summary.
5. Reload the page and confirm the saved content remains.

## Temporary free-tier notes

- The Render web service can sleep when unused, so its first request may be slow.
- The Render free PostgreSQL database is temporary. Export or migrate the data
  before its free period ends.
- OpenAI API usage is billed separately.
