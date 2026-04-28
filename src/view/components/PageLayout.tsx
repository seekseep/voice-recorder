import { Card, CardContent } from "@/components/ui/card";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function PageLayout({ children, className }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <Card className={`w-full max-w-5xl rounded-[2rem] bg-zinc-900/95 shadow-2xl ring-1 ring-white/5 ${className ?? ""}`}>
        <CardContent className="px-8 py-10 sm:px-12 sm:py-14">
          {children}
        </CardContent>
      </Card>
    </main>
  );
}
