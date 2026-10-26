import { z } from "zod";
import { GUILD_SCOPES } from "./config.ts";

const optionalText = z
  .string()
  .nullable()
  .optional()
  .transform((value) => value?.trim() || null);

const countryCodes = new Set(
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " "
  )
);

export const Guild = z
  .object({
    id: z.string().uuid(),
    scope: z.enum(GUILD_SCOPES),
    country_code: z.string().refine((value) => countryCodes.has(value), {
      message: "Country code must be an ISO 3166-1 alpha-2 code",
    }),
    country: z.string().min(2).transform((value) => value.trim()),
    subdivision_code: optionalText.pipe(z.string().regex(/^[A-Z0-9]{1,3}$/).nullable()),
    subdivision: optionalText,
    organization: z.string().min(1).transform((value) => value.trim()),
    website: z
      .string()
      .url()
      .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
        message: "Website must use HTTP or HTTPS",
      })
      .nullable()
      .optional()
      .transform((value) => value?.trim() || null),
  })
  .superRefine((guild, context) => {
    const hasSubdivision = guild.subdivision_code !== null && guild.subdivision !== null;
    if (guild.scope === "national" && hasSubdivision) {
      context.addIssue({
        code: "custom",
        path: ["subdivision"],
        message: "National records cannot have a subdivision",
      });
    }
    if (guild.scope === "national" && (guild.subdivision_code !== null || guild.subdivision !== null)) {
      context.addIssue({
        code: "custom",
        path: ["subdivision_code"],
        message: "National subdivision fields must both be empty",
      });
    }
    if (guild.scope !== "national" && !hasSubdivision) {
      context.addIssue({
        code: "custom",
        path: ["subdivision"],
        message: "Subdivision and regional records require both subdivision fields",
      });
    }
  });

export type Guild = z.infer<typeof Guild>;
