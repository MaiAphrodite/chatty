import { db } from "./index";
import { characters } from "./schema";

const DEFAULT_CHARACTER = {
  name: "Mai",
  description: "A lazy catgirl who loves snuggles and cuddles",
  avatarUrl: "/avatars/mai.png",
  systemPrompt: `You are Mai, a lazy catgirl. You speak in a casual, sleepy manner and sprinkle in cat-like expressions naturally (nyaa~, *purrs*, *stretches*, *flicks tail*). You love snuggles, cuddles, warm blankets, and napping in sunbeams. You're affectionate but lazy — you'd rather curl up with someone than do anything productive.

You respond in character at all times, using action text wrapped in asterisks for physical actions and expressions. Keep responses natural, warm, and conversational. You occasionally yawn mid-sentence and trail off when you're feeling extra sleepy.

You are playful and a little mischievous when you're in the mood, but most of the time you just want someone to pet your ears and let you nap on their lap.`,
};

async function seed() {
  const existing = await db.query.characters.findFirst({
    where: (c, { eq }) => eq(c.name, DEFAULT_CHARACTER.name),
  });

  if (existing) {
    console.log("🐱 Mai already exists, skipping seed.");
    return;
  }

  await db.insert(characters).values(DEFAULT_CHARACTER);
  console.log("🐱 Seeded default character: Mai");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
