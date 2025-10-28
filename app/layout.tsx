export const metadata = {
  title: "OCOS Trade Portal",
  description: "Buy & Sell OCOS + 21-Chain Swap",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-black text-white">
        {children}
      </body>
    </html>
  );
}
