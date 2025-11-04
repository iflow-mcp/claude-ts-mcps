#!/usr/bin/env node

/**
 * Claude TypeScript MCP Servers - Main Entry Point
 * 
 * This is a comprehensive collection of MCP servers that provides:
 * - Brave Search integration for web and local search
 * - Perplexity/Sonar AI-powered search
 * - GitHub API integration with multi-account support
 * - File system operations with security restrictions
 * - Git workflow support
 * - Browser automation with Puppeteer
 * - Shell command execution
 * - URL content fetching
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

/**
 * Initialize the main MCP server
 */
const server = new Server({
  name: "claude-ts-mcps",
  version: "1.0.2",
}, {
  capabilities: {
    tools: {},
  },
});

/**
 * Environment variables configuration
 */
const config = {
  braveApiKey: process.env.BRAVE_API_KEY,
  perplexityApiKey: process.env.PERPLEXITY_API_KEY,
  githubPersonalToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
  githubWorkToken: process.env.GITHUB_TOKEN_WORK,
  githubPersonalToken2: process.env.GITHUB_TOKEN_PERSONAL,
  customUserAgent: process.env.CUSTOM_USER_AGENT || "Claude-TS-MCPs/1.0",
  ignoreRobotsTxt: process.env.IGNORE_ROBOTS_TXT === "true",
};

/**
 * Brave Web Search Tool
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = (request as any).params;

  switch (name) {
    case "brave_web_search": {
      if (!config.braveApiKey) {
        return {
          content: [
            {
              type: "text",
              text: "Error: BRAVE_API_KEY environment variable is required for web search functionality.",
            },
          ],
        };
      }

      const searchSchema = z.object({
        query: z.string().max(400),
        count: z.number().min(1).max(20).optional().default(10),
        offset: z.number().min(0).max(9).optional().default(0),
        search_lang: z.string().optional(),
        ui_lang: z.string().optional(),
        country: z.string().optional(),
        freshness: z.enum(["pd", "pw", "pm", "py"]).optional(),
        text_decorations: z.boolean().optional(),
        spellcheck: z.boolean().optional(),
      });

      try {
        const params = searchSchema.parse(args);
        
        const searchParams = new URLSearchParams({
          q: params.query,
          count: params.count.toString(),
          offset: params.offset.toString(),
        });

        if (params.search_lang) searchParams.append("search_lang", params.search_lang);
        if (params.ui_lang) searchParams.append("ui_lang", params.ui_lang);
        if (params.country) searchParams.append("country", params.country);
        if (params.freshness) searchParams.append("freshness", params.freshness);
        if (params.text_decorations !== undefined) searchParams.append("text_decorations", params.text_decorations.toString());
        if (params.spellcheck !== undefined) searchParams.append("spellcheck", params.spellcheck.toString());

        const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${searchParams}`, {
          headers: {
            "X-Subscription-Token": config.braveApiKey,
            "Accept": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Brave API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error performing web search: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }

    case "brave_local_search": {
      if (!config.braveApiKey) {
        return {
          content: [
            {
              type: "text",
              text: "Error: BRAVE_API_KEY environment variable is required for local search functionality.",
            },
          ],
        };
      }

      const localSearchSchema = z.object({
        query: z.string(),
        count: z.number().min(1).max(20).optional().default(10),
        country: z.string().optional(),
        search_lang: z.string().optional(),
        ui_lang: z.string().optional(),
        spellcheck: z.boolean().optional(),
      });

      try {
        const params = localSearchSchema.parse(args);
        
        const searchParams = new URLSearchParams({
          q: params.query,
          count: params.count.toString(),
        });

        if (params.country) searchParams.append("country", params.country);
        if (params.search_lang) searchParams.append("search_lang", params.search_lang);
        if (params.ui_lang) searchParams.append("ui_lang", params.ui_lang);
        if (params.spellcheck !== undefined) searchParams.append("spellcheck", params.spellcheck.toString());

        const response = await fetch(`https://api.search.brave.com/res/v1/local/search?${searchParams}`, {
          headers: {
            "X-Subscription-Token": config.braveApiKey,
            "Accept": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Brave API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error performing local search: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
  }
});

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "brave_web_search",
        description: "使用Brave Search从网络检索最新信息，适用于新闻、技术信息、产品详情等需要新鲜数据的场景",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "搜索查询字符串，最大400字符",
              maxLength: 400,
            },
            count: {
              type: "number",
              description: "返回结果数量，1-20之间，默认10",
              minimum: 1,
              maximum: 20,
              default: 10,
            },
            offset: {
              type: "number",
              description: "分页偏移量，最大9，默认0",
              minimum: 0,
              maximum: 9,
              default: 0,
            },
            search_lang: {
              type: "string",
              description: "搜索语言代码",
            },
            ui_lang: {
              type: "string",
              description: "用户界面语言代码",
            },
            country: {
              type: "string",
              description: "国家代码",
            },
            freshness: {
              type: "string",
              description: "结果新鲜度(pd,pw,pm,py)",
              enum: ["pd", "pw", "pm", "py"],
            },
            text_decorations: {
              type: "boolean",
              description: "是否包含文本装饰",
            },
            spellcheck: {
              type: "boolean",
              description: "是否启用拼写检查",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "brave_local_search",
        description: "查找本地企业、服务、景点和位置的实时信息，特别适用于基于位置的查询",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "本地搜索查询字符串",
            },
            count: {
              type: "number",
              description: "返回结果数量，1-20之间，默认10",
              minimum: 1,
              maximum: 20,
              default: 10,
            },
            country: {
              type: "string",
              description: "国家代码，用于地理定位",
            },
            search_lang: {
              type: "string",
              description: "搜索语言代码",
            },
            ui_lang: {
              type: "string",
              description: "用户界面语言代码",
            },
            spellcheck: {
              type: "boolean",
              description: "是否启用拼写检查",
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Claude TypeScript MCP Servers started successfully");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Server failed to start:", error);
    process.exit(1);
  });
}