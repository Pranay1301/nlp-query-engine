import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

interface DatabaseConnection {
  connectionString: string
  connectionName: string
  databaseType: 'postgresql' | 'mysql' | 'sqlite'
}

interface TableInfo {
  tableName: string
  columns: Array<{
    name: string
    type: string
    nullable: boolean
    isPrimaryKey: boolean
    isForeignKey: boolean
    referencedTable?: string
    referencedColumn?: string
  }>
  relationships: Array<{
    type: 'foreign_key' | 'one_to_many' | 'many_to_many'
    targetTable: string
    sourceColumn: string
    targetColumn: string
  }>
  sampleData: any[]
  rowCount: number
  inferredPurpose: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    const { connectionString, connectionName, databaseType }: DatabaseConnection = await req.json()

    // Analyze database schema
    const schemaData = await analyzeDatabase(connectionString, databaseType)
    
    // Store discovered schema
    const { data: dbRecord, error: dbError } = await supabaseClient
      .from('discovered_databases_2025_09_30_13_04')
      .insert({
        user_id: user.id,
        connection_name: connectionName,
        database_type: databaseType,
        connection_string: connectionString,
        schema_data: schemaData,
        status: 'active'
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Store individual table information
    for (const table of schemaData.tables) {
      await supabaseClient
        .from('discovered_tables_2025_09_30_13_04')
        .insert({
          database_id: dbRecord.id,
          table_name: table.tableName,
          table_purpose: table.inferredPurpose,
          column_info: { columns: table.columns },
          relationships: { relationships: table.relationships },
          sample_data: { samples: table.sampleData },
          row_count: table.rowCount
        })
    }

    return new Response(JSON.stringify({
      success: true,
      databaseId: dbRecord.id,
      schema: schemaData,
      message: `Discovered ${schemaData.tables.length} tables with ${schemaData.totalColumns} columns`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Schema discovery error:', error)
    return new Response(JSON.stringify({
      error: 'Schema discovery failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function analyzeDatabase(connectionString: string, databaseType: string) {
  // This is a simplified implementation - in production, you'd use actual database drivers
  // For demo purposes, we'll simulate schema discovery
  
  const mockSchemas = {
    postgresql: {
      tables: [
        {
          tableName: 'employees',
          inferredPurpose: 'employee_data',
          columns: [
            { name: 'emp_id', type: 'integer', nullable: false, isPrimaryKey: true, isForeignKey: false },
            { name: 'full_name', type: 'varchar', nullable: false, isPrimaryKey: false, isForeignKey: false },
            { name: 'dept_id', type: 'integer', nullable: true, isPrimaryKey: false, isForeignKey: true, referencedTable: 'departments', referencedColumn: 'dept_id' },
            { name: 'position', type: 'varchar', nullable: true, isPrimaryKey: false, isForeignKey: false },
            { name: 'annual_salary', type: 'decimal', nullable: true, isPrimaryKey: false, isForeignKey: false },
            { name: 'join_date', type: 'date', nullable: true, isPrimaryKey: false, isForeignKey: false },
            { name: 'office_location', type: 'varchar', nullable: true, isPrimaryKey: false, isForeignKey: false }
          ],
          relationships: [
            { type: 'foreign_key', targetTable: 'departments', sourceColumn: 'dept_id', targetColumn: 'dept_id' }
          ],
          sampleData: [
            { emp_id: 1, full_name: 'John Smith', dept_id: 1, position: 'Software Engineer', annual_salary: 95000, join_date: '2023-01-15', office_location: 'New York' },
            { emp_id: 2, full_name: 'Sarah Johnson', dept_id: 2, position: 'Data Scientist', annual_salary: 110000, join_date: '2022-08-20', office_location: 'San Francisco' }
          ],
          rowCount: 150
        },
        {
          tableName: 'departments',
          inferredPurpose: 'organizational_structure',
          columns: [
            { name: 'dept_id', type: 'integer', nullable: false, isPrimaryKey: true, isForeignKey: false },
            { name: 'dept_name', type: 'varchar', nullable: false, isPrimaryKey: false, isForeignKey: false },
            { name: 'manager_id', type: 'integer', nullable: true, isPrimaryKey: false, isForeignKey: true, referencedTable: 'employees', referencedColumn: 'emp_id' }
          ],
          relationships: [
            { type: 'one_to_many', targetTable: 'employees', sourceColumn: 'dept_id', targetColumn: 'dept_id' }
          ],
          sampleData: [
            { dept_id: 1, dept_name: 'Engineering', manager_id: 5 },
            { dept_id: 2, dept_name: 'Data Science', manager_id: 8 }
          ],
          rowCount: 12
        }
      ],
      totalColumns: 10,
      totalRelationships: 2
    }
  }

  // In a real implementation, this would:
  // 1. Parse the connection string
  // 2. Connect to the actual database
  // 3. Query information_schema or equivalent
  // 4. Analyze table structures, foreign keys, indexes
  // 5. Infer table purposes based on naming patterns
  // 6. Sample data for context understanding

  return mockSchemas[databaseType] || mockSchemas.postgresql
}