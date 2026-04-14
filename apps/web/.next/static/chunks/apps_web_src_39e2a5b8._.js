(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/src/hooks/useChat.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useChat",
    ()=>useChat
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@15.5.15+21ccd8898788a04d/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/api.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function useChat() {
    _s();
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [conversation, setConversation] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [character, setCharacter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [isStreaming, setIsStreaming] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const streamingIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useChat.useEffect": ()=>{
            async function initialize() {
                try {
                    const characters = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getCharacters();
                    if (characters.length === 0) {
                        setError("No characters available");
                        setIsLoading(false);
                        return;
                    }
                    setCharacter(characters[0]);
                    let convos = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getConversations();
                    let convo;
                    if (convos.length === 0) {
                        convo = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].createConversation(characters[0].id);
                    } else {
                        convo = convos[0];
                    }
                    setConversation(convo);
                    const existingMessages = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getMessages(convo.id);
                    setMessages(existingMessages);
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to initialize");
                } finally{
                    setIsLoading(false);
                }
            }
            initialize();
        }
    }["useChat.useEffect"], []);
    const sendMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useChat.useCallback[sendMessage]": async (content)=>{
            if (!conversation || isStreaming) return;
            setError(null);
            const userMessage = {
                id: crypto.randomUUID(),
                conversationId: conversation.id,
                role: "user",
                content,
                createdAt: new Date().toISOString()
            };
            const assistantId = crypto.randomUUID();
            const assistantMessage = {
                id: assistantId,
                conversationId: conversation.id,
                role: "assistant",
                content: "",
                createdAt: new Date().toISOString(),
                isStreaming: true
            };
            streamingIdRef.current = assistantId;
            setMessages({
                "useChat.useCallback[sendMessage]": (prev)=>[
                        ...prev,
                        userMessage,
                        assistantMessage
                    ]
            }["useChat.useCallback[sendMessage]"]);
            setIsStreaming(true);
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].streamMessage(conversation.id, content, {
                "useChat.useCallback[sendMessage]": (chunk)=>{
                    setMessages({
                        "useChat.useCallback[sendMessage]": (prev)=>prev.map({
                                "useChat.useCallback[sendMessage]": (m)=>m.id === assistantId ? {
                                        ...m,
                                        content: m.content + chunk
                                    } : m
                            }["useChat.useCallback[sendMessage]"])
                    }["useChat.useCallback[sendMessage]"]);
                }
            }["useChat.useCallback[sendMessage]"], {
                "useChat.useCallback[sendMessage]": ()=>{
                    setMessages({
                        "useChat.useCallback[sendMessage]": (prev)=>prev.map({
                                "useChat.useCallback[sendMessage]": (m)=>m.id === assistantId ? {
                                        ...m,
                                        isStreaming: false
                                    } : m
                            }["useChat.useCallback[sendMessage]"])
                    }["useChat.useCallback[sendMessage]"]);
                    setIsStreaming(false);
                    streamingIdRef.current = null;
                }
            }["useChat.useCallback[sendMessage]"], {
                "useChat.useCallback[sendMessage]": (err)=>{
                    setError(err.message);
                    setMessages({
                        "useChat.useCallback[sendMessage]": (prev)=>prev.map({
                                "useChat.useCallback[sendMessage]": (m)=>m.id === assistantId ? {
                                        ...m,
                                        content: m.content || "Failed to get response",
                                        isStreaming: false
                                    } : m
                            }["useChat.useCallback[sendMessage]"])
                    }["useChat.useCallback[sendMessage]"]);
                    setIsStreaming(false);
                    streamingIdRef.current = null;
                }
            }["useChat.useCallback[sendMessage]"]);
        }
    }["useChat.useCallback[sendMessage]"], [
        conversation,
        isStreaming
    ]);
    return {
        messages,
        conversation,
        character,
        isLoading,
        isStreaming,
        error,
        sendMessage
    };
}
_s(useChat, "dngiFwGvWGmNopjRfA9NdfHO0Ss=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/components/CharacterHeader.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "atSign": "CharacterHeader-module__7p7PYG__atSign",
  "header": "CharacterHeader-module__7p7PYG__header",
  "inner": "CharacterHeader-module__7p7PYG__inner",
  "name": "CharacterHeader-module__7p7PYG__name",
  "statusDot": "CharacterHeader-module__7p7PYG__statusDot",
});
}),
"[project]/apps/web/src/components/CharacterHeader.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CharacterHeader",
    ()=>CharacterHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@15.5.15+21ccd8898788a04d/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$CharacterHeader$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/apps/web/src/components/CharacterHeader.module.css [app-client] (css module)");
