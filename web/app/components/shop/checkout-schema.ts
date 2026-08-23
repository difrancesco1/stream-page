import { z } from "zod";

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
] as const;

export const CA_PROVINCE = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", 
  "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
] as const;

export type UsStateCode = (typeof US_STATES)[number];

const usStateSet = new Set<string>(US_STATES);

const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

// ISO 3166-1 alpha-2 codes accepted by both Stripe and PayPal. US and CA are
// listed first for convenience; the rest are alphabetical by country name.
export const SHIPPING_COUNTRY_LABELS = {
  US: "United States",
  CA: "Canada",
  AF: "Afghanistan",
  AL: "Albania",
  DZ: "Algeria",
  AD: "Andorra",
  AO: "Angola",
  AG: "Antigua and Barbuda",
  AR: "Argentina",
  AM: "Armenia",
  AU: "Australia",
  AT: "Austria",
  AZ: "Azerbaijan",
  BS: "Bahamas",
  BH: "Bahrain",
  BD: "Bangladesh",
  BB: "Barbados",
  BE: "Belgium",
  BZ: "Belize",
  BJ: "Benin",
  BM: "Bermuda",
  BT: "Bhutan",
  BO: "Bolivia",
  BA: "Bosnia and Herzegovina",
  BW: "Botswana",
  BR: "Brazil",
  BN: "Brunei",
  BG: "Bulgaria",
  BF: "Burkina Faso",
  BI: "Burundi",
  KH: "Cambodia",
  CM: "Cameroon",
  CV: "Cape Verde",
  KY: "Cayman Islands",
  CL: "Chile",
  CN: "China",
  CO: "Colombia",
  CR: "Costa Rica",
  HR: "Croatia",
  CY: "Cyprus",
  CZ: "Czechia",
  DK: "Denmark",
  DM: "Dominica",
  DO: "Dominican Republic",
  EC: "Ecuador",
  EG: "Egypt",
  SV: "El Salvador",
  EE: "Estonia",
  ET: "Ethiopia",
  FJ: "Fiji",
  FI: "Finland",
  FR: "France",
  GA: "Gabon",
  GM: "Gambia",
  GE: "Georgia",
  DE: "Germany",
  GH: "Ghana",
  GR: "Greece",
  GD: "Grenada",
  GT: "Guatemala",
  GN: "Guinea",
  GY: "Guyana",
  HT: "Haiti",
  HN: "Honduras",
  HK: "Hong Kong",
  HU: "Hungary",
  IS: "Iceland",
  IN: "India",
  ID: "Indonesia",
  IE: "Ireland",
  IL: "Israel",
  IT: "Italy",
  JM: "Jamaica",
  JP: "Japan",
  JO: "Jordan",
  KZ: "Kazakhstan",
  KE: "Kenya",
  KR: "South Korea",
  KW: "Kuwait",
  KG: "Kyrgyzstan",
  LA: "Laos",
  LV: "Latvia",
  LB: "Lebanon",
  LS: "Lesotho",
  LR: "Liberia",
  LI: "Liechtenstein",
  LT: "Lithuania",
  LU: "Luxembourg",
  MO: "Macao",
  MG: "Madagascar",
  MW: "Malawi",
  MY: "Malaysia",
  MV: "Maldives",
  ML: "Mali",
  MT: "Malta",
  MU: "Mauritius",
  MX: "Mexico",
  MD: "Moldova",
  MC: "Monaco",
  MN: "Mongolia",
  ME: "Montenegro",
  MA: "Morocco",
  MZ: "Mozambique",
  NA: "Namibia",
  NP: "Nepal",
  NL: "Netherlands",
  NZ: "New Zealand",
  NI: "Nicaragua",
  NE: "Niger",
  NG: "Nigeria",
  MK: "North Macedonia",
  NO: "Norway",
  OM: "Oman",
  PK: "Pakistan",
  PA: "Panama",
  PG: "Papua New Guinea",
  PY: "Paraguay",
  PE: "Peru",
  PH: "Philippines",
  PL: "Poland",
  PT: "Portugal",
  QA: "Qatar",
  RO: "Romania",
  RW: "Rwanda",
  KN: "Saint Kitts and Nevis",
  LC: "Saint Lucia",
  VC: "Saint Vincent and the Grenadines",
  WS: "Samoa",
  SM: "San Marino",
  SA: "Saudi Arabia",
  SN: "Senegal",
  RS: "Serbia",
  SC: "Seychelles",
  SL: "Sierra Leone",
  SG: "Singapore",
  SK: "Slovakia",
  SI: "Slovenia",
  SB: "Solomon Islands",
  ZA: "South Africa",
  ES: "Spain",
  LK: "Sri Lanka",
  SR: "Suriname",
  SE: "Sweden",
  CH: "Switzerland",
  TW: "Taiwan",
  TJ: "Tajikistan",
  TZ: "Tanzania",
  TH: "Thailand",
  TL: "Timor-Leste",
  TG: "Togo",
  TO: "Tonga",
  TT: "Trinidad and Tobago",
  TN: "Tunisia",
  TR: "Türkiye",
  TM: "Turkmenistan",
  UG: "Uganda",
  UA: "Ukraine",
  AE: "United Arab Emirates",
  GB: "United Kingdom",
  UY: "Uruguay",
  UZ: "Uzbekistan",
  VU: "Vanuatu",
  VN: "Vietnam",
  ZM: "Zambia",
  ZW: "Zimbabwe",
} as const;

