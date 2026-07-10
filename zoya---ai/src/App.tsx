import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, LogIn, LogOut, Cloud, Camera, CameraOff, ExternalLink, AlertCircle, Menu, Sparkles } from "lucide-react";
import { getZoyaAudio, resetZoyaSession } from "./services/geminiService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import { playPCM } from "./utils/audioUtils";
import { motion, AnimatePresence } from "motion/react";
import { User, onAuthStateChanged } from "firebase/auth";
import { zoyaLogo } from "./assets/logo";
import LoginPage from "./components/LoginPage";
import DetailFillupPage from "./components/DetailFillupPage";
import MenuDrawer from "./components/MenuDrawer";
import IntroScreen from "./components/IntroScreen";
import {
  auth,
  signInWithGoogle,
  logout,
  createSession,
  addMessageToSession,
  getSessionsForUser,
  subscribeToMessages,
  getUserProfile,
} from "./services/firebaseService";

type AppState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  text: string;
  sources?: { title: string; uri: string }[];
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [appState, setAppState] = useState<AppState>("idle");
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [isProfileChecking, setIsProfileChecking] = useState<boolean>(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("zoya_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [];
  });
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("zoya_chat_history", JSON.stringify(messages));
  }, [messages]);

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
    }
  }, [isMuted]);

  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Firebase Auth and Session States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Iframe & Camera Error States
  const [isIframe, setIsIframe] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  // Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // Clear click timeout and release camera on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Custom click handler to distinguish single-tap and double-tap
  const handleCameraClick = () => {
    if (clickTimeoutRef.current) {
      // Double click / tap detected!
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      
      // Double tap: Back Camera toggle
      if (isCameraActive && cameraFacingMode === "environment") {
        setIsCameraActive(false);
      } else {
        setCameraFacingMode("environment");
        setIsCameraActive(true);
      }
    } else {
      // Possible single click / tap. Wait a brief moment.
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        
        // Single tap: Front Camera toggle
        if (isCameraActive && cameraFacingMode === "user") {
          setIsCameraActive(false);
        } else {
          setCameraFacingMode("user");
          setIsCameraActive(true);
        }
      }, 250); // 250ms is perfect for mobile and desktop taps
    }
  };

  // Helper to safely stop any active camera tracks
  const stopCamera = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error("Error stopping track:", e);
        }
      });
      activeStreamRef.current = null;
    }
    setCameraStream(null);
  }, []);

  // Handle camera stream lifecycle
  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      // Always stop existing stream first to completely release camera hardware
      stopCamera();
      setCameraError(null);

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: cameraFacingMode === "user" ? "user" : { ideal: "environment" },
            width: { ideal: 640 },
            height: { ideal: 640 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        activeStreamRef.current = stream;
        setCameraStream(stream);
      } catch (err: any) {
        console.error("Failed to access camera in mode " + cameraFacingMode + ":", err);
        if (isMounted) {
          setIsCameraActive(false);
          let userFriendlyError = "Camera access nahi mila! Kripya check karein ki camera physically connected aur active hai ya nahi.";
          if (window.self !== window.top) {
            userFriendlyError = "Chrome/Safari me Iframe security restrictions ki wajah se active camera block ho sakta hai. Kripya upar right side me diye 'Naye Tab Me Kholen' button ka use karein!";
          } else if (err?.name === "NotAllowedError" || err?.message?.includes("denied")) {
            userFriendlyError = "Camera permissions blocked hain! Kripya browser search/address bar me left side me standard lock icon 🔒 click karke 'Camera: Allow' select karein.";
          } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
            userFriendlyError = "Aapka background/front camera hardware detect nahi hua ya camera busy hai.";
          }
          setCameraError(userFriendlyError);
        }
      }
    }

    if (isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      isMounted = false;
    };
  }, [isCameraActive, cameraFacingMode, stopCamera]);

  // Connect stream to video element when stream or videoRef is ready
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsSyncing(true);
        setIsProfileChecking(true);
        try {
          // Retrieve user profile
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);

          const sessions = await getSessionsForUser();
          let activeSessionId = "";
          if (sessions.length > 0) {
            activeSessionId = sessions[0].id;
          } else {
            activeSessionId = "session_" + Date.now().toString();
            await createSession(activeSessionId, "Zoya AI Voice Session");
          }
          setCurrentSessionId(activeSessionId);
        } catch (error) {
          console.error("Error setting up Firebase session:", error);
        } finally {
          setIsSyncing(false);
          setIsProfileChecking(false);
          setIsAuthLoading(false);
        }
      } else {
        setCurrentSessionId(null);
        setUserProfile(null);
        setIsProfileChecking(false);
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Messages from Firestore when session is active
  useEffect(() => {
    if (currentUser && currentSessionId) {
      const unsubscribe = subscribeToMessages(currentSessionId, (firestoreMessages) => {
        const mapped = firestoreMessages.map((m: any) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          sources: m.sources,
        }));
        setMessages(mapped);
      });
      return () => unsubscribe?.();
    }
  }, [currentUser, currentSessionId]);

  // Handle User Login
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error("Google login failed", e);
    }
  };

  // Handle User Logout
  const handleLogout = async () => {
    try {
      await logout();
      setMessages([]);
      localStorage.removeItem("zoya_chat_history");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };


  // Core callback to save messages locally and to Firebase Firestore
  const saveMessage = useCallback(async (sender: "user" | "zoya", text: string) => {
    const id = Date.now().toString() + "-" + sender;
    // Optimistic UI update
    setMessages((prev) => [...prev, { id, sender, text }]);

    if (auth.currentUser && currentSessionId) {
      try {
        await addMessageToSession(currentSessionId, id, sender, text);
      } catch (err) {
        console.error("Failed to save message to Firebase:", err);
      }
    }
  }, [currentSessionId]);

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetZoyaSession();
    } else {
      try {
        setIsSessionActive(true);
        resetZoyaSession();
        
        const session = new LiveSessionManager();
        session.isMuted = isMuted;
        liveSessionRef.current = session;
        
        session.onStateChange = (state) => {
          setAppState(state);
        };
        
        session.onMessage = (sender, text) => {
          saveMessage(sender, text);
        };
        
        session.onCommand = (url) => {
          setTimeout(() => {
            window.open(url, "_blank");
          }, 1000);
        };

        await session.start();
      } catch (e) {
        console.error("Failed to start session", e);
        setShowPermissionModal(true);
        setIsSessionActive(false);
        setAppState("idle");
      }
    }
  };
  
  if (showIntro) {
    return <IntroScreen onComplete={() => setShowIntro(false)} />;
  }

  if (isAuthLoading || (currentUser && isProfileChecking)) {
    return (
      <div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans relative overflow-hidden m-0 p-0">
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-900/20 blur-[120px] rounded-full" />
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="relative z-10"
        >
          <Loader2 size={40} className="text-violet-500 animate-pulse" />
        </motion.div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  if (!userProfile) {
    return (
      <DetailFillupPage
        userId={currentUser.uid}
        email={currentUser.email || ""}
        defaultName={currentUser.displayName || ""}
        onComplete={(profile) => setUserProfile(profile)}
      />
    );
  }

  return (
    <div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col items-center justify-between font-sans relative overflow-hidden m-0 p-0">
      {showPermissionModal && (
        <PermissionModal 
          onClose={() => setShowPermissionModal(false)} 
        />
      )}

      {/* Cinematic Background Gradients */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-900/20 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full flex justify-between items-center z-20 shrink-0 px-6 py-4 md:px-12 md:py-6 gap-4">
        <div style={{ color: "#a32222", fontSize: "25px" }} className="flex items-center gap-3">
          <img
            src={zoyaLogo}
            alt="Zoya Logo"
            style={{ height: "44px", width: "44px" }}
            className="rounded-full object-cover border border-white/20 shadow-lg"
            referrerPolicy="no-referrer"
          />
          <h1 
            style={{ fontFamily: "system-ui", fontWeight: "bold", fontStyle: "normal", textDecorationLine: "none" }}
            className="text-[21px] text-white text-right leading-[27px] border-[#e1e1e1] tracking-wide opacity-90"
          >
            Zoya AI
          </h1>
        </div>
        
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Menu Button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full p-2 px-4 backdrop-blur-md transition-all cursor-pointer text-white hover:border-white/20"
            title="Menu Options"
          >
            <Menu size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">Menu</span>
          </button>
        </div>
      </header>


      {/* Camera Access Error Alert */}
      <AnimatePresence>
        {cameraError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-[#0d0d12]/95 border border-red-500/30 p-6 rounded-3xl shadow-2xl relative"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                  <AlertCircle className="text-red-400" size={20} />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-base font-bold font-sans text-red-200">Camera Permission / Connection Issue</h3>
                    <p className="text-xs text-white/70 leading-relaxed font-sans mt-1">
                      {cameraError}
                    </p>
                  </div>
                  
                  {isIframe && (
                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        onClick={() => {
                          window.open(window.location.href, "_blank");
                          setCameraError(null);
                        }}
                        className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 text-xs transition-all shadow-md cursor-pointer border border-white/10"
                      >
                        <ExternalLink size={14} />
                        <span>Naye Tab Me Kholen Aur Camera Use Karein</span>
                      </button>
                    </div>
                  )}

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => setCameraError(null)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-semibold text-xs cursor-pointer transition-colors"
                    >
                      Band Karein (Close)
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content - Visualizer */}
      <main className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <Visualizer state={appState} />
      </main>

      {/* Floating Circular Live Camera Feed */}
      <AnimatePresence>
        {isCameraActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50 }}
            className="absolute bottom-28 right-6 md:right-12 w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-violet-500/80 shadow-2xl shadow-violet-500/30 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm group pointer-events-auto"
          >
            {/* Camera Scanlines/HUD overlay */}
            <div className="absolute inset-0 border border-violet-400/30 rounded-full animate-pulse pointer-events-none" />
            <div className="absolute inset-2 border border-dashed border-pink-500/20 rounded-full animate-spin pointer-events-none" style={{ animationDuration: "15s" }} />
            
            {/* Camera Type Indicator */}
            <div className="absolute top-2 px-2 py-0.5 rounded-full bg-black/75 border border-white/10 text-[8px] font-mono tracking-widest text-violet-300 pointer-events-none uppercase z-10 select-none">
              {cameraFacingMode === "user" ? "Front" : "Back"}
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover rounded-full ${
                cameraFacingMode === "user" ? "scale-x-[-1]" : "scale-x-1"
              }`}
            />
            
            {/* Quick Mute or Close HUD button inside bubble */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 rounded-full">
              <button
                onClick={() => setIsCameraActive(false)}
                className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 hover:scale-110 active:scale-95 transition-all shadow-md cursor-pointer"
                title="Turn off Camera"
              >
                <CameraOff size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Controls Footer */}
      <footer 
        style={{ fontWeight: "bold", textAlign: "center", fontSize: "16px", textDecorationLine: "none" }}
        className="absolute bottom-10 md:bottom-16 left-0 w-full flex flex-col items-center justify-center z-20 shrink-0 gap-3 pointer-events-none"
      >
        {/* Status Indicator Row above buttons */}
        <div className="h-10 flex items-center justify-center pointer-events-auto">
          <AnimatePresence mode="wait">
            {appState === "listening" && (
              <motion.div
                key="listening"
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 text-xs font-medium font-mono backdrop-blur-md shadow-lg"
              >
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span>Listening...</span>
              </motion.div>
            )}
            {appState === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-300 text-xs font-medium font-mono backdrop-blur-md shadow-lg"
              >
                <Loader2 size={12} className="animate-spin text-cyan-400" />
                <span>Replying...</span>
              </motion.div>
            )}
            {appState === "speaking" && (
              <motion.div
                key="speaking"
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-300 text-xs font-medium font-mono backdrop-blur-md shadow-lg"
              >
                <div className="flex gap-0.5 items-center justify-center h-2.5">
                  <span className="w-0.5 h-1.5 bg-pink-400 rounded-full animate-pulse" />
                  <span className="w-0.5 h-2.5 bg-pink-400 rounded-full animate-pulse" />
                  <span className="w-0.5 h-2 bg-pink-400 rounded-full animate-pulse" />
                </div>
                <span>Zoya Speaking...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-4 pointer-events-auto">
          <button
            onClick={toggleListening}
            style={{ 
              lineHeight: "29px",
              backgroundColor: "#ff0000",
              fontSize: "18px",
              paddingTop: "8px",
              paddingBottom: "10px"
            }}
            className={`
              group relative flex items-center gap-3 px-8 rounded-full font-medium tracking-wide transition-all duration-300 shadow-2xl text-white border border-red-600 hover:opacity-90 hover:scale-105
            `}
          >
            {isSessionActive ? (
              <>
                <MicOff size={20} style={{ fontFamily: "system-ui" }} />
                <span className="font-bold">End Session</span>
              </>
            ) : (
              <>
                <Mic size={20} className="group-hover:animate-bounce" style={{ fontFamily: "system-ui" }} />
                <span className="font-bold">Start Session</span>
              </>
            )}
          </button>
        </div>
      </footer>

      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentUserProfile={userProfile}
        onProfileUpdate={(updated) => setUserProfile((prev: any) => prev ? { ...prev, ...updated } : null)}
        onSignOut={handleLogout}
        currentSessionId={currentSessionId}
        onSelectSession={(sessionId) => setCurrentSessionId(sessionId)}
      />
    </div>
  );
}
