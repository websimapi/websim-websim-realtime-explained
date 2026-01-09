import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import htm from 'htm';
import { Copy, Users, Globe, Zap, Check, Terminal, Share2 } from 'lucide-react';

const html = htm.bind(React.createElement);

const DOCS_MARKDOWN = `Reddit's Developer Platform (Devvit) enables real-time multiplayer experiences through its **Realtime** capability, which provides low-latency synchronization between users and server-driven events. This system allows developers to build live scoreboards, multiplayer games (like r/Pixelary), and interactive experiences where users see each other's changes without observable lag [[Welcome to Devvit](https://developers.reddit.com/docs/0.11); [Realtime Overview](https://developers.reddit.com/docs/capabilities/realtime/overview)].

### Core Architecture
Realtime functionality follows a client/server architecture designed to ensure consistency and security:

*   **Client-side (Subscription):** Interactive posts or webviews subscribe to "channels" to receive event streams [[Realtime in Devvit Web](https://developers.reddit.com/docs/capabilities/realtime/overview)].
*   **Server-side (Authoritative):** Message sending is typically controlled by server-side logic to prevent cheating or inconsistent states. Developers use an authoritative server model where the backend validates actions and broadcasts updates [[What’s a Raid event?](https://developers.reddit.com/docs/blog/riddonkulous#whats-a-raid-event); [Realtime in Devvit Web](https://developers.reddit.com/docs/capabilities/realtime/overview)].
*   **Data Persistence:** Realtime is frequently paired with **Redis**, a high-performance in-memory data store, to maintain a "source of truth" for game states (like player XP, scores, or positions) that persists across sessions [[Realtime Overview](https://developers.reddit.com/docs/capabilities/realtime/overview); [Saving Data to Reddit](https://developers.reddit.com/docs/quickstart/quickstart-unity#communicate-between-unity-and-reddit)].

### Implementation Methods
The implementation varies slightly depending on whether you are using **Devvit Blocks** (Reddit's native UI toolkit) or **Devvit Web** (using web technologies like React or Phaser).

#### 1. Devvit Blocks
In the Blocks environment, real-time interactions are handled through hooks:
*   **\`useChannel\`**: This hook is defined within the post's render function. It allows the post to subscribe to a channel and define handlers like \`onMessage\` (to update local UI state when data arrives) and \`onConnect\` [[Realtime in Devvit Blocks](https://developers.reddit.com/docs/capabilities/realtime/realtime_in_devvit_blocks)].
*   **\`channel.send\`**: Recommended for peer-to-peer synchronization, allowing clients to publish data to others on the same channel [[Realtime in Devvit Blocks](https://developers.reddit.com/docs/capabilities/realtime/realtime_in_devvit_blocks)].
*   **\`context.realtime.send\`**: Used by the backend (e.g., in a scheduled job or trigger) to "push" updates to all subscribed clients [[Realtime in Devvit Blocks](https://developers.reddit.com/docs/capabilities/realtime/realtime_in_devvit_blocks)].

#### 2. Devvit Web (Webview)
For more complex games (like those built with Phaser), the architecture is split:
*   **Client-side (\`connectRealtime\`)**: A connection object is created that listens for messages and manages the lifecycle (connect/disconnect) of the socket [[Realtime in Devvit Web](https://developers.reddit.com/docs/capabilities/realtime/overview)].
*   **Server-side (\`realtime.send\`)**: The server receives requests from the webview (often via HTTP), processes the game logic, and then uses the \`realtime\` plugin to broadcast the result to the relevant channel [[Realtime in Devvit Web](https://developers.reddit.com/docs/capabilities/realtime/overview)].

### Practical Example: A "Raid" Event
In the game *Riddonkulous*, multiplayer "Raid" events were powered by this model:
1.  **State Management:** Redis stored the boss's health and player progress [[What’s a Raid event?](https://developers.reddit.com/docs/blog/riddonkulous#whats-a-raid-event)].
2.  **Coordination:** When one player solved a riddle, the server updated the Redis state and used \`realtime.send\` to broadcast the new state to all other players in the raid [[What’s a Raid event?](https://developers.reddit.com/docs/blog/riddonkulous#whats-a-raid-event)].
3.  **Synchronization:** Every connected player's UI updated instantly to show the boss taking damage or the riddle being solved [[Realtime Overview](https://developers.reddit.com/docs/capabilities/realtime/overview)].

### System Limits
To ensure platform stability, the following quotas apply:
*   **Throughput:** Up to 100 messages per second per app installation [[Realtime in Devvit Blocks](https://developers.reddit.com/docs/capabilities/realtime/realtime_in_devvit_blocks)].
*   **Payload Size:** Each message can be up to 1 MB in size [[Realtime in Devvit Blocks](https://developers.reddit.com/docs/capabilities/realtime/realtime_in_devvit_blocks)].`;

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

    if (!room) return html`
        <div className="h-screen flex items-center justify-center bg-black text-white">
            <${Zap} className="animate-pulse mr-2" /> Initializing Realtime Connection...
        </div>
    `;

    return html`
        <div 
            className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto"
            onMouseMove=${handleMouseMove}
        >
            ${/* Realtime Cursors */
            Object.entries(presence).map(([id, data]) => {
                if (id === room.clientId || !data.cursor) return null;
                const peer = peers[id] || { username: 'Unknown' };
                return html`
                    <div 
                        key=${id}
                        className="presence-cursor fixed flex flex-col items-center"
                        style=${{ left: `${data.cursor.x}%`, top: `${data.cursor.y}%` }}
                    >
                        <div className="w-4 h-4 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50 border-2 border-white" />
                        <span className="text-[10px] bg-black/80 px-1 rounded mt-1 whitespace-nowrap border border-white/20">
                            ${peer.username}
                        </span>
                    </div>
                `;
            })}

            <header className="mb-12">
                <div className="flex items-center gap-2 text-orange-500 font-bold mb-2">
                    <${Zap} size=${20} />
                    <span>REDDIT DEVVIT REALTIME REF</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                    Devvit Architecture
                </h1>
                <p className="text-gray-400 max-w-2xl text-lg">
                    A reference guide for Reddit's Realtime Platform architecture (Channels, Redis, Blocks), running on a Websim demo.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="glass p-6 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-purple-400">
                            <${Globe} size=${20} />
                            <h2 className="font-semibold uppercase tracking-wider text-sm">Room State</h2>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">SHARED GLOBAL</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-6">Changes here affect everyone instantly.</p>
                    
                    <div className="space-y-4">
                        <label className="text-xs text-gray-500 uppercase font-bold">World Theme Color</label>
                        <div className="flex gap-2">
                            ${['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e'].map(c => html`
                                <button 
                                    key=${c}
                                    onClick=${() => updateSharedColor(c)}
                                    className=${`w-10 h-10 rounded-lg transition-transform hover:scale-110 active:scale-95 border-2 ${roomState.themeColor === c ? 'border-white' : 'border-transparent'}`}
                                    style=${{ backgroundColor: c }}
                                />
                            `)}
                        </div>
                        <div className="p-3 bg-black/40 rounded-lg border border-white/5">
                            <code className="text-xs text-blue-300">roomState.themeColor = "${roomState.themeColor || '#3b82f6'}"</code>
                        </div>
                    </div>
                </div>

                <div className="glass p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-green-400">
                            <${Users} size=${20} />
                            <h2 className="font-semibold uppercase tracking-wider text-sm">Active Peers</h2>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                            ${Object.keys(peers).length} ONLINE
                        </span>
                    </div>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                        ${Object.entries(peers).map(([id, peer]) => html`
                            <div key=${id} className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                                <div className="flex items-center gap-3">
                                    <img src=${peer.avatarUrl} className="w-8 h-8 rounded-full border border-white/20" alt="" />
                                    <span className="text-sm font-medium">${peer.username}</span>
                                </div>
                                ${id === room.clientId && html`<span className="text-[10px] text-gray-500 italic">You</span>`}
                            </div>
                        `)}
                    </div>
                </div>
            </div>

            <section className="glass rounded-3xl overflow-hidden border border-white/10 mb-20">
                <div className="bg-white/5 p-4 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-2 font-bold text-gray-300">
                        <${Terminal} size=${18} />
                        <span>Devvit Realtime Docs</span>
                    </div>
                    <button 
                        onClick=${copyToClipboard}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-orange-600/20"
                    >
                        <${Copy} size=${16} />
                        Copy Reddit Docs
                    </button>
                </div>
                <div className="p-6 md:p-8 bg-[#050505]">
                    <div className="prose prose-invert max-w-none">
                        <pre className="text-sm leading-relaxed whitespace-pre-wrap overflow-x-auto p-4 rounded-xl bg-black/50 border border-white/5 text-gray-300 font-mono">
                            ${DOCS_MARKDOWN}
                        </pre>
                    </div>
                </div>
            </section>

            ${showToast && html`
                <div className="copy-toast fixed bottom-8 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-[100] font-bold">
                    <${Check} size=${20} />
                    Reddit Docs copied to clipboard!
                </div>
            `}

            <div 
                className="fixed inset-0 -z-10 transition-colors duration-1000 opacity-20"
                style=${{ backgroundColor: roomState.themeColor || '#3b82f6' }}
            />
            <div className="fixed inset-0 -z-20 bg-black" />
        </div>
    `;
};

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(html`<${App} />`);