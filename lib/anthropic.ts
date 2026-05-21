import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "placeholder",
});

export class AiBusyError extends Error {
  constructor() {
    super("ai_busy");
    this.name = "AiBusyError";
  }
}

// Wraps any anthropic call and converts RateLimitError → AiBusyError so
// every route can handle it with a single catch branch.
export async function callAnthropic<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new AiBusyError();
    throw err;
  }
}
