import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface UploadedDocument {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  upload_progress: number;
  created_at: string;
  metadata?: any;
}

const DocumentUploader = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents_2025_09_30_13_04')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error loading documents:', error);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    const supportedTypes = ['pdf', 'docx', 'txt', 'csv'];
    const validFiles = files.filter(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      return supportedTypes.includes(extension || '');
    });

    if (validFiles.length === 0) {
      toast({
        title: "Unsupported file types",
        description: "Please upload PDF, DOCX, TXT, or CSV files only",
        variant: "destructive",
      });
      return;
    }

    if (validFiles.length !== files.length) {
      toast({
        title: "Some files skipped",
        description: `${files.length - validFiles.length} files were skipped due to unsupported format`,
        variant: "destructive",
      });
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('files', file);
      });

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const { data, error } = await supabase.functions.invoke('document_processor_2025_09_30_13_04', {
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) throw error;

      toast({
        title: "Documents uploaded successfully",
        description: `Processed ${data.processed.length} documents`,
      });

      // Reload documents list
      await loadDocuments();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload documents",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    return <File className="w-4 h-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Loader2 className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-400/10'
            : 'border-white/20 hover:border-white/40'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          Drop files here or click to upload
        </h3>
        <p className="text-gray-400 mb-4">
          Supports PDF, DOCX, TXT, and CSV files up to 10MB each
        </p>
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.csv"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <Button
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={uploading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Select Files
            </>
          )}
        </Button>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white">Processing documents...</span>
                <span className="text-gray-400">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents */}
      {documents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Uploaded Documents</h3>
          <div className="grid gap-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.file_type)}
                      <div>
                        <h4 className="font-medium text-white text-sm">{doc.filename}</h4>
                        <p className="text-xs text-gray-400">
                          {formatFileSize(doc.file_size)} • {doc.file_type.toUpperCase()}
                          {doc.metadata?.chunks_count && (
                            <> • {doc.metadata.chunks_count} chunks</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={doc.status === 'completed' ? 'default' : 'secondary'}
                        className={
                          doc.status === 'completed'
                            ? 'bg-green-600/20 text-green-400'
                            : doc.status === 'error'
                            ? 'bg-red-600/20 text-red-400'
                            : 'bg-blue-600/20 text-blue-400'
                        }
                      >
                        {doc.status}
                      </Badge>
                      {getStatusIcon(doc.status)}
                    </div>
                  </div>
                  {doc.status === 'processing' && (
                    <div className="mt-3">
                      <Progress value={doc.upload_progress} className="h-1" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Statistics */}
      {documents.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-sm">Document Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">
                  {documents.length}
                </div>
                <div className="text-xs text-gray-400">Total Documents</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {documents.filter(d => d.status === 'completed').length}
                </div>
                <div className="text-xs text-gray-400">Processed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {documents.filter(d => d.status === 'processing').length}
                </div>
                <div className="text-xs text-gray-400">Processing</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {documents.reduce((sum, doc) => sum + (doc.metadata?.chunks_count || 0), 0)}
                </div>
                <div className="text-xs text-gray-400">Total Chunks</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentUploader;