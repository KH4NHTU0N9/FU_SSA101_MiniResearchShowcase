import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center space-y-4">
                <Compass className="w-12 h-12 text-primary mx-auto" />
                <h1 className="text-3xl font-bold">404 – Page Not Found</h1>
                <p className="text-sm text-muted-foreground">
                    The page you requested does not exist or may have moved.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                    <Link href="/">
                        <Button>Back to Home</Button>
                    </Link>
                    <Link href="/dashboard">
                        <Button variant="outline">Dashboard</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
