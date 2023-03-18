import { headers } from "src/config.js";
import { z } from "zod";

export const Brewery = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  brewery_type: z.enum(["id", ...headers]),
  address_1: z.union([z.string(), z.null()]).optional(),
  address_2: z.union([z.string(), z.null()]).optional(),
  address_3: z.union([z.string(), z.null()]).optional(),
  city: z.string().min(2),
  state_province: z.string().min(2),
  postal_code: z.union([z.string().min(5), z.number()]),
  country: z.string().min(2),
  phone: z.union([z.string(), z.number(), z.null()]).optional(),
  website_url: z.union([z.string(), z.null()]).optional(),
  longitude: z.union([z.number(), z.null()]).optional(),
  latitude: z.union([z.number(), z.null()]).optional(),
});

export type Brewery = z.infer<typeof Brewery>;
