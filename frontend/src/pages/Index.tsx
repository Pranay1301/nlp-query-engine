import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AuthComponent from "@/components/AuthComponent";
import DatabaseConnector from "@/components/DatabaseConnector";
import DocumentUploader from "@/components/DocumentUploader";
import QueryInterface from "@/components/QueryInterface";
import MetricsDashboard from "@/components/MetricsDashboard";
import { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthComponent />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            NLP Query Engine for Employee Data
          </h1>
          <p className="text-xl text-gray-300 mb-4">
            Intelligent natural language querying for databases and documents
          </p>
          <div className="flex justify-between items-center">
            <div className="text-gray-300">
              Welcome, {user.email}
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Interface */}
        <Tabs defaultValue="connect" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-sm">
            <TabsTrigger value="connect" className="text-white data-[state=active]:bg-white/20">
              Connect Data
            </TabsTrigger>
            <TabsTrigger value="query" className="text-white data-[state=active]:bg-white/20">
              Query Interface
            </TabsTrigger>
            <TabsTrigger value="metrics" className="text-white data-[state=active]:bg-white/20">
              Metrics
            </TabsTrigger>
            <TabsTrigger value="history" className="text-white data-[state=active]:bg-white/20">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connect" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Database Connection</CardTitle>
                  <CardDescription className="text-gray-300">
                    Connect to your database and discover schema automatically
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DatabaseConnector />
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Document Upload</CardTitle>
                  <CardDescription className="text-gray-300">
                    Upload employee documents (PDF, DOCX, CSV) for semantic search
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentUploader />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="query">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Natural Language Query Interface</CardTitle>
                <CardDescription className="text-gray-300">
                  Ask questions in plain English about your employee data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QueryInterface />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <MetricsDashboard />
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Query History</CardTitle>
                <CardDescription className="text-gray-300">
                  View your previous queries and their performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-white">Query history will be displayed here</div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;