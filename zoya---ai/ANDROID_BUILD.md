# 📱 Zoya AI - APK aur AAB Banane Ka Sabse Simple Tarika (100% Free & Cloud Build) 🚀

Bhai, aapke liye humne **GitHub Cloud Build (Actions)** ko bilkul upgrade kar diya hai! Ab aapko apne computer par koi Android Studio ya heavy software install karne ki zarurat nahi hai. GitHub ka computer aapke liye automatically APK aur AAB file bana kar dega.

Bas niche diye gaye **5 Simple Steps** ko follow kijiye, aur aapki app ban jayegi!

---

## ☁️ Method 1: GitHub Cloud Build (Sabse Aasan, No Coding Required!)

### Step 1: Project ZIP Download Karein
1. Apne screen ke top-right side me **Settings Icon** (gear icon) par click karein.
2. Wahan **"Export to ZIP"** par click karke poore project ka zip download kar lein.
3. Apne computer par is ZIP file ko **Extract** (unzip) kar lein.

### Step 2: GitHub Par Account Banayein aur Repository Banayein
1. [github.com](https://github.com) par jayein (agar account nahi hai to 1 minute me free account bana lein).
2. Login karne ke baad, top-right me **`+`** icon par click karein aur **"New repository"** select karein.
3. Repository Name me dalein: **`zoya-ai-voice`**
4. Isko **Public** rakhein (taki free build run ho sake).
5. Niche **"Create repository"** button par click kar dein.

### Step 3: Files Ko Upload Karein (Drag & Drop)
1. Repository create hone ke baad aapko ek screen dikhegi. Wahan ek chota sa link hoga: **"uploading an existing file"**. Us par click karein.
2. Ab apne extracted folder ke **sare files aur folders** ko select karein aur drag-and-drop karke upload kar dein.
   * **Note:** Sारे files upload honi chahiye (jaise `.github` folder, `android` folder, `package.json`, `src` folder, etc.).
3. Niche scroll karke green color ke **"Commit changes"** button par click kar dein.

### Step 4: Build Automatically Shuru Hogi! ⚡
1. Files upload hote hi, apne GitHub page par sabse upar **"Actions"** tab par click karein.
2. Wahan aapko **"Build Android APK & AAB"** naam ka workflow run hota hua dikhega (Orange color ka dot ghum raha hoga, iska matlab build chal rahi hai).
3. Isko complete hone me **3 se 5 minutes** lagenge. Dot green checkmark (`✔`) ban jayega.

### Step 5: APK aur AAB Download Karein 🎉
1. Jab build complete (`✔`) ho jaye, to usi build par click karein.
2. Niche scroll karke **"Artifacts"** section me jayein.
3. Wahan aapko do file milegi:
   * 📱 **`ZoyaAI-APK`**: Is par click karke download karein, unzip karein, aur apne phone me install karke chalayein!
   * 📦 **`ZoyaAI-AAB`**: Ye Play Store par upload karne ke liye bundle file hai.

---

## 💻 Method 2: Apne PC Par Build Kaise Karein (Android Studio)

Agar aap local build karna chahte hain, toh ye command run karein:

1. CMD/Terminal me dependencies install karein:
   ```bash
   npm install --legacy-peer-deps
   ```
2. Web build create karein:
   ```bash
   npm run build
   ```
3. Android assets sync karein:
   ```bash
   npx cap sync android
   ```
4. Android Studio open karein:
   ```bash
   npx cap open android
   ```
5. Android Studio me top menu me jayein:
   **Build ➜ Build Bundle(s) / APK(s) ➜ Build APK(s)**. Compile hone ke baad APK aapke phone ke liye ready ho jayegi!

