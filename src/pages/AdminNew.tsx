import { DataOrbitZoneManager } from "@/components/admin/DataOrbitZoneManager";
import { SearchProjectManager } from "@/components/admin/SearchProjectManager";
import { TejaStarinManager } from "@/components/admin/TejaStarinManager";
import { PreLandingEditor } from "@/components/admin/PreLandingEditor";
import { RelatedSearchManager } from "@/components/admin/RelatedSearchManager";
import { EmailCaptureViewer } from "@/components/admin/EmailCaptureViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dataOrbitZoneClient } from "@/integrations/dataorbitzone/client";
import { searchProjectClient } from "@/integrations/searchproject/client";
import { supabase } from "@/integrations/supabase/client";

export default function AdminNew() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">External Projects Admin</h1>
        <Tabs defaultValue="dataorbitzone">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dataorbitzone">DataOrbitZone</TabsTrigger>
            <TabsTrigger value="searchproject">SearchProject</TabsTrigger>
            <TabsTrigger value="tejastarin">Teja Starin</TabsTrigger>
            <TabsTrigger value="topicmingle">TopicMingle</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dataorbitzone" className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">DataOrbitZone Management</h2>
              <Tabs defaultValue="content">
                <TabsList>
                  <TabsTrigger value="content">Blogs</TabsTrigger>
                  <TabsTrigger value="searches">Related Searches</TabsTrigger>
                  <TabsTrigger value="prelanding">Pre-Landing</TabsTrigger>
                  <TabsTrigger value="emails">Emails</TabsTrigger>
                </TabsList>
                <TabsContent value="content">
                  <DataOrbitZoneManager />
                </TabsContent>
                <TabsContent value="searches">
                  <RelatedSearchManager projectClient={dataOrbitZoneClient} />
                </TabsContent>
                <TabsContent value="prelanding">
                  <PreLandingEditor projectClient={dataOrbitZoneClient} projectName="DataOrbitZone" />
                </TabsContent>
                <TabsContent value="emails">
                  <EmailCaptureViewer projectClient={dataOrbitZoneClient} />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
          
          <TabsContent value="searchproject" className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">SearchProject Management</h2>
              <SearchProjectManager />
            </div>
          </TabsContent>
          
          <TabsContent value="tejastarin" className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Teja Starin Management</h2>
              <TejaStarinManager />
            </div>
          </TabsContent>
          
          <TabsContent value="topicmingle" className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">TopicMingle Management</h2>
              <Tabs defaultValue="searches">
                <TabsList>
                  <TabsTrigger value="searches">Related Searches</TabsTrigger>
                  <TabsTrigger value="prelanding">Pre-Landing</TabsTrigger>
                  <TabsTrigger value="emails">Emails</TabsTrigger>
                </TabsList>
                <TabsContent value="searches">
                  <RelatedSearchManager projectClient={supabase} />
                </TabsContent>
                <TabsContent value="prelanding">
                  <PreLandingEditor projectClient={supabase} projectName="TopicMingle" />
                </TabsContent>
                <TabsContent value="emails">
                  <EmailCaptureViewer projectClient={supabase} />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
