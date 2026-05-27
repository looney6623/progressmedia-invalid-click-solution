import "./globals.css";

export const metadata = {
  title: "프로그레스미디어 무효클릭차단 솔루션",
  description: "Invalid click prevention dashboard demo"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
