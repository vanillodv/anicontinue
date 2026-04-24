import { z } from 'zod';

const customCharacterSchema = z.object({
  name: z.string().min(1).max(50),
  role: z.string().max(200),
});

export const generateSchema = z.object({
  animeId: z.number().min(1),
  mood: z.enum(['Экшн', 'Драма', 'Романтика', 'Юмор']).optional(),
  sceneType: z.enum(['continuation', 'alternative', 'own-ending']).optional(),
  endingContext: z.string().max(400).optional(),
  startingPoint: z.string().max(400).optional(),
  continuePrevious: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  customCharacters: z.array(customCharacterSchema).max(5).optional(),
});

export type CustomCharacter = z.infer<typeof customCharacterSchema>;

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/<script.*>.*<\/script>/gi, '')
    .replace(/{{.*}}/g, '')
    .replace(/\[(?![\u3000-\u9fff])[^\]]*\]/g, '')
    .replace(/https:\/\/[^\s]+/g, '')
    .slice(0, 400)
    .trim();
}
