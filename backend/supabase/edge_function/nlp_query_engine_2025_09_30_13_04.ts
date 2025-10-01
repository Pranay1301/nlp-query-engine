import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

interface QueryRequest {
  query: string
  databaseId?: string
}

interface QueryResult {
  queryType: 'sql' | 'document' | 'hybrid'
  sqlResults?: any[]
  documentResults?: any[]
  generatedSQL?: string
  performanceMetrics: {
    responseTime: number
    cacheHit: boolean
    resultsCount: number
  }
  sources: string[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const startTime = Date.now()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { query, databaseId }: QueryRequest = await req.json()

    // Generate cache key
    const cacheKey = generateCacheKey(query, databaseId, user.id)
    
    // Check cache first
    const cachedResult = await checkCache(supabaseClient, cacheKey)
    if (cachedResult) {
      await updateCacheHit(supabaseClient, cacheKey)
      
      return new Response(JSON.stringify({
        ...cachedResult,
        performanceMetrics: {
          ...cachedResult.performanceMetrics,
          responseTime: Date.now() - startTime,
          cacheHit: true
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Classify query type
    const queryType = classifyQuery(query)
    
    let result: QueryResult = {
      queryType,
      performanceMetrics: {
        responseTime: 0,
        cacheHit: false,
        resultsCount: 0
      },
      sources: []
    }

    // Process based on query type
    switch (queryType) {
      case 'sql':
        result = await processSQLQuery(supabaseClient, query, databaseId, user.id)
        break
      
      case 'document':
        result = await processDocumentQuery(supabaseClient, query, user.id)
        break
      
      case 'hybrid':
        result = await processHybridQuery(supabaseClient, query, databaseId, user.id)
        break
    }

    result.performanceMetrics.responseTime = Date.now() - startTime

    // Cache the result
    await cacheResult(supabaseClient, cacheKey, query, result)
    
    // Store in query history
    await storeQueryHistory(supabaseClient, user.id, query, result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Query processing error:', error)
    return new Response(JSON.stringify({
      error: 'Query processing failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function classifyQuery(query: string): 'sql' | 'document' | 'hybrid' {
  const lowerQuery = query.toLowerCase()
  
  // SQL indicators
  const sqlKeywords = ['count', 'average', 'sum', 'group by', 'order by', 'salary', 'department', 'employees', 'how many', 'list all', 'show me all']
  const hasSQLKeywords = sqlKeywords.some(keyword => lowerQuery.includes(keyword))
  
  // Document indicators
  const docKeywords = ['skills', 'experience', 'resume', 'qualifications', 'background', 'python', 'java', 'programming', 'certification']
  const hasDocKeywords = docKeywords.some(keyword => lowerQuery.includes(keyword))
  
  if (hasSQLKeywords && hasDocKeywords) {
    return 'hybrid'
  } else if (hasDocKeywords) {
    return 'document'
  } else {
    return 'sql'
  }
}

async function processSQLQuery(supabaseClient: any, query: string, databaseId: string, userId: string): Promise<QueryResult> {
  // Get database schema
  const { data: dbData } = await supabaseClient
    .from('discovered_databases_2025_09_30_13_04')
    .select('schema_data')
    .eq('id', databaseId)
    .eq('user_id', userId)
    .single()

  if (!dbData) {
    throw new Error('Database not found')
  }

  // Generate SQL from natural language
  const generatedSQL = generateSQL(query, dbData.schema_data)
  
  // Execute SQL (simulated for demo)
  const sqlResults = await executeSQL(generatedSQL, dbData.schema_data)

  return {
    queryType: 'sql',
    sqlResults,
    generatedSQL,
    performanceMetrics: {
      responseTime: 0,
      cacheHit: false,
      resultsCount: sqlResults.length
    },
    sources: ['database']
  }
}

async function processDocumentQuery(supabaseClient: any, query: string, userId: string): Promise<QueryResult> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query)
  
  // Search similar document chunks
  const { data: chunks } = await supabaseClient.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 10,
    user_id: userId
  })

  const documentResults = chunks?.map((chunk: any) => ({
    id: chunk.id,
    text: chunk.chunk_text,
    similarity: chunk.similarity,
    document: chunk.filename,
    metadata: chunk.metadata
  })) || []

  return {
    queryType: 'document',
    documentResults,
    performanceMetrics: {
      responseTime: 0,
      cacheHit: false,
      resultsCount: documentResults.length
    },
    sources: documentResults.map((doc: any) => doc.document)
  }
}

async function processHybridQuery(supabaseClient: any, query: string, databaseId: string, userId: string): Promise<QueryResult> {
  // Process both SQL and document queries
  const sqlResult = await processSQLQuery(supabaseClient, query, databaseId, userId)
  const docResult = await processDocumentQuery(supabaseClient, query, userId)

  return {
    queryType: 'hybrid',
    sqlResults: sqlResult.sqlResults,
    documentResults: docResult.documentResults,
    generatedSQL: sqlResult.generatedSQL,
    performanceMetrics: {
      responseTime: 0,
      cacheHit: false,
      resultsCount: (sqlResult.sqlResults?.length || 0) + (docResult.documentResults?.length || 0)
    },
    sources: [...sqlResult.sources, ...docResult.sources]
  }
}

function generateSQL(query: string, schema: any): string {
  const lowerQuery = query.toLowerCase()
  
  // Simple SQL generation based on common patterns
  if (lowerQuery.includes('how many employees')) {
    return 'SELECT COUNT(*) as employee_count FROM employees;'
  }
  
  if (lowerQuery.includes('average salary')) {
    if (lowerQuery.includes('department')) {
      return `SELECT d.dept_name, AVG(e.annual_salary) as avg_salary 
              FROM employees e 
              JOIN departments d ON e.dept_id = d.dept_id 
              GROUP BY d.dept_name;`
    }
    return 'SELECT AVG(annual_salary) as average_salary FROM employees;'
  }
  
  if (lowerQuery.includes('highest paid')) {
    if (lowerQuery.includes('each department')) {
      return `SELECT d.dept_name, e.full_name, e.annual_salary
              FROM employees e
              JOIN departments d ON e.dept_id = d.dept_id
              WHERE e.annual_salary = (
                SELECT MAX(e2.annual_salary) 
                FROM employees e2 
                WHERE e2.dept_id = e.dept_id
              )
              ORDER BY e.annual_salary DESC;`
    }
    return 'SELECT full_name, annual_salary FROM employees ORDER BY annual_salary DESC LIMIT 5;'
  }
  
  if (lowerQuery.includes('hired this year')) {
    return `SELECT full_name, position, join_date 
            FROM employees 
            WHERE EXTRACT(YEAR FROM join_date) = EXTRACT(YEAR FROM CURRENT_DATE);`
  }
  
  // Default fallback
  return 'SELECT * FROM employees LIMIT 10;'
}

async function executeSQL(sql: string, schema: any): Promise<any[]> {
  // Simulate SQL execution with mock data
  const mockResults = {
    'SELECT COUNT(*) as employee_count FROM employees;': [
      { employee_count: 150 }
    ],
    'SELECT AVG(annual_salary) as average_salary FROM employees;': [
      { average_salary: 87500 }
    ]
  }

  // Return mock data or generate realistic results
  if (mockResults[sql]) {
    return mockResults[sql]
  }

  // Generate mock employee data
  return [
    { emp_id: 1, full_name: 'John Smith', position: 'Software Engineer', annual_salary: 95000, dept_name: 'Engineering' },
    { emp_id: 2, full_name: 'Sarah Johnson', position: 'Data Scientist', annual_salary: 110000, dept_name: 'Data Science' },
    { emp_id: 3, full_name: 'Mike Chen', position: 'Product Manager', annual_salary: 105000, dept_name: 'Product' },
    { emp_id: 4, full_name: 'Emily Davis', position: 'UX Designer', annual_salary: 85000, dept_name: 'Design' },
    { emp_id: 5, full_name: 'David Wilson', position: 'DevOps Engineer', annual_salary: 98000, dept_name: 'Engineering' }
  ]
}

async function generateEmbedding(text: string): Promise<number[]> {
  // Mock embedding generation
  return new Array(384).fill(0).map(() => Math.random() * 2 - 1)
}

function generateCacheKey(query: string, databaseId: string, userId: string): string {
  const content = `${query}-${databaseId}-${userId}`
  return btoa(content).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
}

async function checkCache(supabaseClient: any, cacheKey: string): Promise<QueryResult | null> {
  const { data } = await supabaseClient
    .from('query_cache_2025_09_30_13_04')
    .select('results')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single()

  return data?.results || null
}

async function updateCacheHit(supabaseClient: any, cacheKey: string): Promise<void> {
  await supabaseClient
    .from('query_cache_2025_09_30_13_04')
    .update({ 
      hit_count: supabaseClient.raw('hit_count + 1'),
      last_accessed: new Date().toISOString()
    })
    .eq('cache_key', cacheKey)
}

async function cacheResult(supabaseClient: any, cacheKey: string, query: string, result: QueryResult): Promise<void> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  
  await supabaseClient
    .from('query_cache_2025_09_30_13_04')
    .upsert({
      cache_key: cacheKey,
      query_text: query,
      results: result,
      expires_at: expiresAt.toISOString()
    })
}

async function storeQueryHistory(supabaseClient: any, userId: string, query: string, result: QueryResult): Promise<void> {
  await supabaseClient
    .from('query_history_2025_09_30_13_04')
    .insert({
      user_id: userId,
      query_text: query,
      query_type: result.queryType,
      generated_sql: result.generatedSQL,
      results: {
        sql: result.sqlResults,
        documents: result.documentResults
      },
      performance_metrics: result.performanceMetrics,
      cache_key: generateCacheKey(query, '', userId)
    })
}