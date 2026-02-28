import "../styles/globals.css";

export const metadata = {
  title: "BaristaPro",
  description: "Guia interativo para calibrar seu café expresso.",
};

export default function RootLayout({children}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <div>{children}</div>
      </body>
    </html>
  );
}
