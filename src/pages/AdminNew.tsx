import { UnifiedAnalytics } from "@/components/admin/UnifiedAnalytics";

export default function AdminNew() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🌐 Multi-Site Analytics Hub</h1>
          <p className="text-muted-foreground">Combined analytics across all your websites</p>
        </div>
        <UnifiedAnalytics />
      </div>
    </div>
  );
}
