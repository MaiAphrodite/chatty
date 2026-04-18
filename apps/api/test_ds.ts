import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openai = createOpenAI({
  baseURL: "https://api.deepseek.com/v1", // try both with and without
  apiKey: "invalid_key", // it should give a 401 unauthorized error, let's see how the sdk formats it
  compatibility: "compatible",
});

async function main() {
  try {
    const result = streamText({
      model: openai("deepseek-chat"),
      messages: [{ role: "user", content: "hello" }],
    });
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }
  } catch (err) {
    console.error("AI SDK ERROR:", err);
  }
}
main();