export type ShippingCountry = keyof typeof SHIPPING_COUNTRY_LABELS;

export const SHIPPING_COUNTRIES = Object.keys(
  SHIPPING_COUNTRY_LABELS,
) as ShippingCountry[];

export const SHIPPING_METHODS = [
  "tracking",
  "no_tracking",
  "pickup",
  "international",
] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const PICKUP_ALLOWED_STATES = new Set<UsStateCode>(["WA"]);

const baseCheckoutObject = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.email("Enter a valid email"),
  discordHandle: z
    .string()
    .trim()
    .min(2, "Discord handle is required")
    .max(50),
  shippingStreet: z.string().trim().min(1, "Street is required").max(300),
  shippingCity: z.string().trim().min(1, "City is required").max(100),
  shippingState: z
    .string()
    .trim()
    .min(1, "State/Province is required")
    .max(100),
  shippingZip: z
    .string()
    .trim()
    .min(1, "Postal code is required")
    .max(20),
  notes: z.string().trim().max(2000, "Notes are too long").optional(),
});

// Enforce the strict US state + ZIP rules. Shared by the public US checkout
// path and the admin in-person flow (which is US-only).
function refineUsAddress(
  values: { shippingState: string; shippingZip: string },
  ctx: z.RefinementCtx,
): void {
  if (!usStateSet.has(values.shippingState)) {
    ctx.addIssue({
      code: "custom",
      path: ["shippingState"],
      message: "Pick a state",
    });
  }
  if (!US_ZIP_REGEX.test(values.shippingZip)) {
    ctx.addIssue({
      code: "custom",
      path: ["shippingZip"],
      message: "Enter a valid ZIP",
    });
  }
}

export const checkoutSchema = baseCheckoutObject
  .extend({
    shippingCountry: z.enum(
      SHIPPING_COUNTRIES as [ShippingCountry, ...ShippingCountry[]],
      {
        error: "Pick a country",
      },
    ),
    shippingMethod: z.enum(SHIPPING_METHODS, {
      error: "Pick a shipping option",
    }),
  })
  .superRefine((values, ctx) => {
    if (values.shippingCountry === "US") {
      refineUsAddress(values, ctx);
      if (values.shippingMethod === "international") {
        ctx.addIssue({
          code: "custom",
          path: ["shippingMethod"],
          message: "Pick a US shipping option",
        });
      }
      if (
        values.shippingMethod === "pickup" &&
        !PICKUP_ALLOWED_STATES.has(values.shippingState as UsStateCode)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["shippingMethod"],
          message: "Pickup is only available for WA addresses",
        });
      }
    } else if (values.shippingMethod !== "international") {
      ctx.addIssue({
        code: "custom",
        path: ["shippingMethod"],
        message: "Select international shipping",
      });
    }
  });

// Admin in-person flow keeps the original required-field set without a
// shipping-method picker — they're handing the order over in person. It stays
// US-only, so re-apply the strict US state + ZIP rules relaxed on the base.
export const customOrderSchema = baseCheckoutObject.superRefine(
  refineUsAddress,
);

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
export type CustomOrderFormValues = z.infer<typeof customOrderSchema>;
