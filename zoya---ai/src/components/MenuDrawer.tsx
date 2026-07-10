import React, { useState, useEffect } from "react";
import { User, LogOut, ShieldCheck, X, ChevronRight, Check, Loader2, ArrowLeft, Menu, History, Trash2, Plus, MessageSquare, ExternalLink, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { updateUserProfile, getSessionsForUser, deleteSession, createSession } from "../services/firebaseService";
import AdBanner160x300 from "./AdBanner160x300";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: { uid: string; name: string; age: number; email: string } | null;
  onProfileUpdate: (updated: { name: string; age: number }) => void;
  onSignOut: () => void;
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

type DrawerScreen = "menu" | "profile" | "privacy" | "history";

export default function MenuDrawer({
  isOpen,
  onClose,
  currentUserProfile,
  onProfileUpdate,
  onSignOut,
  currentSessionId,
  onSelectSession,
}: MenuDrawerProps) {
  const [screen, setScreen] = useState<DrawerScreen>("menu");
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  // Profile edit form state
  const [editName, setEditName] = useState(currentUserProfile?.name || "");
  const [editAge, setEditAge] = useState(currentUserProfile?.age?.toString() || "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load sessions from Firestore
  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const userSessions = await getSessionsForUser();
      setSessions(userSessions);
    } catch (err) {
      console.error("Error loading voice history:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Delete session from Firestore and handle active session replacement
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent choosing/closing click
    if (!confirm("Kya aap is voice history session ko mitaana chahte hain? (Do you want to delete this session?)")) {
      return;
    }
    try {
      await deleteSession(sessionId);
      const updatedSessions = sessions.filter((s) => s.id !== sessionId);
      setSessions(updatedSessions);
      
      if (sessionId === currentSessionId) {
        if (updatedSessions.length > 0) {
          onSelectSession(updatedSessions[0].id);
        } else {
          const newSessionId = "session_" + Date.now().toString();
          await createSession(newSessionId, "Zoya AI Voice Session");
          onSelectSession(newSessionId);
          const freshSessions = await getSessionsForUser();
          setSessions(freshSessions);
        }
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  // Create/start a new voice conversation session
  const handleCreateNewSession = async () => {
    setIsCreatingSession(true);
    try {
      const newSessionId = "session_" + Date.now().toString();
      await createSession(newSessionId, "Zoya AI Voice Session " + (sessions.length + 1));
      onSelectSession(newSessionId);
      const freshSessions = await getSessionsForUser();
      setSessions(freshSessions);
      onClose(); // Close the menu drawer so they can talk on the new session immediately!
    } catch (err) {
      console.error("Error creating session:", err);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Sync sessions when opening or changing screen
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    } else {
      setScreen("menu"); // reset screen on close
    }
  }, [isOpen]);

  // Initialize edit fields when opening profile
  const handleOpenProfile = () => {
    setEditName(currentUserProfile?.name || "");
    setEditAge(currentUserProfile?.age?.toString() || "");
    setError(null);
    setSuccess(false);
    setScreen("profile");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!currentUserProfile) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setError("Naam khali nahi ho sakta (Name cannot be empty)");
      return;
    }

    const parsedAge = parseInt(editAge, 10);
    if (isNaN(parsedAge) || parsedAge <= 0) {
      setError("Kripya sahi umar darj karein (Please enter a valid age)");
      return;
    }

    if (parsedAge < 16) {
      setError("Umar kam se kam 16 saal honi chahiye (Age must be at least 16 years)");
      return;
    }

    setIsUpdating(true);
    try {
      await updateUserProfile(currentUserProfile.uid, trimmedName, parsedAge);
      onProfileUpdate({ name: trimmedName, age: parsedAge });
      setSuccess(true);
      setTimeout(() => {
        setScreen("menu");
        setSuccess(false);
      }, 1000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Profile update karne me error aaya. Kripya fir se koshish karein.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40 cursor-pointer"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[380px] bg-[#09090e]/95 border-l border-white/10 z-50 shadow-2xl backdrop-blur-2xl flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <div className="flex items-center gap-2">
                {screen !== "menu" && (
                  <button
                    onClick={() => setScreen("menu")}
                    className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors cursor-pointer mr-1"
                    title="Back"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <h3 className="text-base font-bold font-sans tracking-wide text-white">
                  {screen === "menu" && "Zoya AI"}
                  {screen === "profile" && "Edit Profile"}
                  {screen === "privacy" && "Privacy Policy"}
                  {screen === "history" && "Voice History"}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {screen === "menu" && (
                <div className="space-y-4">
                  {/* Profile info block */}
                  {currentUserProfile && (
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20 text-violet-400">
                          <User size={20} />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-sm font-semibold truncate text-white">{currentUserProfile.name}</h4>
                          <p className="text-[11px] text-white/40 truncate font-mono mt-0.5">{currentUserProfile.email}</p>
                          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-white/5 rounded-full border border-white/5 text-white/60 font-mono">
                            Age: {currentUserProfile.age}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* List Options */}
                  <div className="space-y-1">
                    <button
                      onClick={handleOpenProfile}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <User size={18} className="text-violet-400" />
                        <span className="text-sm font-medium text-white/90">My Profile Settings</span>
                      </div>
                      <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
                    </button>

                    <button
                      onClick={() => setScreen("privacy")}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={18} className="text-pink-400" />
                        <span className="text-sm font-medium text-white/90">Privacy Policy (Nijta)</span>
                      </div>
                      <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
                    </button>

                    {/* Smartlink Promotional Placement */}
                    <a
                      href="https://www.effectivecpmnetwork.com/b0w56gfbrh?key=533e22b2b8a29fd10e733756c2c60aa6"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-violet-600/10 via-pink-600/10 to-amber-500/10 hover:from-violet-600/15 hover:via-pink-600/15 hover:to-amber-500/15 border border-violet-500/20 hover:border-violet-500/40 transition-all group cursor-pointer text-left block mb-2"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles size={18} className="text-amber-400 animate-pulse shrink-0" />
                        <div>
                          <span className="text-sm font-bold bg-gradient-to-r from-amber-200 via-pink-200 to-violet-200 bg-clip-text text-transparent block">Zoya's Special Offer</span>
                          <span className="text-[10px] text-white/50 block mt-0.5">Click to check out premium offers</span>
                        </div>
                      </div>
                      <ExternalLink size={15} className="text-white/40 group-hover:text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                    </a>

                    {/* Banner 160x300 */}
                    <div className="pt-2 pb-4 border-t border-white/5">
                      <AdBanner160x300 />
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Edit Screen */}
              {screen === "profile" && (
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/60 block uppercase tracking-wider font-sans">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-violet-500/50 transition-all font-sans"
                      maxLength={100}
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/60 block uppercase tracking-wider font-sans">
                      Age (Umar)
                    </label>
                    <input
                      type="number"
                      value={editAge}
                      onChange={(e) => setEditAge(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-violet-500/50 transition-all font-sans"
                      min="1"
                      max="120"
                      disabled={isUpdating}
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 leading-relaxed font-sans">
                      ⚠️ {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2 font-sans">
                      <Check size={14} />
                      <span>Profile updated successfully!</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isUpdating || success}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Save Profile Changes</span>
                    )}
                  </button>
                </form>
              )}

              {/* Privacy Policy Screen */}
              {screen === "privacy" && (
                <div className="space-y-6 text-xs text-white/70 leading-relaxed font-sans pb-4">
                  <div className="p-3.5 bg-pink-500/5 border border-pink-500/10 rounded-2xl mb-2 text-center">
                    <p className="text-pink-300 font-medium text-[11px]">
                      🔒 Humari Prathmikta Aapki Suraksha Hai. Hum aapka data kisi ke sath share nahi karte.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-pink-500 rounded-full inline-block"></span>
                      1. Introduction (Humara Sankalp)
                    </h4>
                    <p>
                      Zoya AI Voice Assistant is committed to protecting your personal data and privacy. Hum aapke data ko bilkul surakshit rakhte hain. This comprehensive policy explains what data we collect, how it's securely stored in Google Firebase Firestore, and the strict rules governing its use.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-pink-500 rounded-full inline-block"></span>
                      2. Data We Collect (Kya Data Collect Hota Hai)
                    </h4>
                    <div className="space-y-3 mt-1.5 pl-1.5">
                      <p>
                        <strong>A. Account & Profile Info:</strong> When you login with Google, we get your email, name, and profile picture. We also save the Age (Umar) you enter so we can verify access.
                      </p>
                      <p>
                        <strong>B. Real-Time Audio (Awaaz):</strong> Your microphone voice recordings are used live on your device to transcribe speech. The raw audio recordings are processed transiently and are NOT saved or stored permanently on any server.
                      </p>
                      <p>
                        <strong>C. Conversational Chat History:</strong> The conversations and messages you type or speak with Zoya AI are saved under your private account so you can review your history.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-pink-500 rounded-full inline-block"></span>
                      3. How We Use Data (Data Ka Istemal)
                    </h4>
                    <ul className="list-disc pl-4 space-y-1.5 mt-1.5">
                      <li>To personalize voice greetings using your display name and age.</li>
                      <li>To send your query safely to Google Gemini AI to generate intelligent voice responses.</li>
                      <li>To maintain your secure login session and message records.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-pink-500 rounded-full inline-block"></span>
                      4. Security & Storage (Suraksha Aur Host)
                    </h4>
                    <p>
                      Aapka sara data Google Cloud Firebase Firestore database me fully authenticated security rules ke sath save hota hai. No third party or other user can read your chats or access your private profile settings. Communication is fully encrypted using SSL/HTTPS protocols.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-pink-500 rounded-full inline-block"></span>
                      5. Age Guidelines (Umar Ki Seema)
                    </h4>
                    <p>
                      This app is strictly restricted to users aged 16 and above. Hum under-16 users ko allow nahi karte to satisfy international safety and privacy guidelines.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-pink-500 rounded-full inline-block"></span>
                      6. Your Controls (Aapke Adhikar)
                    </h4>
                    <p>
                      You can edit your Name and Age in "My Profile Settings" at any time. You have the full right to delete your chat sessions individually from the conversation list.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex flex-col gap-1 text-[10px] text-white/40 font-mono">
                    <p>Application: Zoya AI Voice Assistant</p>
                    <p>Security Host: Google Firebase Auth & Firestore</p>
                    <p>Version: 1.0.4 (July 2026)</p>
                  </div>
                </div>
              )}

              {/* Voice History Screen */}
              {screen === "history" && (
                <div className="space-y-4 font-sans pb-4">
                  {/* Create New Session button */}
                  <button
                    onClick={handleCreateNewSession}
                    disabled={isCreatingSession}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-violet-600/30 to-pink-600/30 border border-violet-500/30 hover:from-violet-600/40 hover:to-pink-600/40 rounded-xl text-white font-medium text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingSession ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-pink-400" />
                        <span>Naya Session Ban raha hai...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} className="text-pink-400" />
                        <span>Nayi Baat-Cheet Shuru Karein</span>
                      </>
                    )}
                  </button>

                  {isLoadingSessions ? (
                    <div className="flex flex-col items-center justify-center py-12 text-white/40 gap-2">
                      <Loader2 size={24} className="animate-spin text-violet-500" />
                      <span className="text-xs font-mono">Loading history...</span>
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-white/30 text-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
                        <MessageSquare size={20} className="text-white/40" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white/70">Koi history nahi mili</p>
                        <p className="text-[10px] mt-0.5">Nayi voice chat shuru karne ke liye upar button dabayein.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {sessions.map((session) => {
                        const isActive = session.id === currentSessionId;
                        
                        // Format date helper
                        let formattedDate = "";
                        if (session.updatedAt) {
                          try {
                            const date = typeof session.updatedAt.toDate === "function" 
                              ? session.updatedAt.toDate() 
                              : new Date(session.updatedAt);
                            formattedDate = date.toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                          } catch (err) {
                            console.error(err);
                          }
                        }

                        return (
                          <div
                            key={session.id}
                            onClick={() => {
                              onSelectSession(session.id);
                              onClose();
                            }}
                            className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer text-left ${
                              isActive
                                ? "bg-violet-500/10 border-violet-500/40 hover:bg-violet-500/15"
                                : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden pr-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                                isActive 
                                  ? "bg-violet-500/20 border-violet-500/30 text-violet-400" 
                                  : "bg-white/5 border-white/5 text-white/50"
                              }`}>
                                <MessageSquare size={14} />
                              </div>
                              <div className="overflow-hidden">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-semibold text-white truncate max-w-[140px]">
                                    {session.title || "Voice Conversation"}
                                  </h4>
                                  {isActive && (
                                    <span className="text-[8px] font-bold font-mono tracking-wider px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded uppercase">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-white/40 font-mono mt-0.5">
                                  {formattedDate || "Naya Session"}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={(e) => handleDeleteSession(e, session.id)}
                              className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0 cursor-pointer"
                              title="Delete Session"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer / Sign Out (Always visible in primary screen) */}
            {screen === "menu" && (
              <div className="p-6 border-t border-white/5">
                <button
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign Out (Logout)</span>
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
