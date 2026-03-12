import { ProfileShell } from "@/components/profile-shell";

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(37,99,235,0.18),transparent_22%)]" />
      <div className="container relative py-10 md:py-16">
        <ProfileShell />
      </div>
    </main>
  );
}
