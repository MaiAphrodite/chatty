import { decryptKey, encryptKey } from "./src/services/crypto.ts";

const raw = "uIiqiyPEnhn+IWlK:CP5ejPBoyIhZRfdp6DeL2g==:cOVT8/RQMXtpK4tO1psIqk+UhhJgYLtnEcQIgePrIAMyav47q6UdQGn1BgkY99HdOn0NCv7nlrURB7/Xr8bDLyqgSLeDsLHHFsBugweS5ARhCzHh";
console.log(decryptKey(raw));
