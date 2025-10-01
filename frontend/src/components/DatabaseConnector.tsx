import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface DatabaseSchema {
  tables: Array<{
    tableName: string;
    inferredPurpose: string;
    columns: Array<{
      name: string;
      type: string;
      isPrimaryKey: boolean;
      isForeignKey: boolean;
    }>;
    rowCount: number;
  }>;
  totalColumns: number;
  totalRelationships: number;
}

const DatabaseConnector = () => {
  const [connectionString, setConnectionString] = useState("");
  const [connectionName, setConnectionName] = useState("");
  const [databaseType, setDatabaseType] = useState("postgresql");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [databases, setDatabases] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadConnectedDatabases();
  }, []);

  const loadConnectedDatabases = async () => {
    try {
      const { data, error } = await supabase
        .from('discovered_databases_2025_09_30_13_04')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDatabases(data || []);
    } catch (error: any) {
      console.error('Error loading databases:', error);
    }
  };

  const handleConnect = async () => {
    if (!connectionString || !connectionName) {
      toast({
        title: "Missing information",
        description: "Please provide both connection string and name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('schema_discovery_2025_09_30_13_04', {
        body: {
          connectionString,
          connectionName,
          databaseType
        }
      });

      if (error) throw error;

      setConnected(true);
      setSchema(data.schema);
      
      toast({
        title: "Database connected successfully",
        description: `Discovered ${data.schema.tables.length} tables with ${data.schema.totalColumns} columns`,
      });

      // Reload the databases list
      await loadConnectedDatabases();
      
      // Clear form
      setConnectionString("");
      setConnectionName("");
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!connectionString) {
      toast({
        title: "Missing connection string",
        description: "Please provide a connection string to test",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Testing connection...",
      description: "This is a demo - connection test simulated",
    });
  };

  return (
    <div className="space-y-6">
      {/* Connection Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="connection-name" className="text-white">Connection Name</Label>
          <Input
            id="connection-name"
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            placeholder="e.g., Production DB, HR Database"
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="database-type" className="text-white">Database Type</Label>
          <Select value={databaseType} onValueChange={setDatabaseType}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="postgresql">PostgreSQL</SelectItem>
              <SelectItem value="mysql">MySQL</SelectItem>
              <SelectItem value="sqlite">SQLite</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="connection-string" className="text-white">Connection String</Label>
          <Input
            id="connection-string"
            type="password"
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            placeholder="postgresql://user:password@host:port/database"
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          />
          <p className="text-xs text-gray-400">
            For demo purposes, any connection string will work
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={testConnection}
            variant="outline"
            className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Test Connection
          </Button>
          <Button
            onClick={handleConnect}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Connect & Analyze
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Connected Databases */}
      {databases.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Connected Databases</h3>
          <div className="grid gap-4">
            {databases.map((db) => (
              <Card key={db.id} className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-sm">{db.connection_name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                        {db.database_type}
                      </Badge>
                      {db.status === 'active' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-gray-400">
                    {db.schema_data?.tables?.length || 0} tables, {db.schema_data?.totalColumns || 0} columns
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {db.schema_data?.tables?.slice(0, 3).map((table: any) => (
                      <Badge key={table.tableName} variant="outline" className="text-xs border-white/20 text-gray-300">
                        {table.tableName}
                      </Badge>
                    ))}
                    {db.schema_data?.tables?.length > 3 && (
                      <Badge variant="outline" className="text-xs border-white/20 text-gray-300">
                        +{db.schema_data.tables.length - 3} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Schema Visualization */}
      {schema && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Discovered Schema</CardTitle>
            <CardDescription className="text-gray-400">
              Automatically analyzed database structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {schema.tables.map((table) => (
                <div key={table.tableName} className="border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{table.tableName}</h4>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="bg-blue-600/20 text-blue-400">
                        {table.inferredPurpose}
                      </Badge>
                      <Badge variant="outline" className="border-white/20 text-gray-300">
                        {table.rowCount} rows
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {table.columns.map((column) => (
                      <div
                        key={column.name}
                        className={`text-xs p-2 rounded ${
                          column.isPrimaryKey
                            ? 'bg-yellow-600/20 text-yellow-400'
                            : column.isForeignKey
                            ? 'bg-purple-600/20 text-purple-400'
                            : 'bg-white/5 text-gray-300'
                        }`}
                      >
                        <div className="font-medium">{column.name}</div>
                        <div className="text-xs opacity-75">{column.type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DatabaseConnector;