import { NoAccessPage } from "@/components/no-access-page";
import { Toaster } from "@/components/ui/toaster";

export default function NotAccessPage() {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <NoAccessPage />
        <Toaster />
      </div>
    );
}
