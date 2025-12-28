
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UploadedImage } from "../types";

const META_PROMPT = `
【角色设定 (Role Definition)】 你是一位资深视觉艺术总监兼AI提示词工程师。你拥有敏锐的图像分析能力，能够从一组参考图片中精准提取摄影风格、布光逻辑、构图模式和氛围特征，并将其转化为结构化的 AI 绘画提示词（Prompt）。

【核心任务 (Core Task)】 用户的输入将是一组风格参考图片（通常是服装/商品摄影）。 你的任务是：
1. 深度解析 these images' visual language (lighting, perspective, background, texture).
2. Write a complete "Generation Prompt". This set of prompts must guide the AI to perfectly replicate the style of the reference image, while including strict "anti-artifact" instructions.

【分析框架 (Analysis Framework)】
- Lighting: Hard vs soft? Natural, studio, or neon?
- Composition: Subject positioning, camera angle.
- Background: Setting details.
- Mood: Minimalist, vintage, cyberpunk, etc.

【输出规范 (Output Format)】
### 1. Agent 系统设定 (System Prompt)
### 2. 正向提示词 (Positive Prompt)
### 3. 负向提示词 (Negative Prompt)
`;

export async function analyzeImages(images: UploadedImage[]): Promise<string> {
  // Use gemini-3-pro-preview for complex reasoning tasks like reverse-engineering visual style
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imageParts = images.map(img => ({
    inlineData: {
      data: img.dataUrl.split(',')[1],
      mimeType: img.mimeType
    }
  }));

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { 
      parts: [
        { text: META_PROMPT },
        ...imageParts,
        { text: "请分析以上图片并生成对应的生图Agent指令及Prompt模板。" }
      ] 
    },
    config: {
      temperature: 0.7,
      // Adding thinking budget for complex visual analysis tasks
      thinkingConfig: { thinkingBudget: 4000 }
    }
  });

  return response.text || "Failed to generate response.";
}

export async function generateEcomImage(productImage: UploadedImage, prompt: string, modelName: string): Promise<string> {
  // Create a fresh instance right before the call to ensure we use the latest API key as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const finalPrompt = `Professional e-commerce photography. Apply this style: ${prompt}. The central subject is the item in the attached image. Ensure the item maintains its core design, color, and features while being seamlessly integrated into the described environment and lighting.`;

  const config: any = {
    imageConfig: {
      aspectRatio: "3:4"
    }
  };

  // imageSize is only available for gemini-3-pro-image-preview
  if (modelName === 'gemini-3-pro-image-preview') {
    config.imageConfig.imageSize = "1K";
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: {
      parts: [
        {
          inlineData: {
            data: productImage.dataUrl.split(',')[1],
            mimeType: productImage.mimeType
          }
        },
        { text: finalPrompt }
      ]
    },
    config: config
  });

  // Iterate through parts to find the image part as per guidelines
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image data returned from model.");
}
