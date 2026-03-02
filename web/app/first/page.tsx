"use client"


async rewrites() {
  return [
    {
      source: "/opgg",
      destination: "/?card=opgg",
    },
  ];
},