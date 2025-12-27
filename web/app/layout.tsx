import "./globals.css";
import "./styles/pixel-borders.scss";
import "@hackernoon/pixel-icon-library/fonts/iconfont.css";
import { Silkscreen } from "next/font/google";
import { AuthProvider } from "./context/auth-context";

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
      <body className={silkscreen.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
