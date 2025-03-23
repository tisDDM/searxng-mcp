#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Tool
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// Get environment variables for SearXNG configuration
const SEARXNG_URL = process.env.SEARXNG_URL;
const SEARXNG_USERNAME = process.env.SEARXNG_USERNAME;
const SEARXNG_PASSWORD = process.env.SEARXNG_PASSWORD;

if (!SEARXNG_URL) {
  throw new Error("SEARXNG_URL environment variable is required");
}

// Basic auth credentials are optional
const hasBasicAuth = SEARXNG_USERNAME && SEARXNG_PASSWORD;

// Interface for SearXNG search parameters
interface SearchParams {
  q: string;
  language?: string;
  time_range?: string;
  categories?: string[];
  engines?: string[];
  format?: string;
  safesearch?: number;
  pageno?: number;
}

// Interface for SearXNG search result
interface SearXNGResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  score?: number;
  category?: string;
  pretty_url?: string;
  publishedDate?: string;
}

// Interface for SearXNG search response
interface SearXNGResponse {
  query: string;
  number_of_results: number;
  results: SearXNGResult[];
  answers?: string[];
  corrections?: string[];
  infoboxes?: any[];
  suggestions?: string[];
  unresponsive_engines?: string[];
}

class SearXNGClient {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: "searxngmcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Create axios instance with basic auth if credentials are provided
    this.axiosInstance = axios.create({
      baseURL: SEARXNG_URL,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      ...(hasBasicAuth && {
        auth: {
          username: SEARXNG_USERNAME!,
          password: SEARXNG_PASSWORD!,
        },
      }),
    });

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Define available tools
      const tools: Tool[] = [
        {
          name: "searxngsearch",
          description: "Perform web searches using SearXNG, a privacy-respecting metasearch engine. Returns relevant web content with customizable parameters.",
          inputSchema: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "Search query" 
              },
              language: {
                type: "string",
                description: "Language code for search results (e.g., 'en', 'de', 'fr'). Default: 'en'",
                default: "en"
              },
              time_range: {
                type: "string",
                enum: ["day", "week", "month", "year"],
                description: "Time range for search results. Options: 'day', 'week', 'month', 'year'. Default: null (no time restriction).",
                default: null
              },
              categories: {
                type: "array",
                items: { type: "string" },
                description: "Categories to search in (e.g., 'general', 'images', 'news'). Default: null (all categories).",
                default: null
              },
              engines: {
                type: "array",
                items: { type: "string" },
                description: "Specific search engines to use. Default: null (all available engines).",
                default: null
              },
              safesearch: {
                type: "number",
                enum: [0, 1, 2],
                description: "Safe search level: 0 (off), 1 (moderate), 2 (strict). Default: 1 (moderate).",
                default: 1
              },
              pageno: {
                type: "number",
                description: "Page number for results. Must be minimum 1. Default: 1.",
                minimum: 1,
                default: 1
              },
              max_results: { 
                type: "number", 
                description: "Maximum number of search results to return. Range: 1-50. Default: 10.",
                default: 10,
                minimum: 1,
                maximum: 50
              }
            },
            required: ["query"]
          }
        }
      ];
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        if (request.params.name !== "searxngsearch") {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
        }

        const args = request.params.arguments ?? {};
        
        // Validate required parameters
        if (!args.query || typeof args.query !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Query parameter is required and must be a string"
          );
        }

        // Prepare search parameters with defaults
        const searchParams: SearchParams = {
          q: args.query,
          format: 'json',
          language: typeof args.language === 'string' ? args.language : 'en',
          safesearch: typeof args.safesearch === 'number' ? args.safesearch : 1,
          pageno: typeof args.pageno === 'number' ? args.pageno : 1,
        };

        // Add optional parameters if provided
        if (args.time_range && typeof args.time_range === 'string') searchParams.time_range = args.time_range;
        if (Array.isArray(args.categories)) searchParams.categories = args.categories;
        if (Array.isArray(args.engines)) searchParams.engines = args.engines;

        console.error(`[SearXNG] Searching for: ${args.query}`);
        
        // Make request to SearXNG
        const response = await this.axiosInstance.get('/search', {
          params: searchParams
        });

        const searchResults: SearXNGResponse = response.data;
        
        // Limit results if max_results is specified
        const maxResults = typeof args.max_results === 'number' ? args.max_results : 10;
        const limitedResults = searchResults.results.slice(0, maxResults);

        return {
          content: [{
            type: "text",
            text: this.formatResults(searchResults.query, limitedResults, searchResults)
          }]
        };
      } catch (error: any) {
        console.error("[SearXNG Error]", error);
        
        if (axios.isAxiosError(error)) {
          // Handle authentication errors
          if (error.response?.status === 401) {
            return {
              content: [{
                type: "text",
                text: "Authentication failed. Please check your SearXNG username and password."
              }],
              isError: true,
            };
          }
          
          return {
            content: [{
              type: "text",
              text: `SearXNG API error: ${error.response?.data?.message ?? error.message}`
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message}`
          }],
          isError: true,
        };
      }
    });
  }

  private formatResults(query: string, results: SearXNGResult[], fullResponse: SearXNGResponse): string {
    const output: string[] = [];
    
    output.push(`# Search Results for: ${query}`);
    output.push(`Found ${fullResponse.number_of_results} results\n`);

    // Add answers if available
    if (fullResponse.answers && fullResponse.answers.length > 0) {
      output.push(`## Answers`);
      fullResponse.answers.forEach(answer => {
        output.push(`- ${answer}`);
      });
      output.push('');
    }

    // Add suggestions if available
    if (fullResponse.suggestions && fullResponse.suggestions.length > 0) {
      output.push(`## Suggestions`);
      fullResponse.suggestions.forEach(suggestion => {
        output.push(`- ${suggestion}`);
      });
      output.push('');
    }

    // Add corrections if available
    if (fullResponse.corrections && fullResponse.corrections.length > 0) {
      output.push(`## Did you mean?`);
      fullResponse.corrections.forEach(correction => {
        output.push(`- ${correction}`);
      });
      output.push('');
    }

    // Format detailed search results
    output.push('## Results');
    results.forEach((result, index) => {
      output.push(`\n### ${index + 1}. ${result.title}`);
      output.push(`URL: ${result.url}`);
      if (result.engine) output.push(`Engine: ${result.engine}`);
      if (result.category) output.push(`Category: ${result.category}`);
      if (result.publishedDate) output.push(`Published: ${result.publishedDate}`);
      output.push(`\n${result.content}`);
    });

    // Add unresponsive engines if any
    if (fullResponse.unresponsive_engines && fullResponse.unresponsive_engines.length > 0) {
      output.push('\n## Unresponsive Engines');
      output.push(fullResponse.unresponsive_engines.join(', '));
    }

    return output.join('\n');
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("SearXNG MCP server running on stdio");
    console.error(`Connected to SearXNG instance at: ${SEARXNG_URL}`);
    console.error(`Basic auth: ${hasBasicAuth ? 'Enabled' : 'Disabled'}`);
  }
}

const server = new SearXNGClient();
server.run().catch(console.error);