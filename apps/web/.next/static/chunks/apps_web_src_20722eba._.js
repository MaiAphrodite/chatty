(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/src/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ApiError",
    ()=>ApiError,
    "api",
    ()=>api
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$swc$2b$helpers$40$0$2e$5$2e$15$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@swc+helpers@0.5.15/node_modules/@swc/helpers/esm/_define_property.js [app-client] (ecmascript)");
;
const BASE = "/api";
async function request(path) {
    let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const response = await fetch("".concat(BASE).concat(path), {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        },
        ...options
    });
    if (!response.ok) {
        const body = await response.json().catch(()=>({}));
        throw new ApiError(response.status, body.message || "Request failed (".concat(response.status, ")"));
    }
    return response.json();
}
class ApiError extends Error {
    constructor(status, message){
        super(message), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$swc$2b$helpers$40$0$2e$5$2e$15$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "status", void 0), this.status = status;
        this.name = "ApiError";
    }
}
const api = {
    register (username, password) {
        return request("/auth/register", {
            method: "POST",
            body: JSON.stringify({
                username,
                password
            })
        });
    },
    login (username, password) {
        return request("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                username,
                password
            })
        });
    },
    logout () {
        return request("/auth/logout", {
            method: "POST"
        });
    },
    getMe () {
        return request("/auth/me");
    },
    getCharacters () {
        return request("/characters");
    },
    getConversations () {
        return request("/chat/conversations");
    },
    createConversation (characterId) {
        return request("/chat/conversations", {
            method: "POST",
            body: JSON.stringify({
                characterId
            })
        });
    },
    getMessages (conversationId) {
        return request("/chat/conversations/".concat(conversationId, "/messages"));
    },
    async streamMessage (conversationId, content, onChunk, onDone, onError) {
        try {
            const response = await fetch("".concat(BASE, "/chat/conversations/").concat(conversationId, "/messages"), {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    content
                })
            });
            if (!response.ok) {
                const body = await response.json().catch(()=>({}));
                throw new ApiError(response.status, body.message || "Stream request failed");
            }
            if (!response.body) {
                throw new Error("No response body for streaming");
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while(true){
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, {
                    stream: true
                });
                const lines = chunk.split("\n");
                for (const line of lines){
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") continue;
                    try {
                        var _parsed_choices__delta, _parsed_choices_, _parsed_choices;
                        const parsed = JSON.parse(data);
                        const delta = (_parsed_choices = parsed.choices) === null || _parsed_choices === void 0 ? void 0 : (_parsed_choices_ = _parsed_choices[0]) === null || _parsed_choices_ === void 0 ? void 0 : (_parsed_choices__delta = _parsed_choices_.delta) === null || _parsed_choices__delta === void 0 ? void 0 : _parsed_choices__delta.content;
                        if (delta) onChunk(delta);
                    } catch (e) {
                    // malformed SSE line, skip
                    }
                }
            }
            onDone();
        } catch (error) {
            onError(error instanceof Error ? error : new Error(String(error)));
        }
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/contexts/AuthContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@15.5.15+21ccd8898788a04d/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@15.5.15+21ccd8898788a04d/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
function AuthProvider(param) {
    let { children } = param;
    _s();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getMe().then(setUser).catch({
                "AuthProvider.useEffect": ()=>setUser(null)
            }["AuthProvider.useEffect"]).finally({
                "AuthProvider.useEffect": ()=>setIsLoading(false)
            }["AuthProvider.useEffect"]);
        }
    }["AuthProvider.useEffect"], []);
    const login = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[login]": async (username, password)=>{
            const loggedIn = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].login(username, password);
            setUser(loggedIn);
        }
    }["AuthProvider.useCallback[login]"], []);
    const register = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[register]": async (username, password)=>{
            const created = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].register(username, password);
            setUser(created);
        }
    }["AuthProvider.useCallback[register]"], []);
    const logout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[logout]": async ()=>{
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].logout();
            setUser(null);
        }
    }["AuthProvider.useCallback[logout]"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            isLoading,
            login,
            register,
            logout
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/apps/web/src/contexts/AuthContext.tsx",
        lineNumber: 52,
        columnNumber: 5
    }, this);
}
_s(AuthProvider, "qbiN9HswE+Mb6fXaD9NhPqvg5Co=");
_c = AuthProvider;
function useAuth() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
_s1(useAuth, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/components/ServiceWorkerRegistrar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ServiceWorkerRegistrar",
    ()=>ServiceWorkerRegistrar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@15.5.15+21ccd8898788a04d/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
function ServiceWorkerRegistrar() {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$15$2e$5$2e$15$2b$21ccd8898788a04d$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ServiceWorkerRegistrar.useEffect": ()=>{
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.register("/sw.js").catch({
                    "ServiceWorkerRegistrar.useEffect": ()=>{
                    // SW registration failed silently — non-critical for v0.1
                    }
                }["ServiceWorkerRegistrar.useEffect"]);
            }
        }
    }["ServiceWorkerRegistrar.useEffect"], []);
    return null;
}
_s(ServiceWorkerRegistrar, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = ServiceWorkerRegistrar;
var _c;
__turbopack_context__.k.register(_c, "ServiceWorkerRegistrar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_web_src_20722eba._.js.map