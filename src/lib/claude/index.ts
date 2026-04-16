import Anthropic from '@anthropic-ai/sdk';
import { generateChapterPrompt } from '@/lib/prompts';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function generateChapter(
  animeTitle: string,
  synopsis: string,
  chapterNumber: number,
  previousContent?: string
): Promise<string> {
  const prompt = generateChapterPrompt(animeTitle, synopsis, chapterNumber, previousContent);

  const message = await anthropic.messages.create({
    model: 'claude-haiku-20240307',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type === 'text') {
    return content.text;
  }

  throw new Error('Не удалось сгенерировать главу');
}
