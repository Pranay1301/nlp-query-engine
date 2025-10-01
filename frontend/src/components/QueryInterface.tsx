import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Database, FileText, Zap, Clock, Target } from "lucide-react";

interface QueryResult {
  queryType: 'sql' | 'document' | 'hybrid';
  sqlResults?: any[];
  documentResults?: any[];
  generatedSQL?: string;
  performanceMetrics: {
    responseTime: number;
    cacheHit: boolean;
    resultsCount: number;
  };
  sources: string[];
}

const QueryInterface = () => {
  const [query, setQuery] = useState("");
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [databases, setDatabases] = useState<any[]>([]);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const { toast } = useToast();

  // Sample queries for demonstration
  const sampleQueries = [
    "How many employees do we have?",
    "Average salary by department",
    "List employees hired this year",
    "Top 5 highest paid employees in each department",
    "Employees with Python skills earning over 100k",
    "Show me performance reviews for engineers",
    "Which departments have the highest turnover?"
  ];

  useEffect(() => {
    loadDatabases();
    loadQueryHistory();
  }, []);

  const loadDatabases = async () => {
    try {
      const { data, error } = await supabase
        .from('discovered_databases_2025_09_30_13_04')
        .select('id, connection_name, database_type, status')
        .eq('status', 'active');

      if (error) throw error;
      setDatabases(data || []);
      
      if (data && data.length > 0 && !selectedDatabase) {
        setSelectedDatabase(data[0].id);
      }
    } catch (error: any) {
      console.error('Error loading databases:', error);
    }
  };

  const loadQueryHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('query_history_2025_09_30_13_04')
        .select('query_text')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setQueryHistory(data?.map(item => item.query_text) || []);
    } catch (error: any) {
      console.error('Error loading query history:', error);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) {
      toast({
        title: "Empty query",
        description: "Please enter a query to search",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('nlp_query_engine_2025_09_30_13_04', {
        body: {
          query: query.trim(),
          databaseId: selectedDatabase
        }
      });

      if (error) throw error;

      setResult(data);
      
      toast({
        title: "Query completed",
        description: `Found ${data.performanceMetrics.resultsCount} results in ${data.performanceMetrics.responseTime}ms`,
      });

      // Reload query history
      await loadQueryHistory();
    } catch (error: any) {
      toast({
        title: "Query failed",
        description: error.message || "Failed to process query",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSampleQuery = (sampleQuery: string) => {
    setQuery(sampleQuery);
  };

  const getQueryTypeIcon = (type: string) => {
    switch (type) {
      case 'sql':
        return <Database className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'hybrid':
        return <Zap className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getQueryTypeColor = (type: string) => {
    switch (type) {
      case 'sql':
        return 'bg-blue-600/20 text-blue-400';
      case 'document':
        return 'bg-green-600/20 text-green-400';
      case 'hybrid':
        return 'bg-purple-600/20 text-purple-400';
      default:
        return 'bg-gray-600/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your employee data..."
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 text-lg py-3"
              onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
            />
          </div>
          <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
            <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Select database" />
            </SelectTrigger>
            <SelectContent>
              {databases.map((db) => (
                <SelectItem key={db.id} value={db.id}>
                  {db.connection_name} ({db.database_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleQuery}
            disabled={loading || !selectedDatabase}
            className="bg-blue-600 hover:bg-blue-700 px-8"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Query
              </>
            )}
          </Button>
        </div>

        {/* Sample Queries */}
        <div className="space-y-2">
          <p className="text-sm text-gray-400">Try these sample queries:</p>
          <div className="flex flex-wrap gap-2">
            {sampleQueries.map((sampleQuery, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSampleQuery(sampleQuery)}
                className="bg-white/5 border-white/20 text-gray-300 hover:bg-white/10 text-xs"
              >
                {sampleQuery}
              </Button>
            ))}
          </div>
        </div>

        {/* Recent Queries */}
        {queryHistory.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Recent queries:</p>
            <div className="flex flex-wrap gap-2">
              {queryHistory.map((historyQuery, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuery(historyQuery)}
                  className="text-gray-400 hover:text-white hover:bg-white/10 text-xs"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {historyQuery.length > 40 ? historyQuery.substring(0, 40) + '...' : historyQuery}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge className={`${getQueryTypeColor(result.queryType)} flex items-center gap-1`}>
                    {getQueryTypeIcon(result.queryType)}
                    {result.queryType.toUpperCase()} Query
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Target className="w-4 h-4" />
                    {result.performanceMetrics.resultsCount} results
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    {result.performanceMetrics.responseTime}ms
                  </div>
                  {result.performanceMetrics.cacheHit && (
                    <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                      Cache Hit
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  Sources: {result.sources.join(', ')}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SQL Results */}
          {result.sqlResults && result.sqlResults.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Database Results
                </CardTitle>
                {result.generatedSQL && (
                  <CardDescription className="text-gray-400">
                    <code className="bg-white/10 px-2 py-1 rounded text-xs">
                      {result.generatedSQL}
                    </code>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        {Object.keys(result.sqlResults[0]).map((key) => (
                          <TableHead key={key} className="text-gray-300">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.sqlResults.map((row, index) => (
                        <TableRow key={index} className="border-white/10">
                          {Object.values(row).map((value: any, cellIndex) => (
                            <TableCell key={cellIndex} className="text-white">
                              {typeof value === 'number' && value > 1000 
                                ? value.toLocaleString() 
                                : String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Document Results */}
          {result.documentResults && result.documentResults.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Document Results
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Relevant document chunks found through semantic search
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.documentResults.map((doc: any, index) => (
                    <Card key={index} className="bg-white/5 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="border-white/20 text-gray-300">
                            {doc.document}
                          </Badge>
                          <Badge variant="secondary" className="bg-blue-600/20 text-blue-400">
                            {Math.round(doc.similarity * 100)}% match
                          </Badge>
                        </div>
                        <p className="text-gray-200 text-sm leading-relaxed">
                          {doc.text}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Ready to Search
            </h3>
            <p className="text-gray-400">
              Enter a natural language query to search your employee database and documents.
              The system will automatically determine whether to search the database, documents, or both.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QueryInterface;