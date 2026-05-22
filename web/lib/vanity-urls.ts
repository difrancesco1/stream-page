export type VanityUrl = {
  source: string;
  destination: string;
  permanent?: boolean;
};

export const vanityUrls: VanityUrl[] = [
  { source: "/boosted", destination: "https://imgur.com/a/26fA7oN" },
  {
    source: "/diao",
    destination:
      "https://shoutatyourdecks.com/decks/3c5cd907-6145-467e-9729-875ce7296557",
  },
  { source: "/discord", destination: "https://discord.com/invite/SdMdRyAkRJ" },
  { source: "/donate", destination: "https://streamelements.com/rosie-6691/tip" },
  {
    source: "/opgg",
    destination:
      "https://op.gg/lol/multisearch/na?summoners=ignisfirebloom%23pass%2Cziggs7%23rosie%2Cduoanyone%23addme%2CNEW+PLAYER%23CHUD",
  },
  {
    source: "/playlist",
    destination:
      "https://open.spotify.com/playlist/5OUgqXjiG8begRdLpy3sMO?si=0a734e54074c4bf3",
  },
  { source: "/ref", destination: "https://imgur.com/a/AB08LB9" },
  { source: "/tiktok", destination: "https://www.tiktok.com/@roziggz" },
  { source: "/twitter", destination: "https://x.com/roziggz" },
  { source: "/youtube", destination: "https://www.youtube.com/@roziggz" },
  { source: "/duo", destination: "/?card=duoTracker" },
  { source: "/first", destination: "/?card=firstTracker" },
];
