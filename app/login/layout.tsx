/**
 * Minimal layout for the /login route — rendered without the global
 * Sidebar and Header so the auth page is full-screen.
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
