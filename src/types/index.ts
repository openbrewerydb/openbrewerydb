import { z } from "zod";

export const BREWERY_TYPES = [
  "alt prop",
  "bar",
  "beer brand",
  "brewpub",
  "cidery",
  "closed",
  "contract",
  "large",
  "location",
  "micro",
  "nano",
  "office only location",
  "planning",
  "proprietor",
  "regional",
  "taproom",
] as const;

export const Brewery = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  brewery_type: z.enum(BREWERY_TYPES),
  address_1: z.string().nullable().optional(),
  address_2: z.string().nullable().optional(),
  address_3: z.string().nullable().optional(),
  city: z.string().min(2),
  state_province: z.string().min(2),
  postal_code: z.coerce.string().min(3),
  country: z.string().min(2),
  phone: z.coerce.string().nullable().optional(),
  website_url: z.string().url().nullable().optional(),
  longitude: z.coerce.number().nullable().optional(),
  latitude: z.coerce.number().nullable().optional(),
});

export type Brewery = z.infer<typeof Brewery>;

interface BrewersAssociationBillingAddress {
  city: string;
  country: string;
  countryCode: string;
  geocodeAccuracy: string;
  latitude: number;
  longitude: number;
  postalCode: string;
  state: string;
  stateCode: string;
  street: string;
}

interface BrewersAssociationAttributes {
  type: string;
  url: string;
}

interface BrewersAssociationParent {
  attributes: {
    type: string;
    url: string;
  };
  Id: string;
  Name: string;
  Is_Craft_Brewery__c: boolean;
  Membership_Record_Item__c: string;
  Membership_Record_Paid_Through_Date__c: string;
  Membership_Record_Status__c: string;
}

export interface BrewersAssociation {
  Id: string;
  Name: string;
  Phone: null | string;
  Website: string;
  Brewery_Type__c: string;
  Is_Craft_Brewery__c: boolean;
  Voting_Member__c: boolean;
  Membership_Record_Item__c: null | string;
  Membership_Record_Paid_Through_Date__c: null | string;
  Membership_Record_Status__c: null | string;
  Account_Badges__c: null | string;
  attributes: BrewersAssociationAttributes;
  BillingAddress: BrewersAssociationBillingAddress;
  Parent: null | BrewersAssociationParent;
}
