import React, { useEffect, useRef } from "react";

export default function AdBanner160x300() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any previous scripts in container
    containerRef.current.innerHTML = "";

    // Save previous atOptions to restore on unmount if needed
    const prevAtOptions = (window as any).atOptions;

    // Define options
    (window as any).atOptions = {
      'key' : '931241182f0470cafc06735f3af97cfd',
      'format' : 'iframe',
      'height' : 300,
      'width' : 160,
      'params' : {}
    };

    // Create the script tag for invoke.js
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "//www.highperformanceformat.com/931241182f0470cafc06735f3af97cfd/invoke.js";
    script.async = true;

    // Append script directly to container
    containerRef.current.appendChild(script);

    return () => {
      // Clean up window variable to keep environment clean
      (window as any).atOptions = prevAtOptions;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-white/5 border border-white/10 w-full max-w-[190px] mx-auto shadow-xl backdrop-blur-md">
      <span className="text-[10px] text-white/40 tracking-wider uppercase font-mono">Sponsor Advertisement</span>
      <div 
        ref={containerRef} 
        id="container-931241182f0470cafc06735f3af97cfd" 
        className="w-[160px] h-[300px] overflow-hidden rounded-xl bg-black/40 flex items-center justify-center border border-white/5 shadow-inner"
      >
        <span className="text-[10px] text-white/20 font-mono text-center px-4 animate-pulse">Loading Zoya sponsor offer...</span>
      </div>
    </div>
  );
}
