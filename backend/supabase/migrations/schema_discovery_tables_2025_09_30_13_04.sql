-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Table to store discovered database connections and schemas
CREATE TABLE discovered_databases_2025_09_30_13_04 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_name TEXT NOT NULL,
    database_type TEXT NOT NULL, -- 'postgresql', 'mysql', 'sqlite'
    connection_string TEXT NOT NULL,
    schema_data JSONB NOT NULL, -- Store discovered tables, columns, relationships
    status TEXT DEFAULT 'active', -- 'active', 'inactive', 'error'
    last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store discovered tables and their metadata
CREATE TABLE discovered_tables_2025_09_30_13_04 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    database_id UUID REFERENCES discovered_databases_2025_09_30_13_04(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    table_purpose TEXT, -- inferred purpose like 'employees', 'departments'
    column_info JSONB NOT NULL, -- detailed column information
    relationships JSONB, -- foreign key relationships
    sample_data JSONB, -- sample rows for context
    row_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store uploaded documents
CREATE TABLE documents_2025_09_30_13_04 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'pdf', 'docx', 'txt', 'csv'
    file_size INTEGER,
    content TEXT, -- extracted text content
    metadata JSONB, -- file metadata, processing info
    status TEXT DEFAULT 'processing', -- 'processing', 'completed', 'error'
    upload_progress INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Table to store document chunks and embeddings
CREATE TABLE document_chunks_2025_09_30_13_04 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents_2025_09_30_13_04(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding vector(384), -- sentence-transformers/all-MiniLM-L6-v2 embeddings
    metadata JSONB, -- chunk-specific metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store query history and performance metrics
CREATE TABLE query_history_2025_09_30_13_04 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    query_type TEXT NOT NULL, -- 'sql', 'document', 'hybrid'
    generated_sql TEXT,
    results JSONB,
    performance_metrics JSONB, -- response time, cache hit, etc.
    cache_key TEXT,
    status TEXT DEFAULT 'completed', -- 'processing', 'completed', 'error'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for query result caching
CREATE TABLE query_cache_2025_09_30_13_04 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key TEXT UNIQUE NOT NULL,
    query_text TEXT NOT NULL,
    results JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_discovered_databases_user_id ON discovered_databases_2025_09_30_13_04(user_id);
CREATE INDEX idx_discovered_tables_database_id ON discovered_tables_2025_09_30_13_04(database_id);
CREATE INDEX idx_documents_user_id ON documents_2025_09_30_13_04(user_id);
CREATE INDEX idx_documents_status ON documents_2025_09_30_13_04(status);
CREATE INDEX idx_document_chunks_document_id ON document_chunks_2025_09_30_13_04(document_id);
CREATE INDEX idx_query_history_user_id ON query_history_2025_09_30_13_04(user_id);
CREATE INDEX idx_query_cache_key ON query_cache_2025_09_30_13_04(cache_key);
CREATE INDEX idx_query_cache_expires ON query_cache_2025_09_30_13_04(expires_at);

-- Create vector similarity search index
CREATE INDEX ON document_chunks_2025_09_30_13_04 USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE discovered_databases_2025_09_30_13_04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_tables_2025_09_30_13_04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_2025_09_30_13_04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks_2025_09_30_13_04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_history_2025_09_30_13_04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_cache_2025_09_30_13_04 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user-owned data
CREATE POLICY "Users can manage their own databases" ON discovered_databases_2025_09_30_13_04
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view tables from their databases" ON discovered_tables_2025_09_30_13_04
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM discovered_databases_2025_09_30_13_04 
            WHERE id = database_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own documents" ON documents_2025_09_30_13_04
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view chunks from their documents" ON document_chunks_2025_09_30_13_04
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents_2025_09_30_13_04 
            WHERE id = document_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own query history" ON query_history_2025_09_30_13_04
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can access query cache" ON query_cache_2025_09_30_13_04
    FOR SELECT USING (auth.role() = 'authenticated');