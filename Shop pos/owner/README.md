# Shop POS - Owner Frontend (Render Static Site)

This is the Owner & Cashier POS Frontend. It is designed to be hosted as a **Static Site** on [Render.com](https://render.com).

---

## 🚀 How to Deploy on Render.com as a Static Site (সহজ গাইড)

1. **GitHub Repository**: Push this folder (or your repository) to GitHub.
2. **Go to Render**: Log in to [dashboard.render.com](https://dashboard.render.com).
3. Click **New +** > **Static Site**.
4. Connect your GitHub repository.
5. Configure the following settings:
   - **Name**: `shop-pos-owner` (or any name you prefer)
   - **Branch**: `main`
   - **Root Directory**: `Shop pos/owner` (if deploying from monorepo, otherwise leave blank)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
6. **Environment Variables**:
   Click **Add Environment Variable**:
   - `VITE_API_URL`: `https://<YOUR-BACKEND-NAME>.onrender.com`
     *(Put the URL of your backend Web Service here without trailing slash)*
7. Click **Create Static Site**.

---

## 🛠 Local Development
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.
