import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

interface DocumentChunk {
  text: string
  index: number
  metadata: {
    page?: number
    section?: string
    type: string
  }
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

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: 'No files provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const processedDocuments = []

    for (const file of files) {
      try {
        // Store document record
        const { data: docRecord, error: docError } = await supabaseClient
          .from('documents_2025_09_30_13_04')
          .insert({
            user_id: user.id,
            filename: file.name,
            file_type: getFileType(file.name),
            file_size: file.size,
            status: 'processing',
            upload_progress: 0
          })
          .select()
          .single()

        if (docError) throw docError

        // Process file content
        const content = await extractTextContent(file)
        const chunks = await intelligentChunking(content, getFileType(file.name))
        
        // Update document with extracted content
        await supabaseClient
          .from('documents_2025_09_30_13_04')
          .update({
            content: content,
            status: 'completed',
            upload_progress: 100,
            processed_at: new Date().toISOString(),
            metadata: {
              chunks_count: chunks.length,
              content_length: content.length,
              processing_time: Date.now()
            }
          })
          .eq('id', docRecord.id)

        // Generate and store embeddings for each chunk
        for (const chunk of chunks) {
          const embedding = await generateEmbedding(chunk.text)
          
          await supabaseClient
            .from('document_chunks_2025_09_30_13_04')
            .insert({
              document_id: docRecord.id,
              chunk_text: chunk.text,
              chunk_index: chunk.index,
              embedding: embedding,
              metadata: chunk.metadata
            })
        }

        processedDocuments.push({
          id: docRecord.id,
          filename: file.name,
          chunks: chunks.length,
          status: 'completed'
        })

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        processedDocuments.push({
          filename: file.name,
          status: 'error',
          error: error.message
        })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: processedDocuments,
      message: `Processed ${processedDocuments.length} documents`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Document processing error:', error)
    return new Response(JSON.stringify({
      error: 'Document processing failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function getFileType(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop()
  return extension || 'unknown'
}

async function extractTextContent(file: File): Promise<string> {
  const fileType = getFileType(file.name)
  
  switch (fileType) {
    case 'txt':
      return await file.text()
    
    case 'csv':
      const csvContent = await file.text()
      return parseCSVContent(csvContent)
    
    case 'pdf':
      // In production, use a PDF parsing library like pdf-parse
      // For demo, simulate PDF text extraction
      return simulatePDFExtraction(file.name)
    
    case 'docx':
      // In production, use a DOCX parsing library
      // For demo, simulate DOCX text extraction
      return simulateDOCXExtraction(file.name)
    
    default:
      return await file.text()
  }
}

function parseCSVContent(csvContent: string): string {
  const lines = csvContent.split('\n')
  const headers = lines[0]?.split(',') || []
  
  let parsedContent = `CSV Document with ${lines.length - 1} rows and columns: ${headers.join(', ')}\n\n`
  
  // Convert CSV to readable text format
  for (let i = 1; i < Math.min(lines.length, 10); i++) {
    const values = lines[i]?.split(',') || []
    for (let j = 0; j < headers.length && j < values.length; j++) {
      parsedContent += `${headers[j]}: ${values[j]}\n`
    }
    parsedContent += '\n'
  }
  
  return parsedContent
}

function simulatePDFExtraction(filename: string): string {
  // Simulate realistic employee document content
  return `Employee Resume - ${filename}

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years in full-stack development. 
Proficient in Python, JavaScript, React, and PostgreSQL. Strong background 
in building scalable web applications and data processing systems.

TECHNICAL SKILLS
- Programming Languages: Python, JavaScript, TypeScript, SQL
- Frameworks: React, Node.js, FastAPI, Django
- Databases: PostgreSQL, MongoDB, Redis
- Cloud: AWS, Docker, Kubernetes
- Tools: Git, Jenkins, Jira

WORK EXPERIENCE
Senior Software Engineer | TechCorp Inc. | 2021-Present
- Led development of microservices architecture serving 1M+ users
- Implemented automated testing reducing bugs by 40%
- Mentored junior developers and conducted code reviews

Software Engineer | StartupXYZ | 2019-2021
- Built full-stack web applications using React and Python
- Optimized database queries improving performance by 60%
- Collaborated with cross-functional teams in agile environment

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2015-2019

CERTIFICATIONS
- AWS Certified Solutions Architect
- Certified Kubernetes Administrator`
}

function simulateDOCXExtraction(filename: string): string {
  // Simulate employee contract or policy document
  return `Employee Contract - ${filename}

EMPLOYMENT AGREEMENT

This Employment Agreement is entered into between TechCorp Inc. ("Company") 
and the Employee for the position of Software Engineer.

POSITION AND DUTIES
Employee will serve as Senior Software Engineer in the Engineering Department.
Primary responsibilities include:
- Software development and maintenance
- Code review and mentoring
- Technical documentation
- Participation in agile development processes

COMPENSATION
Base Salary: $95,000 annually
Benefits: Health insurance, dental, vision, 401k matching
Vacation: 20 days annually
Stock Options: As per company equity plan

WORK SCHEDULE
Standard work week: Monday-Friday, 9 AM - 5 PM
Remote work: Hybrid schedule with 3 days in office
Location: New York Office

CONFIDENTIALITY
Employee agrees to maintain confidentiality of proprietary information
and trade secrets during and after employment.

TERMINATION
Either party may terminate this agreement with 30 days written notice.
Severance benefits as per company policy.`
}

async function intelligentChunking(content: string, fileType: string): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = []
  
  // Intelligent chunking based on document type
  switch (fileType) {
    case 'pdf':
    case 'docx':
      return chunkBySemanticSections(content)
    
    case 'csv':
      return chunkByDataRows(content)
    
    case 'txt':
    default:
      return chunkByParagraphs(content)
  }
}

function chunkBySemanticSections(content: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  const sections = content.split(/\n\n+/)
  
  let currentChunk = ''
  let chunkIndex = 0
  
  for (const section of sections) {
    if (currentChunk.length + section.length > 800) {
      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
          metadata: { type: 'semantic_section' }
        })
      }
      currentChunk = section
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + section
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
      metadata: { type: 'semantic_section' }
    })
  }
  
  return chunks
}

function chunkByDataRows(content: string): DocumentChunk[] {
  const lines = content.split('\n')
  const headers = lines[0]
  const chunks: DocumentChunk[] = []
  
  // Group rows into chunks of 10
  for (let i = 1; i < lines.length; i += 10) {
    const rowGroup = lines.slice(i, i + 10)
    const chunkText = headers + '\n' + rowGroup.join('\n')
    
    chunks.push({
      text: chunkText,
      index: Math.floor(i / 10),
      metadata: { 
        type: 'data_rows',
        row_start: i,
        row_end: Math.min(i + 9, lines.length - 1)
      }
    })
  }
  
  return chunks
}

function chunkByParagraphs(content: string): DocumentChunk[] {
  const paragraphs = content.split(/\n\s*\n/)
  const chunks: DocumentChunk[] = []
  
  let currentChunk = ''
  let chunkIndex = 0
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > 600) {
      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
          metadata: { type: 'paragraph_group' }
        })
      }
      currentChunk = paragraph
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
      metadata: { type: 'paragraph_group' }
    })
  }
  
  return chunks
}

async function generateEmbedding(text: string): Promise<number[]> {
  // In production, use actual embedding service like Hugging Face or OpenAI
  // For demo, generate mock embeddings
  const embedding = new Array(384).fill(0).map(() => Math.random() * 2 - 1)
  return embedding
}