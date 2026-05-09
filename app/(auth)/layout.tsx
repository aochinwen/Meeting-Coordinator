export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-full bg-board text-text-primary font-nunito">
      {children}
    </div>
  );
}
