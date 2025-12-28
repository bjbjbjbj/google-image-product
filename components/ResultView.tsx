
import React, { useState, useRef } from 'react';
import { UploadedImage, GeneratedImage } from '../types';
import { generateEcomImage } from '../services/geminiService';

interface ResultViewProps {
  content: string;
  referenceImages: UploadedImage[];
}

// Global declaration for AI Studio key selection
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Removing 'readonly' to resolve the "identical modifiers" conflict with the pre-existing environment declaration
    aistudio: AIStudio;
  }
}

const ResultView: React.FC<ResultViewProps> = ({ content, referenceImages }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<UploadedImage | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'>('gemini-2.5-flash-image');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const extractSection = (header: string) => {
    const regex = new RegExp(`${header}\\s*([\\s\\S]*?)(?=###|$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  };

  const positivePrompt = extractSection('2. 正向提示词') || extractSection('生图指令模板') || extractSection('Positive Prompt');

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProductImage({
          id: 'product-main',
          dataUrl: event.target.result as string,
          mimeType: file.type
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!productImage || !positivePrompt) return;
    
    // Check key for Pro model
    if (selectedModel === 'gemini-3-pro-image-preview') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // Continue proceeding as selection is assumed successful per race condition guidelines
      }
    }

    if (generatedImages.length >= 5) {
      alert("Session limit reached. Restart for more variations.");
      return;
    }

    setIsGenerating(true);
    try {
      const imageUrl = await generateEcomImage(productImage, positivePrompt, selectedModel);
      setGeneratedImages(prev => [{ id: Date.now().toString(), url: imageUrl }, ...prev]);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        alert("Pro model error: Please re-select a valid paid API key.");
        await window.aistudio.openSelectKey();
      } else {
        alert("Generation failed. " + err.message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const sections = [
    { id: 'sys', title: 'Agent System Prompt', content: extractSection('1. Agent 系统设定') || extractSection('Agent 系统设定') },
    { id: 'pos', title: 'Positive Prompt', content: positivePrompt },
    { id: 'neg', title: 'Negative Prompt', content: extractSection('3. 负向提示词') || extractSection('Negative Prompt') },
  ];

  return (
    <div className="space-y-10 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
        <h2 className="text-xl font-bold">Generation Specs & Analysis</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Reference Image Gallery - Displayed above prompts */}
          <div className="glass rounded-2xl p-6 border-white/5 bg-white/5 mb-2">
            <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Style Reference Gallery
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {referenceImages.map((img) => (
                <div key={img.id} className="aspect-square rounded-xl overflow-hidden border border-white/10 glass bg-slate-900 shadow-inner">
                  <img src={img.dataUrl} alt="Style reference" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.id} className="glass rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                <h3 className="font-semibold text-slate-200">{section.title}</h3>
                <button 
                  onClick={() => handleCopy(section.content, section.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                    copied === section.id 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'
                  }`}
                >
                  {copied === section.id ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="p-6 overflow-x-auto">
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {section.content || "Parsing content..."}
                </pre>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="glass rounded-3xl p-6 border-indigo-500/20 bg-indigo-500/5">
            <h3 className="text-lg font-bold mb-4 text-indigo-300 flex items-center justify-between">
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                E-commerce Image Lab
              </span>
            </h3>

            {/* Model Selector */}
            <div className="mb-6">
              <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => setSelectedModel('gemini-2.5-flash-image')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${selectedModel === 'gemini-2.5-flash-image' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  Nano Banana (Flash)
                </button>
                <button 
                  onClick={() => setSelectedModel('gemini-3-pro-image-preview')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${selectedModel === 'gemini-3-pro-image-preview' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  Nano Banana Pro (HQ)
                </button>
              </div>
              {selectedModel === 'gemini-3-pro-image-preview' && (
                <p className="text-[10px] text-purple-400 mt-2 flex items-center px-1">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/></svg>
                  Requires paid project key. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline ml-1">Learn more about billing</a>
                </p>
              )}
            </div>
            
            {!productImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-500/30 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-500/10 transition-colors"
              >
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleProductUpload} />
                <svg className="w-10 h-10 text-indigo-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-slate-300 font-medium">Upload Product Image</p>
                <p className="text-slate-500 text-xs mt-1">PNG/JPG with clear subject</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative group rounded-2xl overflow-hidden border border-white/10 aspect-square max-w-[200px] mx-auto bg-slate-900">
                  <img src={productImage.dataUrl} className="w-full h-full object-contain" alt="Product" />
                  <button 
                    onClick={() => setProductImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Change
                  </button>
                </div>
                
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || generatedImages.length >= 5}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all ${
                    isGenerating || generatedImages.length >= 5
                    ? 'bg-slate-800 text-slate-500'
                    : selectedModel === 'gemini-3-pro-image-preview'
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>{selectedModel.includes('pro') ? 'Architecting HQ Image...' : 'Architecting Style...'}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>{generatedImages.length === 0 ? 'Generate E-commerce Image' : 'Generate Variation'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {generatedImages.map((img) => (
              <div key={img.id} className="glass rounded-2xl p-2 relative group animate-in zoom-in-95 duration-300">
                <img src={img.url} className="w-full rounded-xl" alt="Generated variation" />
                <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                  <a 
                    href={img.url} 
                    download={`ecom-variation-${img.id}.png`}
                    className="p-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl hover:bg-white/20"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 glass rounded-2xl border-indigo-500/10 opacity-60">
        <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Reference Log</h3>
        <div className="text-sm text-slate-400 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
          {content}
        </div>
      </div>
    </div>
  );
};

export default ResultView;
