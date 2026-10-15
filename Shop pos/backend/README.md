# Shop POS - Backend & Admin Web Service (Render.com)

This is the Node.js/Express Web Service that powers:
1. **API Endpoints**: `/api/auth`, `/api/products`, `/api/sales`, `/api/admin`, etc.
2. **Realtime WebSockets**: Socket.IO for live inventory, sale events, and synchronization.
3. **Admin Console**: Hosted and served directly from this service at `/admin` (and root `/`).
4. **Automated 2-Day Audit Purge**: Periodic cleanup running every hour to keep database lightweight.

---

## 🚀 How to Deploy on Render.com as a Web Service (সহজ গাইড)

1. **Log in to Render**: Go to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Set the following configuration:
   - **Name**: `shop-pos-backend` (or any name you choose)
   - **Environment**: `Node`
   - **Region**: Singapore (or nearest to Bangladesh / your users)
   - **Branch**: `main`
   - **Root Directory**: `Shop pos/backend` (if deploying from monorepo, otherwise leave blank)
   - **Build Command**: `npm install`
   - **Start Command**: `npx tsx server.ts` (or `npm start`)
5. **Environment Variables**:
   Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: *(A random secure string)*
   - `MONGODB_URI`: *(Your MongoDB Atlas connection URI)*
   - `ALLOWED_ORIGINS`: `*` (or your Owner static site URL, e.g. `https://shop-pos-owner.onrender.com`)
6. Click **Create Web Service**.
7. Once deployed, note your service URL (e.g. `https://shop-pos-backend.onrender.com`).
   - Visiting `https://shop-pos-backend.onrender.com/admin` opens the **Admin Panel**.
   - Copy this URL and set it as `VITE_API_URL` in the Owner frontend static site!

---

## 🛠 Local Development
```bash
npm install
npm run dev
```
Server will start on `http://localhost:10000` (or `PORT` specified in `.env`).
