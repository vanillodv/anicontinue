import { Anime } from "@/types";
import { batch1 } from "./batches/batch1";
import { batch2 } from "./batches/batch2";
import { batch3 } from "./batches/batch3";
import { batch4 } from "./batches/batch4";

export const seedAnime: Partial<Anime>[] = [
  ...batch1,
  ...batch2,
  ...batch3,
  ...batch4,
];
