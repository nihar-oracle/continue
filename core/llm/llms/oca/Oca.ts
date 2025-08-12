import { ChatCompletionCreateParams } from "openai/resources/index";

import { streamSse } from "@continuedev/fetch";
import {
  ChatMessage,
  CompletionOptions,
  LLMOptions,
  Tool,
  type ModelInfo,
} from "../../../index.js";
import { renderChatMessage } from "../../../util/messageContent.js";
import { BaseLLM } from "../../index.js";
import {
  fromChatCompletionChunk,
  LlmApiRequestType,
  toChatBody,
} from "../../openaiTypeConverters.js";
import { OcaTokenManager } from "./util/ocaTokenManager.js";
import { createOcaHeaders, generateOpcRequestId } from "./util/utils.js";

interface ModelInfoMap {
  models: { [key: string]: ModelInfo };
}

const parsePrice = (price: any) => {
  if (price) {
    return parseFloat(price) * 1_000_000;
  }
  return undefined;
};
class Oca extends BaseLLM {
  private modelMap: ModelInfoMap;

  constructor(options: LLMOptions) {
    super({
      ...options,
      capabilities: {
        uploadImage: false,
        tools: true,
      },
    });
    this.uniqueId = options.uniqueId || "no-unique-id";
    this.apiVersion = options.apiVersion;
    this.apiBase = options.apiBase;
    this.modelMap = { models: {} };
  }

  static providerName = "oca";

  protected useOpenAIAdapterFor: (LlmApiRequestType | "*")[] = [
    "list",
    "streamChat",
  ];

  protected _convertModelName(model: string): string {
    return model;
  }

  private convertTool(tool: Tool): any {
    return {
      type: tool.type,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
        strict: tool.function.strict,
      },
    };
  }

  protected extraBodyProperties(): Record<string, any> {
    return {};
  }

  protected getMaxStopWords(): number {
    return 4;
  }

  protected _convertArgs(
    options: CompletionOptions,
    messages: ChatMessage[],
  ): ChatCompletionCreateParams {
    const finalOptions = toChatBody(messages, options);

    finalOptions.stop = options.stop?.slice(0, this.getMaxStopWords());
    return finalOptions;
  }

  protected async _getHeaders() {
    const token = (await OcaTokenManager.getToken()).access_token;
    if (!token) {
      throw new Error(
        "Oracle Code Assist Access Token not found or expired. Please log in again",
      );
    }
    const ocaHeaders = await createOcaHeaders(token, this.uniqueId);
    console.log(
      `Making request with customer opc-request-id: ${ocaHeaders["opc-request-id"]}`,
    );
    return ocaHeaders;
  }

  protected async _complete(
    prompt: string,
    signal: AbortSignal,
    options: CompletionOptions,
  ): Promise<string> {
    let completion = "";
    for await (const chunk of this._streamChat(
      [{ role: "user", content: prompt }],
      signal,
      options,
    )) {
      completion += chunk.content;
    }

    return completion;
  }

  protected _getEndpoint(
    endpoint: "chat/completions" | "models" | "model/info",
  ) {
    if (!this.apiBase) {
      throw new Error(
        "No API base URL provided. Please set the 'apiBase' option in config.json",
      );
    }
    // Remove trailing slashes from base and leading/trailing slashes from endpoint
    const base = this.apiBase.replace(/\/+$/, "");
    const ep = endpoint.replace(/^\/+|\/+$/g, "");

    // Build the path
    let urlStr = base;
    if (ep) urlStr += `/${ep}`;

    return new URL(urlStr);
  }

  protected async *_streamComplete(
    prompt: string,
    signal: AbortSignal,
    options: CompletionOptions,
  ): AsyncGenerator<string> {
    for await (const chunk of this._streamChat(
      [{ role: "user", content: prompt }],
      signal,
      options,
    )) {
      yield renderChatMessage(chunk);
    }
  }

  protected modifyChatBody(
    body: ChatCompletionCreateParams,
  ): ChatCompletionCreateParams {
    body.stop = body.stop?.slice(0, this.getMaxStopWords());
    return body;
  }

  protected async *_streamChat(
    messages: ChatMessage[],
    signal: AbortSignal,
    options: CompletionOptions,
  ): AsyncGenerator<ChatMessage> {
    const body = this._convertArgs(options, messages);
    const headers = await this._getHeaders();

    const response = await this.fetch(this._getEndpoint("chat/completions"), {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        ...body,
        ...this.extraBodyProperties(),
      }),
      signal,
    });

    // Handle non-streaming response
    if (body.stream === false) {
      if (response.status === 499) {
        return; // Aborted by user
      }
      const data = await response.json();
      yield data.choices[0].message;
      return;
    }

    for await (const value of streamSse(response)) {
      const chunk = fromChatCompletionChunk(value);
      if (chunk) {
        yield chunk;
      }
    }
  }

  async listModels(): Promise<string[]> {
    const headers = await this._getHeaders();
    const response = await this.fetch(this._getEndpoint("model/info"), {
      method: "GET",
      headers: headers,
    });

    const data = (await response.json()).data;
    // Initialize the map
    for (const model of data) {
      if (typeof model?.litellm_params?.model !== "string") {
        continue;
      }
      const modelId: string = model.litellm_params.model;
      const maxTokens = model.litellm_params?.max_tokens;
      if (!modelId) {
        continue;
      }

      const modelInfo = model.model_info;

      const ocaModelInfo: ModelInfo = {
        maxTokens: maxTokens || -1,
        contextWindow: modelInfo.context_window,
        supportsImages: modelInfo.supports_vision || false,
        supportsPromptCache: modelInfo.supports_caching || false,
        inputPrice: parsePrice(modelInfo.input_price) || 0,
        outputPrice: parsePrice(modelInfo.output_price) || 0,
        cacheWritesPrice: parsePrice(modelInfo.caching_price) || 0,
        cacheReadsPrice: parsePrice(modelInfo.cached_price) || 0,
        description: modelInfo.description,
        surveyContent: modelInfo.survey_content,
        surveyId: modelInfo.survey_id,
        temperature: modelInfo.temperature || 0,
        bannerContent: modelInfo.banner,
        modelName: modelId,
      };
      this.modelMap.models[modelId] = ocaModelInfo;
    }
    console.log("Oca models fetched", this.modelMap);
    return Object.keys(this.modelMap.models);
  }

  getModelInfo(model: string): ModelInfo | undefined {
    return this.modelMap.models[model];
  }
}

export default Oca;
