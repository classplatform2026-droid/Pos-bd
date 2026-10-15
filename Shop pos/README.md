# Shop POS - Multi-Tier Deployment Architecture (Render.com)

এই প্রজেক্টটি ৩টি প্রধান ফোল্ডারে সুবিন্যস্ত করা হয়েছে:

```
Shop pos/
├── owner/      👉 Owner & Cashier POS Frontend (Render Static Site)
├── backend/    👉 Node.js, Express, Socket.IO & MongoDB Web Service + Admin Console (Render Web Service)
├── admin/      👉 Admin Console Frontend Source
└── render.yaml 👉 Render.com 1-Click Blueprint Configuration
```

---

## 🌟 স্থাপত্য ও সংযোগ (How They Connect)

1. **Owner Side Frontend (`Shop pos/owner`)**:
   - এটি Render.com-এ **Static Site** হিসেবে হোস্ট হবে।
   - পরিবেশ ভেরিয়েবল `VITE_API_URL` দিয়ে ব্যাকএন্ডের সাথে যুক্ত থাকে।
   - ক্যাশিয়ার বা দোকানের মালিক সেলস, প্রোডাক্ট, ইনভয়েস এবং পিওএস পরিচালনা করতে পারবেন।
   - ব্যাকএন্ডের সাথে রিয়েল-টাইম WebSockets দিয়ে সিঙ্ক থাকে।

2. **Backend & Admin Site (`Shop pos/backend`)**:
   - এটি Render.com-এ **Web Service** হিসেবে হোস্ট হবে।
   - সব REST API (`/api/*`), Socket.IO এবং MongoDB সংযোগ পরিচালনা করে।
   - অ্যাডমিন প্যানেল এই সার্ভিসের সাথেই প্যাকেজ করা আছে (`/admin` রাউট বা রুট ডোমেইনে)।
   - ২ দিন পর পর স্বয়ংক্রিয়ভাবে অডিট লগ মুছে দেওয়ার ব্যাকগ্রাউন্ড টাস্ক চালু থাকে।

---

## 🚀 Render.com এ ডিপ্লয় করার ২টি পদ্ধতি

### পদ্ধতি ১: Render Blueprint (সবচেয়ে সহজ - ১ ক্লিকে)
1. গিটহাবে রিপোজিটরি পুশ করুন।
2. Render Dashboard-এ গিয়ে **New +** > **Blueprint** চাপুন।
3. আপনার গিটহাব রিপোজিটরি সিলেক্ট করুন।
4. Render নিজে থেকেই `render.yaml` ফাইল রিড করে **Web Service** ও **Static Site** তৈরি করে একে অপরের সাথে কানেক্ট করে দেবে!

---

### পদ্ধতি ২: ম্যানুয়ালি সার্ভিস তৈরি করা

#### ধাপ ১: ব্যাকএন্ড Web Service তৈরি করুন (`Shop pos/backend`)
1. Render-এ **New +** > **Web Service** ক্লিক করুন।
2. সেটিংস দিন:
   - **Name**: `shop-pos-backend`
   - **Root Directory**: `Shop pos/backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npx tsx server.ts`
3. Environment Variables:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `যেকোনো_সিক্রেট_কি`
   - `MONGODB_URI`: `আপনার_mongodb_atlas_uri`
   - `ALLOWED_ORIGINS`: `*`
4. **Create Web Service** চাপুন এবং ডিপ্লয় হওয়ার পর URL টি কপি করুন (যেমন: `https://shop-pos-backend.onrender.com`)।

#### ধাপ ২: ওনার ফ্রন্টএন্ড Static Site তৈরি করুন (`Shop pos/owner`)
1. Render-এ **New +** > **Static Site** ক্লিক করুন।
2. সেটিংস দিন:
   - **Name**: `shop-pos-owner`
   - **Root Directory**: `Shop pos/owner`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Environment Variable যোগ করুন:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://shop-pos-backend.onrender.com` *(ধাপ ১ এ পাওয়া ব্যাকএন্ড URL)*
4. **Create Static Site** চাপুন।

এখন আপনার ওনার ফ্রন্টএন্ড এবং ব্যাকএন্ড/অ্যাডমিন সার্ভিস সম্পূর্ণ সংযুক্ত হয়ে কাজ করবে!
