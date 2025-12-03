import { UnifiedAnalytics } from "@/components/admin/UnifiedAnalytics";
import { TopicMingleAnalytics } from "@/components/admin/TopicMingleAnalytics";
import { TejaStarinAnalytics } from "@/components/admin/TejaStarinAnalytics";
import { FastMoneyAnalytics } from "@/components/admin/FastMoneyAnalytics";
import { OfferGrabZoneAnalytics } from "@/components/admin/OfferGrabZoneAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminNew() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🌐 Multi-Site Analytics Hub</h1>
          <p className="text-muted-foreground">Combined analytics across all your websites</p>
        </div>
        
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="all">All Sites</TabsTrigger>
            <TabsTrigger value="topicmingle">TopicMingle</TabsTrigger>
            <TabsTrigger value="tejastarin">Teja Starin</TabsTrigger>
            <TabsTrigger value="fastmoney">FastMoney</TabsTrigger>
            <TabsTrigger value="offergrabzone" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">OfferGrabZone</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <UnifiedAnalytics />
          </TabsContent>
          
          <TabsContent value="topicmingle" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">TopicMingle Analytics</h2>
              <p className="text-muted-foreground">Detailed analytics for TopicMingle website</p>
            </div>
            <TopicMingleAnalytics />
          </TabsContent>
          
          <TabsContent value="tejastarin" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Teja Starin Analytics</h2>
              <p className="text-muted-foreground">Detailed analytics for Teja Starin website</p>
            </div>
            <TejaStarinAnalytics />
          </TabsContent>
          
          <TabsContent value="fastmoney" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">💰 FastMoney Analytics</h2>
              <p className="text-muted-foreground">Detailed analytics for FastMoney website</p>
            </div>
            <FastMoneyAnalytics />
          </TabsContent>

          <TabsContent value="offergrabzone" className="space-y-4">
            <div className="mb-4 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
              <h2 className="text-2xl font-bold text-white">🎁 OfferGrabZone Analytics</h2>
              <p className="text-zinc-400">Detailed analytics for OfferGrabZone website</p>
            </div>
            <OfferGrabZoneAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
