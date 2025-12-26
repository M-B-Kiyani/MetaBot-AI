import { GoogleGenerativeAI } from '@google/generative-ai';
import { DocumentChunk } from '../../../../packages/shared/src/types/ai';
import fs from 'fs/promises';
import path from 'path';
import logger from '../config/logger';

export interface KnowledgeService {
  indexDocuments(): Promise<void>;
  searchDocuments(query: string, limit?: number): Promise<DocumentChunk[]>;
  getRelevantContext(query: string, maxTokens?: number): Promise<string>;
}

interface DocumentEmbedding {
  id: string;
  title: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export class KnowledgeServiceImpl implements KnowledgeService {
  private documents: DocumentEmbedding[] = [];
  private genAI: GoogleGenerativeAI;
  private isIndexed = false;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async indexDocuments(): Promise<void> {
    try {
      logger.info('Starting document indexing...');
      
      // Path to knowledge base directory
      const knowledgeBasePath = path.join(process.cwd(), 'metalogicsRAG');
      
      // Read all markdown files
      const files = await fs.readdir(knowledgeBasePath);
      const markdownFiles = files.filter(file => file.endsWith('.md'));
      
      logger.info(`Found ${markdownFiles.length} documents to index`);
      
      // Process each document
      for (const file of markdownFiles) {
        const filePath = path.join(knowledgeBasePath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Extract title from filename
        const title = file.replace('.md', '').replace(/_/g, ' ');
        
        // Create chunks for large documents (split by sections)
        const chunks = this.chunkDocument(content, title);
        
        // Generate embeddings for each chunk
        for (const chunk of chunks) {
          const embedding = await this.generateEmbedding(chunk.content);
          
          this.documents.push({
            id: chunk.id,
            title: chunk.title,
            content: chunk.content,
            embedding,
            metadata: {
              filename: file,
              section: chunk.metadata?.section || 'main',
              wordCount: chunk.content.split(' ').length
            }
          });
        }
        
        logger.info(`Indexed document: ${title}`);
      }
      
      this.isIndexed = true;
      logger.info(`Document indexing completed. Total chunks: ${this.documents.length}`);
      
    } catch (error) {
      logger.error('Error indexing documents:', error);
      throw new Error('Failed to index documents');
    }
  }

  async searchDocuments(query: string, limit = 5): Promise<DocumentChunk[]> {
    if (!this.isIndexed) {
      await this.indexDocuments();
    }

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Calculate similarity scores
      const scoredDocuments = this.documents.map(doc => ({
        ...doc,
        score: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }));
      
      // Sort by similarity score (descending) and return top results
      const topResults = scoredDocuments
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      return topResults.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        score: doc.score,
        metadata: doc.metadata
      }));
      
    } catch (error) {
      logger.error('Error searching documents:', error);
      throw new Error('Failed to search documents');
    }
  }

  async getRelevantContext(query: string, maxTokens = 2000): Promise<string> {
    const relevantDocs = await this.searchDocuments(query, 3);
    
    if (relevantDocs.length === 0) {
      return 'No relevant information found in the knowledge base.';
    }
    
    // Combine relevant documents into context
    let context = 'Relevant information from knowledge base:\n\n';
    let tokenCount = 0;
    
    for (const doc of relevantDocs) {
      const docText = `**${doc.title}** (Relevance: ${(doc.score * 100).toFixed(1)}%)\n${doc.content}\n\n`;
      const docTokens = this.estimateTokens(docText);
      
      if (tokenCount + docTokens > maxTokens) {
        break;
      }
      
      context += docText;
      tokenCount += docTokens;
    }
    
    return context.trim();
  }

  private chunkDocument(content: string, title: string): Array<{
    id: string;
    title: string;
    content: string;
    metadata?: Record<string, any>;
  }> {
    // Split document by headers or sections
    const sections = content.split(/(?=^#{1,3}\s)/m);
    const chunks: Array<{
      id: string;
      title: string;
      content: string;
      metadata?: Record<string, any>;
    }> = [];
    
    sections.forEach((section, index) => {
      const trimmedSection = section.trim();
      if (trimmedSection.length < 50) return; // Skip very short sections
      
      // Extract section title if it exists
      const headerMatch = trimmedSection.match(/^#{1,3}\s+(.+)/);
      const sectionTitle = headerMatch ? headerMatch[1] : `${title} - Section ${index + 1}`;
      
      chunks.push({
        id: `${title.toLowerCase().replace(/\s+/g, '_')}_${index}`,
        title: sectionTitle,
        content: trimmedSection,
        metadata: {
          section: sectionTitle,
          index
        }
      });
    });
    
    // If no sections found, treat entire document as one chunk
    if (chunks.length === 0) {
      chunks.push({
        id: title.toLowerCase().replace(/\s+/g, '_'),
        title,
        content,
        metadata: { section: 'main' }
      });
    }
    
    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}