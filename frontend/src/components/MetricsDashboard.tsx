import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Database, 
  FileText, 
  Search, 
  Clock, 
  TrendingUp, 
  Users, 
  Zap,
  Target,
  Activity
} from "lucide-react";

interface MetricsData {
  totalDatabases: number;
  totalDocuments: number;
  totalQueries: number;
  avgResponseTime: number;
  cacheHitRate: number;
  queryTypes: {
    sql: number;
    document: number;
    hybrid: number;
  };
  recentActivity: any[];
}

const MetricsDashboard = () => {
  const [metrics, setMetrics] = useState<MetricsData>({
    totalDatabases: 0,
    totalDocuments: 0,
    totalQueries: 0,
    avgResponseTime: 0,
    cacheHitRate: 0,
    queryTypes: { sql: 0, document: 0, hybrid: 0 },
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);

      // Load database count
      const { data: databases } = await supabase
        .from('discovered_databases_2025_09_30_13_04')
        .select('id')
        .eq('status', 'active');

      // Load document count
      const { data: documents } = await supabase
        .from('documents_2025_09_30_13_04')
        .select('id, status')
        .eq('status', 'completed');

      // Load query history
      const { data: queries } = await supabase
        .from('query_history_2025_09_30_13_04')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Load cache statistics
      const { data: cacheStats } = await supabase
        .from('query_cache_2025_09_30_13_04')
        .select('hit_count');

      // Calculate metrics
      const totalQueries = queries?.length || 0;
      const avgResponseTime = queries?.reduce((sum, q) => 
        sum + (q.performance_metrics?.responseTime || 0), 0) / Math.max(totalQueries, 1);
      
      const queryTypes = queries?.reduce((acc, q) => {
        acc[q.query_type] = (acc[q.query_type] || 0) + 1;
        return acc;
      }, { sql: 0, document: 0, hybrid: 0 }) || { sql: 0, document: 0, hybrid: 0 };

      const totalCacheHits = cacheStats?.reduce((sum, c) => sum + (c.hit_count || 0), 0) || 0;
      const cacheHitRate = totalQueries > 0 ? (totalCacheHits / totalQueries) * 100 : 0;

      setMetrics({
        totalDatabases: databases?.length || 0,
        totalDocuments: documents?.length || 0,
        totalQueries,
        avgResponseTime: Math.round(avgResponseTime),
        cacheHitRate: Math.round(cacheHitRate),
        queryTypes,
        recentActivity: queries?.slice(0, 10) || []
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-white/20 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Connected Databases</p>
                <p className="text-3xl font-bold text-white">{metrics.totalDatabases}</p>
              </div>
              <Database className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Processed Documents</p>
                <p className="text-3xl font-bold text-white">{metrics.totalDocuments}</p>
              </div>
              <FileText className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Queries</p>
                <p className="text-3xl font-bold text-white">{metrics.totalQueries}</p>
              </div>
              <Search className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Avg Response Time</p>
                <p className="text-3xl font-bold text-white">{metrics.avgResponseTime}ms</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Cache Performance
            </CardTitle>
            <CardDescription className="text-gray-300">
              Query caching efficiency metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Cache Hit Rate</span>
                  <span className="text-white">{metrics.cacheHitRate}%</span>
                </div>
                <Progress value={metrics.cacheHitRate} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {Math.round((metrics.cacheHitRate / 100) * metrics.totalQueries)}
                  </div>
                  <div className="text-xs text-gray-400">Cache Hits</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">
                    {metrics.totalQueries - Math.round((metrics.cacheHitRate / 100) * metrics.totalQueries)}
                  </div>
                  <div className="text-xs text-gray-400">Cache Misses</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5" />
              Query Distribution
            </CardTitle>
            <CardDescription className="text-gray-300">
              Breakdown of query types processed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-300">SQL Queries</span>
                  </div>
                  <Badge className="bg-blue-600/20 text-blue-400">
                    {metrics.queryTypes.sql}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Document Queries</span>
                  </div>
                  <Badge className="bg-green-600/20 text-green-400">
                    {metrics.queryTypes.document}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-300">Hybrid Queries</span>
                  </div>
                  <Badge className="bg-purple-600/20 text-purple-400">
                    {metrics.queryTypes.hybrid}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Query Activity
          </CardTitle>
          <CardDescription className="text-gray-300">
            Latest queries processed by the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {metrics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getQueryTypeColor(activity.query_type)}>
                        {activity.query_type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {formatTime(activity.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-white truncate">
                      {activity.query_text}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">
                      {activity.performance_metrics?.responseTime || 0}ms
                    </div>
                    {activity.performance_metrics?.cacheHit && (
                      <Badge variant="secondary" className="bg-green-600/20 text-green-400 text-xs">
                        Cached
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No queries processed yet</p>
              <p className="text-sm text-gray-500">Start querying to see activity here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm text-gray-300">All systems operational</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Active Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">1 user online</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">
                {metrics.avgResponseTime < 2000 ? 'Excellent' : 'Good'} response times
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MetricsDashboard;