# Deployment Guide

## Architecture

- **Frontend**: Vercel (blog.nimasha.me)
- **Backend**: Render (API)
- **Database**: MongoDB Atlas

---

## Step 1: Deploy Backend to Render

### 1.1 Go to Render Dashboard

1. Visit https://dashboard.render.com/
2. Click **New +** → **Web Service**
3. Connect your GitHub repository: `my-blog-site`

### 1.2 Configure Service

- **Name**: `blog-backend` (or any name you prefer)
- **Region**: Oregon (or closest to you)
- **Branch**: `main`
- **Root Directory**: Leave empty (render.yaml will handle it)
- **Environment**: `Node`
- **Build Command**: `cd backend && npm install && npm run build`
- **Start Command**: `cd backend && npm start`
- **Plan**: Free

### 1.3 Add Environment Variables

Go to **Environment** tab and add:

```
NODE_ENV=production
PORT=3000
MONGO=your_mongodb_connection_string
CLIENT_URL=https://blog.nimasha.me
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
IK_URL_ENDPOINT=your_imagekit_url
IK_PUBLIC_KEY=your_imagekit_public_key
IK_PRIVATE_KEY=your_imagekit_private_key
CLERK_WEBHOOK_SECRET=your_webhook_secret
```

### 1.4 Deploy

Click **Create Web Service** and wait for deployment.

**Your backend URL will be**: `https://blog-backend-xxxx.onrender.com`

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Go to Vercel Dashboard

1. Visit https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Import your GitHub repository: `my-blog-site`

### 2.2 Configure Project

- **Framework Preset**: Vite
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 2.3 Add Environment Variables

```
VITE_API_URL=https://blog-backend-xxxx.onrender.com
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_IK_URL_ENDPOINT=your_imagekit_url
VITE_IK_PUBLIC_KEY=your_imagekit_public_key
```

### 2.4 Deploy

Click **Deploy** and wait for build to complete.

---

## Step 3: Configure Custom Domain

### 3.1 In Vercel

1. Go to your project → **Settings** → **Domains**
2. Add domain: `blog.nimasha.me`
3. Vercel will provide DNS records

### 3.2 In Your Domain Provider

Add these DNS records:

```
Type: CNAME
Name: blog
Value: cname.vercel-dns.com
```

### 3.3 Update Backend CORS

After domain is connected, update `CLIENT_URL` in Render:

```
CLIENT_URL=https://blog.nimasha.me,http://localhost:5173
```

---

## Step 4: Update Clerk Settings

1. Go to Clerk Dashboard
2. Update **Allowed Origins**:
   - Add: `https://blog.nimasha.me`
   - Add: `https://blog-backend-xxxx.onrender.com`
3. Update **Webhook Endpoint**:
   - `https://blog-backend-xxxx.onrender.com/webhooks/clerk`

---

## Step 5: Test Deployment

1. Visit `https://blog.nimasha.me`
2. Test:
   - ✅ Homepage loads
   - ✅ Posts display
   - ✅ Login works
   - ✅ Admin can create posts
   - ✅ Series feature works

---

## Troubleshooting

### Backend Issues

- Check Render logs: Dashboard → Logs
- Verify environment variables are set
- Check MongoDB connection string

### Frontend Issues

- Check Vercel logs: Project → Deployments → View Function Logs
- Verify API URL is correct
- Check browser console for errors

### CORS Issues

If you see CORS errors:

1. Update `CLIENT_URL` in Render to include your Vercel domain
2. Redeploy backend

---

## Useful Commands

### Redeploy Backend

```bash
git push origin main
# Render auto-deploys on push
```

### Redeploy Frontend

```bash
git push origin main
# Vercel auto-deploys on push
```

### View Logs

- **Render**: https://dashboard.render.com/ → Your Service → Logs
- **Vercel**: https://vercel.com/dashboard → Your Project → Deployments

---

## Cost Estimate

- **Vercel**: Free (Hobby plan)
- **Render**: Free (with limitations: spins down after 15min inactivity)
- **MongoDB Atlas**: Free (M0 cluster)
- **Clerk**: Free (up to 10k MAU)
- **ImageKit**: Free (20GB bandwidth/month)

**Total**: $0/month 🎉

---

## Notes

- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Consider upgrading to paid plan ($7/month) for production use
- MongoDB Atlas free tier has 512MB storage limit
