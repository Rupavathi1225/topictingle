import { UnifiedAnalytics } from "@/components/admin/UnifiedAnalytics";
import { TopicMingleAnalytics } from "@/components/admin/TopicMingleAnalytics";
import { DataOrbitZoneAnalytics } from "@/components/admin/DataOrbitZoneAnalytics";
import { SearchProjectAnalytics } from "@/components/admin/SearchProjectAnalytics";
import { TejaStarinAnalytics } from "@/components/admin/TejaStarinAnalytics";
import { FastMoneyAnalytics } from "@/components/admin/FastMoneyAnalytics";
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
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="all">All Sites</TabsTrigger>
            <TabsTrigger value="topicmingle">TopicMingle</TabsTrigger>
            <TabsTrigger value="dataorbitzone">DataOrbitZone</TabsTrigger>
            <TabsTrigger value="searchproject">SearchProject</TabsTrigger>
            <TabsTrigger value="tejastarin">Teja Starin</TabsTrigger>
            <TabsTrigger value="fastmoney">FastMoney</TabsTrigger>
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
          
          <TabsContent value="dataorbitzone" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">DataOrbitZone Analytics</h2>
              <p className="text-muted-foreground">Detailed analytics for DataOrbitZone website</p>
            </div>
            <DataOrbitZoneAnalytics />
          </TabsContent>
          
          <TabsContent value="searchproject" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">SearchProject Analytics</h2>
              <p className="text-muted-foreground">Detailed analytics for SearchProject website</p>
            </div>
            <SearchProjectAnalytics />
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
        </Tabs>
      </div>
    </div>
  );
}
