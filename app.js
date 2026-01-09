import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Copy, Users, Globe, Zap, Check, Terminal, Share2 } from 'lucide-react';

const DOCS_MARKDOWN = `### 🌐 Websim Realtime Architecture

Websim provides a global \`WebsimSocket\` class for multi-user synchronization. It handles three primary types of data:

1. **Room State (\`roomState\`)**
   - Shared global data synchronized across all clients.
   - Best for: Game settings, world objects, shared scores.
   - Update: \`room.updateRoomState({ key: value })\`

2. **Player Presence (\`presence\`)**
   - Per-client data owned by individual users.
   - Best for: Player positions, health, inventory, animations.
   - Update: \`room.updatePresence({ x: 100, y: 100 })\`

3. **Events (\`send/onmessage\`)**
   - Ephemeral, one-time messages.
   - Best for: Sound triggers, visual effects, chat messages.
   - Method: \`room.send({ type: 'explosion', x: 50 })\`

**Initialization Pattern:**
\`\`\`javascript
const room = new WebsimSocket();
await room.initialize();

// Listen for any changes
room.subscribePresence((p) => console.log("Users updated", p));
room.subscribeRoomState((s) => console.log("World updated", s));

// Listen for events
room.onmessage = (event) => {
  if (event.data.type === 'ping') playSound();
};
\`\`\``;

const App = () => {
    const [room, setRoom] = useState(null);
    const [presence, setPresence] = useState({});
    const [roomState, setRoomState] = useState({});
    const [peers, setPeers] = useState({});
    const [showToast, setShowToast] = useState(false);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const audioCtx = useRef(null);

    useEffect(() => {
        const initSocket = async () => {
            const r = new WebsimSocket();
            await r.initialize();
            
            setRoom(r);
            setPresence(r.presence);
            setRoomState(r.roomState);
            setPeers(r.peers);

            r.subscribePresence((p) => setPresence({ ...p }));
            r.subscribeRoomState((s) => setRoomState({ ...s }));
            // Note: Peers updates are covered by subscribePresence or we can check interval
            const peerCheck = setInterval(() => setPeers({ ...r.peers }), 1000);

            return () => clearInterval(peerCheck);
        };
        initSocket();
    }, []);

    const playClick = () => {
        if (!audioCtx.current) audioCtx.current = new AudioContext();
        const fetchSound = async () => {
            const res = await fetch('click.mp3');
            const arrayBuffer = await res.arrayBuffer();
            const audioBuffer = await audioCtx.current.decodeAudioData(arrayBuffer);
            const source = audioCtx.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.current.destination);
            source.start();
        };
        fetchSound();
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(DOCS_MARKDOWN);
        setShowToast(true);
        playClick();
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleMouseMove = (e) => {
        if (!room) return;
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        room.updatePresence({ cursor: { x, y } });
    };

    const updateSharedColor = (color) => {
        if (!room) return;
        room.updateRoomState({ themeColor: color });
        playClick();
    };

    if (!room) return (
        <div className="h-screen flex items-center justify-center bg-black text-white">
            <Zap className="animate-pulse mr-2" /> Initializing Realtime Connection...
        </div>
    );

    return (
        <div 
            className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto"
            onMouseMove={handleMouseMove}
        >
            {/* Realtime Cursors */}
            {Object.entries(presence).map(([id, data]) => {
                if (id === room.clientId || !data.cursor) return null;
                const peer = peers[id] || { username: 'Unknown' };
                return (
                    <div 
                        key={id}
                        className="presence-cursor fixed flex flex-col items-center"
                        style={{ left: `${data.cursor.x}%`, top: `${data.cursor.y}%` }}
                    >
                        <div className="w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 border-2 border-white" />
                        <span className="text-[10px] bg-black/80 px-1 rounded mt-1 whitespace-nowrap border border-white/20">
                            {peer.username}
                        </span>
                    </div>
                );
            })}

            <header className="mb-12">
                <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
                    <Zap size={20} />
                    <span>WEBSIM REALTIME GUIDE</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                    Multiplayer State Sync
                </h1>
                <p className="text-gray-400 max-w-2xl text-lg">
                    Websim handles all the heavy lifting of WebSockets for you. This page itself is a live multiplayer demo.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {/* Demo Card 1: Room State */}
                <div className="glass p-6 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-purple-400">
                            <Globe size={20} />
                            <h2 className="font-semibold uppercase tracking-wider text-sm">Room State</h2>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">SHARED GLOBAL</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-6">Changes here affect everyone instantly.</p>
                    
                    <div className="space-y-4">
                        <label className="text-xs text-gray-500 uppercase font-bold">World Theme Color</label>
                        <div className="flex gap-2">
                            {['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e'].map(c => (
                                <button 
                                    key={c}
                                    onClick={() => updateSharedColor(c)}
                                    className={`w-10 h-10 rounded-lg transition-transform hover:scale-110 active:scale-95 border-2 ${roomState.themeColor === c ? 'border-white' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                        <div className="p-3 bg-black/40 rounded-lg border border-white/5">
                            <code className="text-xs text-blue-300">roomState.themeColor = "{roomState.themeColor || '#3b82f6'}"</code>
                        </div>
                    </div>
                </div>

                {/* Demo Card 2: Presence */}
                <div className="glass p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-green-400">
                            <Users size={20} />
                            <h2 className="font-semibold uppercase tracking-wider text-sm">Active Peers</h2>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                            {Object.keys(peers).length} ONLINE
                        </span>
                    </div>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                        {Object.entries(peers).map(([id, peer]) => (
                            <div key={id} className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                                <div className="flex items-center gap-3">
                                    <img src={peer.avatarUrl} className="w-8 h-8 rounded-full border border-white/20" alt="" />
                                    <span className="text-sm font-medium">{peer.username}</span>
                                </div>
                                {id === room.clientId && <span className="text-[10px] text-gray-500 italic">You</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Explanation / Copy Section */}
            <section className="glass rounded-3xl overflow-hidden border border-white/10 mb-20">
                <div className="bg-white/5 p-4 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-2 font-bold text-gray-300">
                        <Terminal size={18} />
                        <span>Technical Documentation</span>
                    </div>
                    <button 
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                    >
                        <Copy size={16} />
                        Copy Technical Summary
                    </button>
                </div>
                <div className="p-6 md:p-8 bg-[#050505]">
                    <div className="prose prose-invert max-w-none">
                        <pre className="text-sm leading-relaxed overflow-x-auto p-4 rounded-xl bg-black/50 border border-white/5 text-gray-300">
                            {DOCS_MARKDOWN}
                        </pre>
                    </div>
                </div>
            </section>

            {/* Floating Toast */}
            {showToast && (
                <div className="copy-toast fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-[100] font-bold">
                    <Check size={20} />
                    Documentation copied to clipboard!
                </div>
            )}

            {/* Dynamic Background */}
            <div 
                className="fixed inset-0 -z-10 transition-colors duration-1000 opacity-20"
                style={{ backgroundColor: roomState.themeColor || '#3b82f6' }}
            />
            <div className="fixed inset-0 -z-20 bg-black" />
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('app'));