"use client";
;
;
function CharacterHeader(param) {
    let { character } = param;
    var _character_name;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$CharacterHeader$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].header,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$CharacterHeader$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].inner,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$CharacterHeader$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].atSign,
                    children: "@"
                }, void 0, false, {
                    fileName: "[project]/apps/web/src/components/CharacterHeader.tsx",
                    lineNumber: 14,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$CharacterHeader$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].name,
                    children: (_character_name = character === null || character === void 0 ? void 0 : character.name) !== null && _character_name !== void 0 ? _character_name : "Loading..."
                }, void 0, false, {
                    fileName: "[project]/apps/web/src/components/CharacterHeader.tsx",
                    lineNumber: 15,
                    columnNumber: 9
                }, this),
                character && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$CharacterHeader$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].statusDot
                }, void 0, false, {
                    fileName: "[project]/apps/web/src/components/CharacterHeader.tsx",
                    lineNumber: 16,
                    columnNumber: 23
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/src/components/CharacterHeader.tsx",
            lineNumber: 13,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/src/components/CharacterHeader.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, this);
}
_c = CharacterHeader;
var _c;
__turbopack_context__.k.register(_c, "CharacterHeader");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/components/ChatBubble.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "assistantBubble": "ChatBubble-module__x_8Jza__assistantBubble",
  "assistantRow": "ChatBubble-module__x_8Jza__assistantRow",
  "blink": "ChatBubble-module__x_8Jza__blink",
  "bubble": "ChatBubble-module__x_8Jza__bubble",
  "content": "ChatBubble-module__x_8Jza__content",
  "cursor": "ChatBubble-module__x_8Jza__cursor",
  "row": "ChatBubble-module__x_8Jza__row",
  "userBubble": "ChatBubble-module__x_8Jza__userBubble",
  "userRow": "ChatBubble-module__x_8Jza__userRow",
});
}),
"[project]/apps/web/src/components/ChatBubble.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ChatBubble",
    ()=>ChatBubble
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@15.5.15+21ccd8898788a04d/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatBubble$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/apps/web/src/components/ChatBubble.module.css [app-client] (css module)");
"use client";
;
;
function ChatBubble(param) {
    let { message } = param;
    const isUser = message.role === "user";
    const isStreaming = message.isStreaming;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatBubble$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].row, " ").concat(isUser ? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatBubble$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].userRow : __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatBubble$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].assistantRow),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatBubble$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].bubble, " ").concat(isUser ? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatBubble$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].userBubble : __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatBubble$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].assistantBubble, " animate-in"),
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatBubble$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].content,
                    children: message.content || (isStreaming ? "" : "...")
                }, void 0, false, {
                    fileName: "[project]/apps/web/src/components/ChatBubble.tsx",
                    lineNumber: 21,
                    columnNumber: 9
                }, this),
                isStreaming && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatBubble$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].cursor,
                    "aria-hidden": "true"
                }, void 0, false, {
                    fileName: "[project]/apps/web/src/components/ChatBubble.tsx",
                    lineNumber: 25,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/src/components/ChatBubble.tsx",
            lineNumber: 18,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/src/components/ChatBubble.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
_c = ChatBubble;
var _c;
__turbopack_context__.k.register(_c, "ChatBubble");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/components/ChatInput.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "container": "ChatInput-module__7lDLia__container",
  "sendButton": "ChatInput-module__7lDLia__sendButton",
  "textarea": "ChatInput-module__7lDLia__textarea",
  "wrapper": "ChatInput-module__7lDLia__wrapper",
});
}),
"[project]/apps/web/src/components/ChatInput.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ChatInput",
    ()=>ChatInput
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@15.5.15+21ccd8898788a04d/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@15.5.15+21ccd8898788a04d/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatInput$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/apps/web/src/components/ChatInput.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function ChatInput(param) {
    let { onSend, disabled, characterName } = param;
    _s();
    const [value, setValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const textareaRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    function handleSubmit(e) {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setValue("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    }
    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    }
    function handleInput() {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = "".concat(Math.min(textarea.scrollHeight, 120), "px");
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatInput$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].wrapper,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatInput$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].container,
            onSubmit: handleSubmit,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                    ref: textareaRef,
                    id: "chat-input",
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatInput$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].textarea,
                    value: value,
                    onChange: (e)=>setValue(e.target.value),
                    onKeyDown: handleKeyDown,
                    onInput: handleInput,
                    placeholder: "Message @".concat(characterName),
                    rows: 1,
                    disabled: disabled,
                    autoComplete: "off"
                }, void 0, false, {
                    fileName: "[project]/apps/web/src/components/ChatInput.tsx",
                    lineNumber: 46,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    type: "submit",
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatInput$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].sendButton,
                    disabled: disabled || !value.trim(),
                    "aria-label": "Send message",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        width: "20",
                        height: "20",
                        viewBox: "0 0 24 24",
                        fill: "currentColor",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/src/components/ChatInput.tsx",
                            lineNumber: 71,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/src/components/ChatInput.tsx",
                        lineNumber: 65,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/web/src/components/ChatInput.tsx",
                    lineNumber: 59,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/src/components/ChatInput.tsx",
            lineNumber: 45,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/src/components/ChatInput.tsx",
        lineNumber: 44,
        columnNumber: 5
    }, this);
}
_s(ChatInput, "siXqDNfwNO0wSL/H8B9PdNxU3i4=");
_c = ChatInput;
var _c;
__turbopack_context__.k.register(_c, "ChatInput");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/app/chat/chat.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "container": "chat-module__s_Dpra__container",
  "empty": "chat-module__s_Dpra__empty",
  "emptyAvatar": "chat-module__s_Dpra__emptyAvatar",
  "emptySubtitle": "chat-module__s_Dpra__emptySubtitle",
  "emptyTitle": "chat-module__s_Dpra__emptyTitle",
  "errorBar": "chat-module__s_Dpra__errorBar",
  "fadeIn": "chat-module__s_Dpra__fadeIn",
  "loadingContainer": "chat-module__s_Dpra__loadingContainer",
  "loadingDots": "chat-module__s_Dpra__loadingDots",
  "messages": "chat-module__s_Dpra__messages",
  "pulse": "chat-module__s_Dpra__pulse",
});
}),
"[project]/apps/web/src/app/chat/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ChatPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@15.5.15+21ccd8898788a04d/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@15.5.15+21ccd8898788a04d/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$hooks$2f$useChat$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/hooks/useChat.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$CharacterHeader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/components/CharacterHeader.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatBubble$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/components/ChatBubble.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatInput$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/components/ChatInput.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$app$2f$chat$2f$chat$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/apps/web/src/app/chat/chat.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
function ChatPage() {
    _s();
    const { messages, character, isLoading, isStreaming, error, sendMessage } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$hooks$2f$useChat$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChat"])();
    const scrollRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const bottomRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            var _bottomRef_current;
            (_bottomRef_current = bottomRef.current) === null || _bottomRef_current === void 0 ? void 0 : _bottomRef_current.scrollIntoView({
                behavior: "smooth"
            });
        }
    }["ChatPage.useEffect"], [
        messages
    ]);
    if (isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$app$2f$chat$2f$chat$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].loadingContainer,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$app$2f$chat$2f$chat$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].loadingDots,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {}, void 0, false, {
                        fileName: "[project]/apps/web/src/app/chat/page.tsx",
                        lineNumber: 24,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {}, void 0, false, {
                        fileName: "[project]/apps/web/src/app/chat/page.tsx",
                        lineNumber: 25,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {}, void 0, false, {
                        fileName: "[project]/apps/web/src/app/chat/page.tsx",
                        lineNumber: 26,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/src/app/chat/page.tsx",
                lineNumber: 23,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/web/src/app/chat/page.tsx",
            lineNumber: 22,
            columnNumber: 7
        }, this);
    }
    var _character_name;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$app$2f$chat$2f$chat$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].container,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$CharacterHeader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CharacterHeader"], {
                character: character
            }, void 0, false, {
                fileName: "[project]/apps/web/src/app/chat/page.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$app$2f$chat$2f$chat$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].messages,
                ref: scrollRef,
                children: [
                    messages.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$app$2f$chat$2f$chat$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].empty,
                        children: [
                            (character === null || character === void 0 ? void 0 : character.avatarUrl) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: character.avatarUrl,
                                alt: character.name,
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$app$2f$chat$2f$chat$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].emptyAvatar,
                                width: 80,
                                height: 80
                            }, void 0, false, {
                                fileName: "[project]/apps/web/src/app/chat/page.tsx",
                                lineNumber: 40,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$app$2f$chat$2f$chat$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].emptyTitle,
                                children: [
                                    "Start chatting with ",
                                    (_character_name = character === null || character === void 0 ? void 0 : character.name) !== null && _character_name !== void 0 ? _character_name : "..."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/src/app/chat/page.tsx",
                                lineNumber: 48,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$app$2f$chat$2f$chat$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].emptySubtitle,
                                children: character === null || character === void 0 ? void 0 : character.description
                            }, void 0, false, {
                                fileName: "[project]/apps/web/src/app/chat/page.tsx",
                                lineNumber: 51,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/src/app/chat/page.tsx",
                        lineNumber: 38,
                        columnNumber: 11
                    }, this),
                    messages.map((message)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatBubble$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChatBubble"], {
                            message: message
                        }, message.id, false, {
                            fileName: "[project]/apps/web/src/app/chat/page.tsx",
                            lineNumber: 58,
                            columnNumber: 11
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        ref: bottomRef,
                        style: {
                            height: 2
                        }
                    }, void 0, false, {
                        fileName: "[project]/apps/web/src/app/chat/page.tsx",
                        lineNumber: 61,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/src/app/chat/page.tsx",
                lineNumber: 36,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$app$2f$chat$2f$chat$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].errorBar,
                children: error
            }, void 0, false, {
                fileName: "[project]/apps/web/src/app/chat/page.tsx",
                lineNumber: 65,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$ChatInput$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChatInput"], {
                onSend: sendMessage,
                disabled: isStreaming
            }, void 0, false, {
                fileName: "[project]/apps/web/src/app/chat/page.tsx",
                lineNumber: 68,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/src/app/chat/page.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, this);
}
_s(ChatPage, "qe2SldbCJx5BB2qkFYaKdgIi7oY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$hooks$2f$useChat$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChat"]
    ];
});
_c = ChatPage;
var _c;
__turbopack_context__.k.register(_c, "ChatPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_web_src_39e2a5b8._.js.map