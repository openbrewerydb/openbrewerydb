import { BREWERY_TYPES } from "./config";
import { z } from "zod";

export const Brewery = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  brewery_type: z.enum(BREWERY_TYPES),
  address_1: z.string().nullable().optional(),
  address_2: z.string().nullable().optional(),
  address_3: z.string().nullable().optional(),
  city: z.string().min(2),
  state_province: z.string().min(2),
  postal_code: z.coerce.string().min(5),
  country: z.string().min(2),
  phone: z.coerce.string().nullable().optional(),
  website_url: z.string().url().nullable().optional(),
  longitude: z.coerce.number().nullable().optional(),
  latitude: z.coerce.number().nullable().optional(),
});

export type Brewery = z.infer<typeof Brewery>;
