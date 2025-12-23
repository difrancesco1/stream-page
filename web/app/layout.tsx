import "./globals.css";
import "./pixel-borders.scss";
import "@hackernoon/pixel-icon-library/fonts/iconfont.css";
import { Silkscreen } from "next/font/google";

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={silkscreen.className}>{children}</body>
    </html>
  );
}