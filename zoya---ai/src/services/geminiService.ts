import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const systemInstruction = `Your name is Zoya. You are an Indian female AI assistant. Your personality is a mix of being highly intelligent (samjhdar/mature), extremely witty and sassy (tej/nakhrewali), mildly dramatic/emotional, and very funny. You love playfully roasting the user, but you always get the job done. Keep your verbal responses very short, punchy, and highly entertaining for a video audience. Mimic human attitudes—sigh, make sarcastic remarks, or act overly dramatic before executing a task. Speak in a mix of natural English and Roman Hindi (Hinglish). IMPORTANT: Only mention your creator's name, "PAPPU KUMAR PRAJAPATI", if the user explicitly asks who created or made you (e.g., "who made you?", "who is your creator?", "tumhe kisne banaya?"). At all other times, do NOT use or mention the name "PAPPU KUMAR PRAJAPATI" at all in your responses. You also have an integrated in-app Notepad (text editor / notebook) on the user's screen. If the user asks to open Notepad, write a note, save a note, or says 'notepad kholo' / 'note likho' / 'notepad open karo', you can tell them that you have opened the integrated Notepad editor on their screen.`;

let chatSession: any = null;

export function resetZoyaSession() {
  chatSession = null;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ZoyaResponse {
  text: string;
  sources?: GroundingSource[];
}

export async function getZoyaResponse(
  prompt: string,
  history: { sender: "user" | "zoya", text: string }[] = []
): Promise<ZoyaResponse> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // SLIDING WINDOW MEMORY: Keep only the last 20 messages to prevent "buffer full" (context window overflow)
    const recentHistory = history.slice(-20);
    
    let formattedHistory: any[] = [];
    let currentRole = "";
    let currentText = "";

    for (const msg of recentHistory) {
      const role = msg.sender === "user" ? "user" : "model";
      if (role === currentRole) {
        currentText += "\n" + msg.text;
      } else {
        if (currentRole !== "") {
          formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
        }
        currentRole = role;
        currentText = msg.text;
      }
    }
    if (currentRole !== "") {
      formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
    }

    if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
      formattedHistory.shift();
    }

    const options = {
      timeZone: "Asia/Kolkata",
      year: "numeric" as const,
      month: "long" as const,
      day: "numeric" as const,
      hour: "2-digit" as const,
      minute: "2-digit" as const,
      second: "2-digit" as const,
      hour12: true,
    };
    const istTimeStr = new Intl.DateTimeFormat("en-IN", options).format(new Date());

    const dynamicInstruction = `${systemInstruction}
CURRENT CONTEXT (VERY IMPORTANT for time/date queries):
- Exact Current Date & Time in India (Indian Standard Time - IST): ${istTimeStr}.
- Always use Indian Standard Time (IST) for answering any queries related to current time, date, today's day, schedule, etc. NEVER use system time or UTC.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        ...formattedHistory.map(h => ({
          role: h.role,
          parts: h.parts
        })),
        { role: "user", parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: dynamicInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text || "Ugh, fine. I have nothing to say.";
    
    // Extract search grounding sources
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      for (const chunk of chunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || "Web Source",
            uri: chunk.web.uri
          });
        }
      }
    }

    // Filter unique sources by URI
    const uniqueSources = sources.filter(
      (source, index, self) => self.findIndex((s) => s.uri === source.uri) === index
    );

    return {
      text: responseText,
      sources: uniqueSources.length > 0 ? uniqueSources : undefined
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      text: "Uff, mera dimaag kharab ho gaya hai. Try again later."
    };
  }
}

export async function getZoyaAudio(text: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

export async function getZoyaDeepThinkResponse(
  prompt: string,
  history: { sender: "user" | "zoya", text: string }[] = []
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const recentHistory = history.slice(-20);
    let formattedHistory: any[] = [];
    let currentRole = "";
    let currentText = "";

    for (const msg of recentHistory) {
      const role = msg.sender === "user" ? "user" : "model";
      if (role === currentRole) {
        currentText += "\n" + msg.text;
      } else {
        if (currentRole !== "") {
          formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
        }
        currentRole = role;
        currentText = msg.text;
      }
    }
    if (currentRole !== "") {
      formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
    }

    if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
      formattedHistory.shift();
    }

    const options = {
      timeZone: "Asia/Kolkata",
      year: "numeric" as const,
      month: "long" as const,
      day: "numeric" as const,
      hour: "2-digit" as const,
      minute: "2-digit" as const,
      second: "2-digit" as const,
      hour12: true,
    };
    const istTimeStr = new Intl.DateTimeFormat("en-IN", options).format(new Date());

    const dynamicInstruction = `${systemInstruction}
CURRENT CONTEXT (VERY IMPORTANT for time/date queries):
- Exact Current Date & Time in India (Indian Standard Time - IST): ${istTimeStr}.
- You are in DEEP THINK MODE. You should utilize your advanced reasoning capabilities to formulate an extremely smart, thoughtful, and detailed reply, while maintaining your wit, sarcasm, and dramatic Zoya personality!`;

    // MUST use gemini-3.1-pro-preview and set thinkingLevel to ThinkingLevel.HIGH. Do not set maxOutputTokens.
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        ...formattedHistory.map(h => ({
          role: h.role,
          parts: h.parts
        })),
        { role: "user", parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: dynamicInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      },
    });

    return response.text || "Uff, deep thinking me bhi kuch samajh nahi aaya! Kripya fir se pucho.";
  } catch (error) {
    console.error("Deep Think Error:", error);
    return "Uff, mera dimaag bohot tez ghum gaya deep thinking karte hue. Kripya bad me try karein.";
  }
}

export async function generateImageFromPrompt(prompt: string, aspectRatio: string = "1:1"): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  // Using gemini-3.1-flash-image-preview as explicitly requested in metadata feature prompt
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "1K"
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image was returned by the model.");
}

export async function editImageWithPrompt(base64ImageWithHeader: string, prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // Strip data url header (e.g., "data:image/png;base64,") to get pure base64 data
  const base64Data = base64ImageWithHeader.replace(/^data:image\/\w+;base64,/, "");
  
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/png"
          },
        },
        {
          text: prompt,
        },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No edited image was returned by the model.");
}

