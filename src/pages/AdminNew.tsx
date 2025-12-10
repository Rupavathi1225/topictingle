import { UnifiedAnalytics } from "@/components/admin/UnifiedAnalytics";
import { TopicMingleAnalytics } from "@/components/admin/TopicMingleAnalytics";
import { TejaStarinAnalytics } from "@/components/admin/TejaStarinAnalytics";
import { FastMoneyAnalytics } from "@/components/admin/FastMoneyAnalytics";
import { OfferGrabZoneAnalytics } from "@/components/admin/OfferGrabZoneAnalytics";
import { MingleMoodyAnalytics } from "@/components/admin/MingleMoodyAnalytics";
import { DataOrbitAnalytics } from "@/components/admin/DataOrbitAnalytics";
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
          <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:inline-grid">
            <TabsTrigger value="all">All Sites</TabsTrigger>
            <TabsTrigger value="topicmingle">Topic Tingle</TabsTrigger>
            <TabsTrigger value="datacreditzone">DataCreditZone</TabsTrigger>
            <TabsTrigger value="fastmoney">FastMoney</TabsTrigger>
            <TabsTrigger value="offergrabzone">OfferGrabZone</TabsTrigger>
            <TabsTrigger value="minglemoody">MingleMoody</TabsTrigger>
            <TabsTrigger value="dataorbit" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">DataOrbit</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <UnifiedAnalytics />
          </TabsContent>
          
          <TabsContent value="topicmingle" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Topic Tingle Analytics</h2>
              <p className="text-muted-foreground">Detailed analytics for Topic Tingle website</p>
            </div>
            <TopicMingleAnalytics />
          </TabsContent>
          
          <TabsContent value="datacreditzone" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">DataCreditZone Analytics</h2>
              <p className="text-muted-foreground">Detailed analytics for DataCreditZone website</p>
            </div>
            <TejaStarinAnalytics />
          </TabsContent>
          
          <TabsContent value="fastmoney" className="space-y-4">
            <div className="mb-4 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
              <h2 className="text-2xl font-bold text-white">💰 FastMoney Analytics</h2>
              <p className="text-zinc-400">Detailed analytics for FastMoney website</p>
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

          <TabsContent value="minglemoody" className="space-y-4">
            <div className="mb-4 p-4 rounded-lg bg-zinc-900 border border-cyan-800">
              <h2 className="text-2xl font-bold text-cyan-400">💬 MingleMoody Analytics</h2>
              <p className="text-zinc-400">Detailed analytics for MingleMoody website</p>
            </div>
            <MingleMoodyAnalytics />
          </TabsContent>

          <TabsContent value="dataorbit" className="space-y-4">
            <div className="mb-4 p-4 rounded-lg bg-zinc-900 border border-indigo-800">
              <h2 className="text-2xl font-bold text-indigo-400">🌐 DataOrbit Analytics</h2>
              <p className="text-zinc-400">Detailed analytics for DataOrbit website</p>
            </div>
            <DataOrbitAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
