import React, { useState } from "react";
import { User, LogOut, Loader2, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { zoyaLogo } from "../assets/logo";
import { saveUserProfile, logout } from "../services/firebaseService";

interface DetailFillupPageProps {
  userId: string;
  email: string;
  defaultName: string;
  onComplete: (profile: { uid: string; name: string; age: number; email: string }) => void;
}

export default function DetailFillupPage({ userId, email, defaultName, onComplete }: DetailFillupPageProps) {
  const [name, setName] = useState(defaultName || "");
  const [ageText, setAgeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Kripya apna naam bharein (Please enter your name)");
      return;
    }

    const parsedAge = parseInt(ageText, 10);
    if (isNaN(parsedAge) || parsedAge <= 0) {
      setError("Kripya ek sahi umar darj karein (Please enter a valid age)");
      return;
    }

    if (parsedAge < 16) {
      setError("Zoya AI ka upyog karne ke liye aapki umar kam se kam 16 saal honi chahiye (You must be at least 16 years old to use Zoya AI)");
      return;
    }

    if (parsedAge > 120) {
      setError("Kripya sahi umar darj karein (Please enter a realistic age)");
      return;
    }

    setIsSubmitting(true);
    try {
      await saveUserProfile(userId, trimmedName, parsedAge, email);
      onComplete({
        uid: userId,
        name: trimmedName,
        age: parsedAge,
        email: email,
      });
    } catch (err: any) {
      console.error("Failed to save user profile:", err);
      setError("Profile save karne me samasya aayi. Kripya fir se koshish karein.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans relative overflow-hidden m-0 p-0">
      {/* Background Cinematic Gradients */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-900/15 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0d0d12]/90 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative"
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img
              src={zoyaLogo}
              alt="Zoya Logo"
              style={{ height: "64px", width: "64px" }}
              className="rounded-full object-cover border border-white/20 shadow-lg mb-4"
              referrerPolicy="no-referrer"
            />
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent font-sans">
              Apni Details Bharein
            </h2>
            <p className="text-xs text-white/50 text-center mt-2 font-sans">
              Zoya AI use karne se pehle kripya apna naam aur umar batayein
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 block uppercase tracking-wider">
                Display Name (Aapka Naam)
              </label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-4 text-white/40" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jaise: Rahul Sharma"
                  className="w-full pl-11 pr-4 py-3.5 bg-white/5 hover:bg-white/[0.08] focus:bg-white/[0.08] border border-white/10 focus:border-violet-500/50 rounded-2xl text-white placeholder-white/30 text-sm outline-none transition-all"
                  maxLength={100}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Age Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 block uppercase tracking-wider">
                Age (Umar) - Minimum 16
              </label>
              <div className="relative flex items-center">
                <Calendar size={16} className="absolute left-4 text-white/40" />
                <input
                  type="number"
                  value={ageText}
                  onChange={(e) => setAgeText(e.target.value)}
                  placeholder="Jaise: 21"
                  className="w-full pl-11 pr-4 py-3.5 bg-white/5 hover:bg-white/[0.08] focus:bg-white/[0.08] border border-white/10 focus:border-violet-500/50 rounded-2xl text-white placeholder-white/30 text-sm outline-none transition-all"
                  min="1"
                  max="120"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400"
              >
                <span className="mt-0.5">⚠️</span>
                <span className="font-sans leading-relaxed">{error}</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-4 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-semibold rounded-2xl text-sm transition-all shadow-lg hover:shadow-violet-500/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Aapka Profile Save Ho Raha Hai...</span>
                </>
              ) : (
                <span>Submit Details</span>
              )}
            </button>
          </form>

          {/* Sign Out Button */}
          <div className="mt-6 pt-4 border-t border-white/5 flex justify-center">
            <button
              onClick={handleSignOut}
              className="text-xs text-white/40 hover:text-white flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
