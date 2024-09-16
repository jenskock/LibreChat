const { z } = require('zod');
const { StructuredTool } = require('langchain/tools');
const { logger } = require('~/config');
const axios = require('axios');

class Weaviate extends StructuredTool {
  // Helper function for initializing properties
  _initializeField(field, envVar, defaultValue) {
    return field || process.env[envVar] || defaultValue;
  }

  constructor(fields = {}) {
    super();
    this.name = 'weaviate';
    this.description = 'Use the Weaviate tool to retrieve search results relevant to your input';
    /* Used to initialize the Tool without necessary variables. */
    this.override = fields.override ?? false;

    // Define schema
    this.schema = z.object({
      query: z.string().describe('Search word or phrase to Weaviate'),
    });

    // Initialize properties using helper function
    this.serviceEndpoint = this._initializeField(
      fields.WEAVIATE_SEARCH_SERVICE_ENDPOINT,
      'WEAVIATE_SEARCH_SERVICE_ENDPOINT',
    );
    this.schemaName = this._initializeField(fields.WEAVIATE_SCHEMA_NAME, 'WEAVIATE_SCHEMA_NAME');
    /*
    this.apiKey = this._initializeField(fields.AZURE_AI_SEARCH_API_KEY, 'AZURE_AI_SEARCH_API_KEY');
    this.apiVersion = this._initializeField(
      fields.AZURE_AI_SEARCH_API_VERSION,
      'AZURE_AI_SEARCH_API_VERSION',
      AzureAISearch.DEFAULT_API_VERSION,
    );
    this.queryType = this._initializeField(
      fields.AZURE_AI_SEARCH_SEARCH_OPTION_QUERY_TYPE,
      'AZURE_AI_SEARCH_SEARCH_OPTION_QUERY_TYPE',
      AzureAISearch.DEFAULT_QUERY_TYPE,
    );
    this.top = this._initializeField(
      fields.AZURE_AI_SEARCH_SEARCH_OPTION_TOP,
      'AZURE_AI_SEARCH_SEARCH_OPTION_TOP',
      AzureAISearch.DEFAULT_TOP,
    );
    this.select = this._initializeField(
      fields.AZURE_AI_SEARCH_SEARCH_OPTION_SELECT,
      'AZURE_AI_SEARCH_SEARCH_OPTION_SELECT',
    );
    */

    // Check for required fields
    if (!this.override && (!this.serviceEndpoint || !this.schemaName)) {
      throw new Error(
        'Missing WEAVIATE_SEARCH_SERVICE_ENDPOINT, WEAVIATE_SCHEMA_NAME environment variable.',
      );
    }

    if (this.override) {
      return;
    }
  }

  // Improved error handling and logging
  async _call(data) {
    const { query } = data;
    try {
      let data = JSON.stringify({
        query: `{ Get { ${this.schemaName}( nearText: { concepts: ["${encodeURIComponent(
          query,
        )}"], certainty: 0.8 } ) { quote author _additional { distance } } } }`,
      });

      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${this.serviceEndpoint}/graphql`,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data: data,
      };

      const response = await axios.request(config);
      logger.debug('Weaviate Search request succeeded', response.data);
      return JSON.stringify(response.data);

      /* const searchOption = {
        queryType: this.queryType,
        top: this.top,
      };
      if (this.select) {
        searchOption.select = this.select.split(',');
      }
      const searchResults = await this.client.search(query, searchOption);
      const resultDocuments = [];
      for await (const result of searchResults.results) {
        resultDocuments.push(result.document);
      }
      return JSON.stringify(resultDocuments); */
    } catch (error) {
      logger.error('Weaviate Search request failed', error);
      return 'There was an error with Weaviate. Error: ' + error;
    }
  }
}

module.exports = Weaviate;
