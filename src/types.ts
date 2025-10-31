import { BREWERY_TYPES } from "./config";
import { z } from "zod";

export const Brewery = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).transform(val => val.trim()),
  brewery_type: z.enum(BREWERY_TYPES),
  address_1: z.string().nullable().optional().transform(val => val?.trim() ?? null),
  address_2: z.string().nullable().optional().transform(val => val?.trim() ?? null),
  address_3: z.string().nullable().optional().transform(val => val?.trim() ?? null),
  city: z.string().min(2).transform(val => val.trim()),
  state_province: z.string().min(2).transform(val => val.trim()),
  postal_code: z.coerce.string().min(3).transform(val => val.trim()),
  country: z.string().min(2).transform(val => val.trim()),
  phone: z.coerce.string().nullable().optional().transform(val => val?.trim() ?? null),
  website_url: z.string().url().nullable().optional().transform(val => val?.trim() ?? null),
  longitude: z.coerce.number().nullable().optional(),
  latitude: z.coerce.number().nullable().optional(),
});

export type Brewery = z.infer<typeof Brewery>;
