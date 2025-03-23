# SearXNG MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to perform web searches using [SearXNG](https://github.com/searxng/searxng), a privacy-respecting metasearch engine.

## Features

- Perform web searches with customizable parameters
- Support for multiple search engines
- Privacy-focused search results
- Optional basic authentication for SearXNG instances
- Markdown-formatted search results
- Sensible default values for all parameters

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Access to a SearXNG instance (self-hosted or public)

### Install from npm

```bash
npm install -g searxngmcp
```

### Install from source

```bash
# Clone the repository
git clone https://github.com/tisDDM/searxng-mcp.git
cd searxng-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

The SearXNG MCP server requires the following environment variables:

- `SEARXNG_URL` (required): The URL of your SearXNG instance (e.g., `https://searx.example.com`)
- `SEARXNG_USERNAME` (optional): Username for basic authentication
- `SEARXNG_PASSWORD` (optional): Password for basic authentication

You can set these environment variables in a `.env` file in the root directory of the project:

```
SEARXNG_URL=https://searx.example.com
SEARXNG_USERNAME=your_username
SEARXNG_PASSWORD=your_password
```

## Usage

### Running the server

```bash
# If installed globally
searxngmcp

# If installed from source
node build/index.js
```

### Integrating with Claude Desktop

1. Open Claude Desktop
2. Go to Settings > MCP Servers
3. Add a new MCP server with the following configuration:
   ```json
   {
     "mcpServers": {
       "searxngmcp": {
         "command": "searxngmcp",
         "env": {
           "SEARXNG_URL": "https://searx.example.com",
           "SEARXNG_USERNAME": "your_username",
           "SEARXNG_PASSWORD": "your_password"
         },
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

### Integrating with Claude in VSCode

1. Open VSCode
2. Go to Settings > Extensions > Claude > MCP Settings
3. Add a new MCP server with the following configuration:
   ```json
   {
     "mcpServers": {
       "searxngmcp": {
         "command": "node",
         "args": ["/path/to/searxng-mcp/build/index.js"],
         "env": {
           "SEARXNG_URL": "https://searx.example.com",
           "SEARXNG_USERNAME": "your_username",
           "SEARXNG_PASSWORD": "your_password"
         },
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

## Usage with SmolaGents

SearXNG MCP can be easily integrated with [SmolaGents](https://github.com/smol-ai/smolagents), a lightweight framework for building AI agents. This allows you to create powerful research agents that can search the web and process the results:

```python
from smolagents import CodeAgent, LiteLLMModel, ToolCollection
from mcp import StdioServerParameters

# Configure the SearXNG MCP server
server_parameters = StdioServerParameters(
    command="node",
    args=["path/to/searxng-mcp/build/index.js"],
    env={
        "SEARXNG_URL": "https://your-searxng-instance.com",
        "SEARXNG_USERNAME": "your_username",  # Optional
        "SEARXNG_PASSWORD": "your_password"   # Optional
    }
)

# Create a tool collection from the MCP server
with ToolCollection.from_mcp(server_parameters) as tool_collection:
    # Initialize your LLM model
    model = LiteLLMModel(
        model_id="your-model-id",
        api_key="your-api-key",
        temperature=0.7
    )
    
    # Create an agent with the search tools
    search_agent = CodeAgent(
        name="search_agent",
        tools=tool_collection.tools,
        model=model
    )
    
    # Run the agent with a search prompt
    result = search_agent.run(
        "Perform a search about: 'climate change solutions' and summarize the top 5 results."
    )
    
    print(result)
```

## Available Tools

### searxngsearch

Perform web searches using SearXNG, a privacy-respecting metasearch engine. Returns relevant web content with customizable parameters.

#### Parameters

| Parameter   | Type             | Description                                                                      | Default     | Required |
|-------------|------------------|----------------------------------------------------------------------------------|-------------|---------|
| query       | string           | Search query                                                                     | -           | Yes      |
| language    | string           | Language code for search results (e.g., 'en', 'de', 'fr')                        | 'en'        | No       |
| time_range  | string           | Time range for search results. Options: 'day', 'week', 'month', 'year'           | null        | No       |
| categories  | array of strings | Categories to search in (e.g., 'general', 'images', 'news')                      | null        | No       |
| engines     | array of strings | Specific search engines to use                                                   | null        | No       |
| safesearch  | number           | Safe search level: 0 (off), 1 (moderate), 2 (strict)                             | 1           | No       |
| pageno      | number           | Page number for results. Must be minimum 1                                       | 1           | No       |
| max_results | number           | Maximum number of search results to return. Range: 1-50                          | 10          | No       |

#### Example

```javascript
// Example request
const result = await client.callTool('searxngsearch', {
  query: 'climate change solutions',
  language: 'en',
  time_range: 'year',
  categories: ['general', 'news'],
  safesearch: 1,
  max_results: 5
});
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/tisDDM/searxng-mcp.git
cd searxng-mcp

# Install dependencies
npm install
```

### Build

```bash
npm run build
```

### Watch mode (for development)

```bash
npm run watch
```

### Testing with MCP Inspector

```bash
npm run inspector
```

## License

MIT