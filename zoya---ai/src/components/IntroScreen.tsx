import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ArrowRight, Music } from "lucide-react";
import { zoyaLogo } from "../assets/logo";

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [showButton, setShowButton] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);

  useEffect(() => {
    // Show the "Enter" button after 2.5 seconds automatically if they haven't skipped
    const buttonTimer = setTimeout(() => {
      setShowButton(true);
    }, 2500);

    return () => {
      clearTimeout(buttonTimer);
    };
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [timeLeft, onComplete]);

  // Audio chirp on entrance (optional visual feedback)
  return (
    <div className="fixed inset-0 z-[100] bg-[#030307] flex flex-col items-center justify-between overflow-hidden">
      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.45, 0.3],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-600/15 blur-[120px] rounded-full" 
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-violet-500/5 to-transparent blur-3xl rounded-full" />
      </div>

      {/* Decorative futuristic matrix border effects */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-pink-500/30 to-transparent" />

      {/* Main animated orb & branding */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        
        {/* Glowing visualizer ring layers */}
        <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center mb-10">
          
          {/* Outermost pulsing thin border */}
          <motion.div 
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ 
              scale: [1, 1.35, 1], 
              opacity: [0.1, 0.3, 0.1] 
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute inset-0 rounded-full border border-violet-500/30"
          />

          {/* Secondary ripple border */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [1, 1.2, 1], 
              opacity: [0.15, 0.4, 0.15] 
            }}
            transition={{ 
              duration: 2.4, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 0.3
            }}
            className="absolute inset-4 rounded-full border border-pink-500/25"
          />

          {/* Third glowing blur backing */}
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ 
              scale: [1, 1.1, 1], 
              opacity: [0.2, 0.5, 0.2] 
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute inset-8 rounded-full bg-gradient-to-tr from-violet-600/20 to-pink-500/20 blur-xl"
          />

          {/* Main central logo ring */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 100,
              damping: 15,
              duration: 1.2
            }}
            className="relative w-32 h-32 md:w-36 md:h-36 rounded-full p-1 bg-gradient-to-tr from-violet-500 via-pink-500 to-amber-400 shadow-[0_0_40px_rgba(168,85,247,0.5)] flex items-center justify-center"
          >
            <div className="w-full h-full rounded-full bg-[#0a0a14] overflow-hidden flex items-center justify-center p-1.5 border border-white/10">
              <img
                src={zoyaLogo}
                alt="Zoya AI"
                className="w-full h-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Tiny rotating satellite elements */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              className="absolute -inset-1 pointer-events-none"
            >
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_10px_#f472b6]" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_10px_#a78bfa]" />
            </motion.div>
          </motion.div>

        </div>

        {/* Text Area */}
        <div className="text-center space-y-4 max-w-sm px-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
            className="flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-pink-100 to-violet-300">
              ZOYA AI
            </h1>
            <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
          </motion.div>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8, ease: "easeOut" }}
            className="text-sm font-medium tracking-wide text-pink-300/90 font-sans"
          >
            Suno, Bolo, aur Seekho ✨
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1.4, duration: 1 }}
            className="flex items-center justify-center gap-1.5 text-[11px] font-mono tracking-widest text-violet-400/80 uppercase"
          >
            <span>Voice Assistant System</span>
          </motion.div>
        </div>

      </div>

      {/* Footer / Skip or Enter button */}
      <div className="h-28 flex flex-col items-center justify-start z-20 w-full px-6">
        <AnimatePresence>
          {showButton ? (
            <div className="flex flex-col items-center gap-3">
              <motion.button
                key="enter-button"
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                onClick={onComplete}
                className="px-8 py-3.5 bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 rounded-full font-bold tracking-wider text-sm text-white shadow-xl hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/10"
              >
                <span>ENTER ZOYA</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                className="text-[10px] font-mono text-slate-400 tracking-wider"
              >
                Auto-redirect in {timeLeft}s
              </motion.span>
            </div>
          ) : (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-white/40 text-xs font-mono tracking-widest uppercase"
            >
              <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 text-[10px]">Loading... ({timeLeft}s)</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
